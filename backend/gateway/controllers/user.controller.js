import redis from "../../shared/redis/redis.js";

/**
 * Fetches the currently authenticated user from the gateway session
 * and injects the live in-memory credit balance from Redis.
 * @param {import('express').Request} req - Express request object containing user session.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with user data and credit balance.
 */
const getCurrentUser = async (req, res) => {
    try {
        let credits = 50;
        if (req.user?.userId) {
            const cachedCredits = await redis.get(`user:${req.user.userId}:credits`);
            if (cachedCredits !== null) {
                credits = Number(cachedCredits);
            }
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: {
                ...req.user,
                credits,
            },
        });
        
    } catch (error) {
        console.error("Get Current User Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default getCurrentUser;

    