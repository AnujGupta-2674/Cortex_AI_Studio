import { validationResult } from "express-validator";

/**
 * Middleware that inspects validation results from express-validator.
 * Returns a 400 Bad Request with a clear error payload if validation fails.
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorList = errors.array();
        return res.status(400).json({
            success: false,
            error: errorList[0].msg,
            errors: errorList.map((err) => ({
                field: err.path || err.param,
                message: err.msg,
                value: err.value,
            })),
        });
    }
    next();
};

export default validate;
