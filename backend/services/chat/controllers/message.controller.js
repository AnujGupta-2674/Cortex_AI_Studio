import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import redis from "../../../shared/redis/redis.js";

/**
 * Appends a message to a conversation, updates timestamp, and auto-titles if new.
 * @param {import('express').Request} req - Express request with conversationId param and message body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with created message.
 */
export const sendMessage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;
        const { content, role = "user" } = req.body;

        // Verify conversation existence and ownership
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found",
            });
        }

        if (conversation.userId !== String(userId)) {
            return res.status(403).json({
                success: false,
                error: "Access denied to this conversation",
            });
        }

        // Create new message
        const message = await Message.create({
            conversationId,
            role,
            content: content.trim(),
        });

        // Automatically update title if still default "New Chat" and this is user's first prompt
        if (conversation.title === "New Chat" && role === "user") {
            const trimmedPrompt = content.trim();
            const autoTitle = trimmedPrompt.length > 35 
                ? `${trimmedPrompt.slice(0, 32)}...` 
                : trimmedPrompt;
            conversation.title = autoTitle;
        }

        // Touch updatedAt so active conversation surfaces to the top of list
        conversation.updatedAt = new Date();
        await conversation.save();

        // Update Redis cache asynchronously so subsequent reads hit cache immediately
        const cacheKey = `conversation:${conversationId}:messages`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const list = JSON.parse(cached);
                const msgObj = message.toObject ? message.toObject() : message;
                const msgId = msgObj._id ? String(msgObj._id) : null;
                if (!msgId || !list.some((m) => String(m._id) === msgId)) {
                    list.push(msgObj);
                    await redis.set(cacheKey, JSON.stringify(list), "EX", 86400);
                }
            }
        } catch (cacheErr) {
            console.warn("[Redis Cache Error in sendMessage]", cacheErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Message created successfully",
            data: message,
        });

    } catch (error) {
        console.error("Error creating message:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to send message",
            details: error.message,
        });
    }
};

/**
 * Retrieves chronologically sorted messages for a conversation with pagination.
 * @param {import('express').Request} req - Express request with conversationId param and pagination queries.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with messages and pagination metadata.
 */
export const getMessages = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;

        // Verify conversation existence and ownership
        const conversation = await Conversation.findById(conversationId).lean();

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found",
            });
        }

        if (conversation.userId !== String(userId)) {
            return res.status(403).json({
                success: false,
                error: "Access denied to this conversation",
            });
        }

        const cacheKey = `conversation:${conversationId}:messages`;

        // 1. Check Redis cache first for standard first-page requests (CACHE HIT)
        if (page === 1) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    const cachedMessages = JSON.parse(cached);
                    if (Array.isArray(cachedMessages)) {
                        return res.status(200).json({
                            success: true,
                            fromCache: true,
                            messages: cachedMessages.slice(0, limit),
                            pagination: {
                                total: cachedMessages.length,
                                page: 1,
                                limit,
                                totalPages: Math.ceil(cachedMessages.length / limit) || 1,
                            },
                        });
                    }
                }
            } catch (cacheErr) {
                console.warn("[Redis Cache Read Error in getMessages]", cacheErr.message);
            }
        }

        // 2. Cache Miss: Query MongoDB
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversationId })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Message.countDocuments({ conversationId }),
        ]);

        // Populate Redis cache for next time
        if (page === 1 && messages.length > 0) {
            try {
                await redis.set(cacheKey, JSON.stringify(messages), "EX", 86400);
            } catch (cacheErr) {
                console.warn("[Redis Cache Set Error in getMessages]", cacheErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            fromCache: false,
            messages,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });

    } catch (error) {
        console.error("Error fetching messages:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch messages",
            details: error.message,
        });
    }
};

/**
 * Deletes a single message by ID after verifying conversation ownership.
 * @param {import('express').Request} req - Express request with messageId param.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response confirming message deletion.
 */
export const deleteMessage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: "Message not found",
            });
        }

        // Verify ownership through conversation
        const conversation = await Conversation.findById(message.conversationId).lean();
        if (!conversation || conversation.userId !== String(userId)) {
            return res.status(403).json({
                success: false,
                error: "Access denied to delete this message",
            });
        }

        await Message.findByIdAndDelete(messageId);

        // Invalidate Redis cache so stale messages are not served
        try {
            await redis.del(`conversation:${message.conversationId}:messages`);
        } catch (cacheErr) {
            console.warn("[Redis Cache Error in deleteMessage]", cacheErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Message deleted successfully",
        });

    } catch (error) {
        console.error("Error deleting message:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to delete message",
            details: error.message,
        });
    }
};

/**
 * Clears all messages in a conversation without removing the conversation record.
 * @param {import('express').Request} req - Express request with conversationId param.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response confirming history clearance.
 */
export const clearMessages = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { conversationId } = req.params;

        // Verify conversation existence and ownership
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: "Conversation not found",
            });
        }

        if (conversation.userId !== String(userId)) {
            return res.status(403).json({
                success: false,
                error: "Access denied to this conversation",
            });
        }

        await Message.deleteMany({ conversationId });

        // Invalidate Redis cache
        try {
            await redis.del(`conversation:${conversationId}:messages`);
        } catch (cacheErr) {
            console.warn("[Redis Cache Error in clearMessages]", cacheErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "All messages in conversation deleted successfully",
        });
        
    } catch (error) {
        console.error("Error clearing messages:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to clear messages",
            details: error.message,
        });
    }
};
