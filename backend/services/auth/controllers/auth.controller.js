import crypto from "crypto";
import { auth } from "../config/firebase.js";
import User from "../models/user.model.js";

export const login = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Firebase ID token is required" });
    }

    // Verify token with Firebase Admin
    const decoded = await auth.verifyIdToken(token);

    // Find existing user or create a new one in MongoDB
    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: decoded.uid,
        name: decoded.name || decoded.email?.split("@")[0] || "User",
        email: decoded.email,
        avatar: decoded.picture || "",
      });
    }
      
    const sessionId = crypto.randomUUID();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    res.cookie("session", sessionId, {
      maxAge: SEVEN_DAYS_MS,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
      
    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      user,
    });
      
  } catch (error) {
    console.error("Auth Controller Error:", error);

    // Handle expired or invalid Firebase token specifically
    if (error.code?.startsWith("auth/")) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("session", {
      httpOnly: true,
      sameSite: "strict",
      secure: false
    });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ error: "Failed to log out" });
  }
};