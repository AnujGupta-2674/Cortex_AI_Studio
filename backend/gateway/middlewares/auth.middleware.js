import redis from "../../shared/redis/redis.js";

const authMiddleware = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session;
    
        if (!sessionId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    
        const session = await redis.get(`session-${sessionId}`);
    
        if (!session) {
            return res.status(401).json({ message: "Unauthorized or Session Expired" });
        }
    
        req.user = JSON.parse(session);
        next();

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export default authMiddleware;
