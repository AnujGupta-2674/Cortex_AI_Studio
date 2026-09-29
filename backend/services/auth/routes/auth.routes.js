import { Router } from "express";
import { body, validationResult } from "express-validator";
import { login, logout } from "../controllers/auth.controller.js";

const router = Router();

// Validation middleware for login
const validateLogin = [
  body("token")
    .trim()
    .notEmpty()
    .withMessage("Firebase ID token is required")
    .isString()
    .withMessage("Token must be a valid string"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        errors: errors.array(),
      });
    }
    next();
  },
];

// Routes
router.post("/login", validateLogin, login);
router.post("/logout", logout);

export default router;
