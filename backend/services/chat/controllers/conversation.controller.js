import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

/**
 * Create a new conversation for the authenticated user
 */
export const createConversation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title } = req.body;

        const conversation = await Conversation.create({
            title: title?.trim() || "New Chat",
            userId: String(userId),
        });

        return res.status(201).json({
            success: true,
            message: "Conversation created successfully",
            conversation,
        });
        
    } catch (error) {
        console.error("Error creating conversation:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to create conversation",
            details: error.message,
        });
    }
};

/**
 * Get all conversations for the authenticated user with pagination & search
 */
export const getConversations = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const search = req.query.search?.trim();

        const query = { userId: String(userId) };

        if (search) {
            query.title = { $regex: search, $options: "i" };
        }

        const skip = (page - 1) * limit;

        const [conversations, total] = await Promise.all([
            Conversation.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Conversation.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            conversations,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });

    } catch (error) {
        console.error("Error fetching conversations:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch conversations",
            details: error.message,
        });
    }
};

/**
 * Get a single conversation by ID (with ownership check)
 */
export const getConversationById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        const conversation = await Conversation.findById(id).lean();

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

        return res.status(200).json({
            success: true,
            conversation,
        });

    } catch (error) {
        console.error("Error fetching conversation:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch conversation",
            details: error.message,
        });
    }
};

/**
 * Update conversation title
 */
export const updateConversation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { title } = req.body;

        const conversation = await Conversation.findById(id);

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

        conversation.title = title.trim();
        await conversation.save();

        return res.status(200).json({
            success: true,
            message: "Conversation updated successfully",
            conversation,
        });
        
    } catch (error) {
        console.error("Error updating conversation:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to update conversation",
            details: error.message,
        });
    }
};

/**
 * Delete a conversation and cascade delete all its messages
 */
export const deleteConversation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        const conversation = await Conversation.findById(id);

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

        // Cascade delete all associated messages
        await Message.deleteMany({ conversationId: id });
        await Conversation.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Conversation and associated messages deleted successfully",
        });
        
    } catch (error) {
        console.error("Error deleting conversation:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to delete conversation",
            details: error.message,
        });
    }
};
