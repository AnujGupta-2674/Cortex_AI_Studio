import { MemorySaver } from "@langchain/langgraph";
import { getMessages } from "../utils/getMessages.js";

/**
 * LangGraph in-memory checkpointer for checkpointing graph state across turns.
 */
export const memory = new MemorySaver();

/**
 * Formats raw database messages from the Chat Service into standard LLM role/content pairs.
 * Maps 'assistant' -> 'assistant' and 'user' -> 'human'.
 *
 * @param {Array} messages - Array of message documents from Chat Service
 * @param {number} [maxHistory=20] - Maximum recent messages to retain in context
 * @returns {Array<{ role: string, content: string }>} Formatted messages ready for LLM invocation
 */
export const formatMessageHistory = (messages = [], maxHistory = 20) => {
    if (!Array.isArray(messages)) return [];

    const recent = messages.slice(-maxHistory);

    return recent.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "human",
        content: msg.content || "",
    }));
};

/**
 * Fetches previous messages for a conversation via Chat Service API and formats them for LLM memory.
 *
 * @param {string} conversationId - The conversation ID
 * @param {Object} [headers={}] - Forwarded request headers
 * @param {number} [maxHistory=20] - Maximum recent messages to retrieve
 * @returns {Promise<Array<{ role: string, content: string }>>}
 */
export const getConversationMemory = async (conversationId, headers = {}, maxHistory = 20) => {
    if (!conversationId) return [];

    const rawMessages = await getMessages(conversationId, headers, { limit: maxHistory });
    return formatMessageHistory(rawMessages, maxHistory);
};

export default {
    memory,
    formatMessageHistory,
    getConversationMemory,
};
