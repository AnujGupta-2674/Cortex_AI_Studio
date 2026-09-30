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
    