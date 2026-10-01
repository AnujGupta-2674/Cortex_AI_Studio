import redis from "../../../shared/redis/redis.js";

/**
 * Authentication middleware for Chat Service.
 * Supports:
 * 1. Gateway header forwarding (x-user-id / x-user)
 * 2. Direct session cookie lookup via Redis
 */
export const authMiddleware = async (req, res, next) => {
    try {
        // 1. Check if user is already identified by upstream Gateway via headers
        const headerUserId = req.headers["x-user-id"];
        if (headerUserId) {
            let userData = { userId: headerUserId };
            if (req.headers["x-user"]) {
                try {
                    userData = { ...JSON.parse(req.headers["x-user"]), userId: headerUserId };
                } catch {
                    // Fall back to userId only
                }
            }
            req.user = userData;
            return next();
        }

        // 2. Direct session cookie check from Redis (for direct service calls or transparent cookie proxy)
        const sessionId = req.cookies?.session;
        if (sessionId) {
            const session = await redis.get(`session-${sessionId}`);
            if (session) {
                req.user = JSON.parse(session);
                return next();
            }
        }

        return res.status(401).json({
            success: false,
            error: "Unauthorized: Invalid or missing authentication session",
        });
        
    } catch (error) {
        console.error("Chat Auth Middleware Error:", error);
        return res.status(500).json({
            success: false,
            error: "Authentication service error",
        });
    }
};

export default authMiddleware;
