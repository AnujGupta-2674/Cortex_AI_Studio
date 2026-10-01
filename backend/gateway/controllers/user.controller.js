/**
 * Fetches the currently authenticated user from the gateway session.
 * @param {import('express').Request} req - Express request object containing user session.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON response with user data or error message.
 */
const getCurrentUser = async (req, res) => {
    try {
        return res.status(200).json({
            message: "User fetched successfully",
            user: req.user,
        });
        
    } catch (error) {
        console.error("Get Current User Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export default getCurrentUser;
    