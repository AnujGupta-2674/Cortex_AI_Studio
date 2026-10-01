import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import {
    createConversation,
    getConversations,
    getConversationById,
    updateConversation,
    deleteConversation,
} from "../controllers/conversation.controller.js";
import {
    sendMessage,
    getMessages,
    deleteMessage,
    clearMessages,
} from "../controllers/message.controller.js";
import {
    createConversationValidator,
    updateConversationValidator,
    conversationIdValidator,
    conversationParamValidator,
    listConversationsValidator,
    createMessageValidator,
    listMessagesValidator,
    deleteMessageValidator,
} from "../validators/chat.validator.js";


const router = Router();

// Protect all chat endpoints with auth middleware
router.use(authMiddleware);

/* -------------------------------------------------------------------------- */
/*                            Conversation Routes                             */
/* -------------------------------------------------------------------------- */

// Create a new conversation
router.post("/conversations", createConversationValidator, createConversation);

// Get list of all conversations for authenticated user (paginated)
router.get("/conversations", listConversationsValidator, getConversations);

// Get single conversation details
router.get("/conversations/:id", conversationIdValidator, getConversationById);

// Update conversation title / rename
router.patch("/conversations/:id", updateConversationValidator, updateConversation);
router.put("/conversations/:id", updateConversationValidator, updateConversation);

// Delete conversation (and cascade deletes all its messages)
router.delete("/conversations/:id", conversationIdValidator, deleteConversation);

/* -------------------------------------------------------------------------- */
/*                               Message Routes                               */
/* -------------------------------------------------------------------------- */

// Send / append a message to a conversation
router.post(
    "/conversations/:conversationId/messages",
    createMessageValidator,
    sendMessage
);

// Get all messages for a specific conversation (paginated & chronologically sorted)
router.get(
    "/conversations/:conversationId/messages",
    listMessagesValidator,
    getMessages
);

// Clear all messages in a conversation
router.delete(
    "/conversations/:conversationId/messages",
    conversationParamValidator,
    clearMessages
);


// Delete a single message by ID
router.delete("/messages/:messageId", deleteMessageValidator, deleteMessage);

export default router;
