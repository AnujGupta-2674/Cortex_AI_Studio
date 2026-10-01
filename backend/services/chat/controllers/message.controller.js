import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

/**
 * Send / Append a message to a conversation
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
 * Get all messages for a specific conversation (chronologically ordered)
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

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversationId })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Message.countDocuments({ conversationId }),
        ]);

        return res.status(200).json({
            success: true,
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
 * Delete a single message by ID
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
 * Clear all messages in a conversation without deleting conversation itself
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
