import { body, param, query } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

/**
 * Validation rules for creating a new conversation
 */
export const createConversationValidator = [
    body("title")
        .optional()
        .trim()
        .isString()
        .withMessage("Title must be a valid string")
        .isLength({ min: 1, max: 100 })
        .withMessage("Title must be between 1 and 100 characters"),
    validate,
];

/**
 * Validation rules for updating an existing conversation's title
 */
export const updateConversationValidator = [
    param("id")
        .trim()
        .isMongoId()
        .withMessage("Invalid conversation ID format"),
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isString()
        .withMessage("Title must be a valid string")
        .isLength({ min: 1, max: 100 })
        .withMessage("Title must be between 1 and 100 characters"),
    validate,
];

/**
 * Validation rules for validating a conversation ID param (:id)
 */
export const conversationIdValidator = [
    param("id")
        .trim()
        .isMongoId()
        .withMessage("Invalid conversation ID format"),
    validate,
];

/**
 * Validation rules for validating a conversationId param (:conversationId)
 */
export const conversationParamValidator = [
    param("conversationId")
        .trim()
        .isMongoId()
        .withMessage("Invalid conversation ID format"),
    validate,
];


/**
 * Validation rules for pagination queries on conversation listing
 */
export const listConversationsValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    query("search")
        .optional()
        .trim()
        .isString()
        .withMessage("Search term must be a string")
        .isLength({ max: 100 })
        .withMessage("Search term cannot exceed 100 characters"),
    validate,
];

/**
 * Validation rules for sending/creating a new message
 */
export const createMessageValidator = [
    param("conversationId")
        .trim()
        .isMongoId()
        .withMessage("Invalid conversation ID format"),
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Message content is required")
        .isString()
        .withMessage("Message content must be a valid string")
        .isLength({ min: 1, max: 50000 })
        .withMessage("Message content must not exceed 50,000 characters"),
    body("role")
        .optional()
        .trim()
        .isIn(["user", "assistant"])
        .withMessage("Role must be either 'user' or 'assistant'"),
    validate,
];

/**
 * Validation rules for retrieving messages for a conversation
 */
export const listMessagesValidator = [
    param("conversationId")
        .trim()
        .isMongoId()
        .withMessage("Invalid conversation ID format"),
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),
    validate,
];

/**
 * Validation rules for deleting a specific message
 */
export const deleteMessageValidator = [
    param("messageId")
        .trim()
        .isMongoId()
        .withMessage("Invalid message ID format"),
    validate,
];
