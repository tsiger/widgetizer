import { validationResult } from "express-validator";

/**
 * Express middleware that checks express-validator results.
 * Returns 400 with the errors array if validation failed.
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
