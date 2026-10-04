import axios from "axios";
import redis from "../../../shared/redis/redis.js";

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://localhost:8002";
const CACHE_TTL_SECONDS = 86400; // 24 hours

/**
 * Fetches messages for a specific conversation using a Redis Cache-First strategy.
 * 
 * 1. Checks Redis cache `conversation:${conversationId}:messages` (CACHE HIT -> <1ms)
 * 2. On CACHE MISS, calls the Chat Service API over HTTP
 * 3. Populates Redis cache with the response for subsequent lightning-fast requests
 * 
 * @param {string} conversationId - MongoDB ObjectId of the conversation
 * @param {Object} [headers={}] - Forwarded request headers (x-user-id, cookie, authorization)
 * @param {Object} [options={}] - Query options (limit, page)
 * @returns {Promise<Array>} List of message objects [{ _id, conversationId, role, content, createdAt, ... }]
 */
export const getMessages = async (conversationId, headers = {}, options = {}) => {
    if (!conversationId) {
        return [];
    }

    const cacheKey = `conversation:${conversationId}:messages`;
    const { limit = 50, page = 1 } = options;

    // 1. Check Redis Cache first for standard page 1 requests
    if (page === 1) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    console.log(`[Redis CACHE HIT] Retrieved ${parsed.length} messages for conversation ${conversationId}`);
                    return parsed.slice(-limit);
                }
            }
        } catch (cacheErr) {
            console.warn(`[Redis Cache Read Error] ${cacheErr.message}`);
        }
    }

    // 2. Cache Miss: Fetch from Chat Service API
    console.log(`[Redis CACHE MISS] Fetching messages from Chat Service API for conversation ${conversationId}`);
    try {
        const response = await axios.get(
            `${CHAT_SERVICE_URL}/conversations/${conversationId}/messages`,
            {
                headers,
                params: { limit, page },
                timeout: 5000,
            }
        );

        if (response.data?.success && Array.isArray(response.data?.messages)) {
            const messages = response.data.messages;

            // 3. Populate Redis Cache for subsequent requests
            if (page === 1 && messages.length > 0) {
                try {
                    await redis.set(cacheKey, JSON.stringify(messages), "EX", CACHE_TTL_SECONDS);
                    console.log(`[Redis Cache SET] Cached ${messages.length} messages for conversation ${conversationId}`);
                } catch (setErr) {
                    console.warn(`[Redis Cache Set Error] ${setErr.message}`);
                }
            }

            return messages;
        }

        return [];
    } catch (error) {
        console.warn(
            `[getMessages] Failed to fetch messages for conversation ${conversationId}:`,
            error.response?.data?.error || error.message
        );
        return [];
    }
};

/**
 * Appends a message to the Redis cache for a conversation.
 * Ensures the cache stays up-to-date without needing to re-fetch from the database.
 * 
 * @param {string} conversationId - The conversation ID
 * @param {Object} message - The message document to append
 * @param {number} [ttl=86400] - Expiration in seconds
 */
export const appendMessageToCache = async (conversationId, message, ttl = CACHE_TTL_SECONDS) => {
    if (!conversationId || !message) return;
    const cacheKey = `conversation:${conversationId}:messages`;
    try {
        const cached = await redis.get(cacheKey);
        let list = [];
        if (cached) {
            try {
                list = JSON.parse(cached);
            } catch {
                list = [];
            }
        }
        const msgId = message._id ? String(message._id) : null;
        if (msgId && list.some((m) => String(m._id) === msgId)) {
            return;
        }
        list.push(message);
        await redis.set(cacheKey, JSON.stringify(list), "EX", ttl);
        console.log(`[Redis Cache APPEND] Appended message to cache for conversation ${conversationId}`);
    } catch (err) {
        console.warn(`[Redis append error] ${err.message}`);
    }
};

/**
 * Invalidates the Redis cache for a conversation.
 * 
 * @param {string} conversationId - The conversation ID
 */
export const invalidateMessageCache = async (conversationId) => {
    if (!conversationId) return;
    try {
        await redis.del(`conversation:${conversationId}:messages`);
        console.log(`[Redis Cache INVALIDATE] Cleared cache for conversation ${conversationId}`);
    } catch (err) {
        console.warn(`[Redis invalidate error] ${err.message}`);
    }
};

export const getConversationMessages = getMessages;
export default getMessages;
