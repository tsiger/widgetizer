import rateLimit from "express-rate-limit";

// Apply a general rate limiter to all API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Create a more lenient rate limiter for the page editor's save endpoint
export const editorApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Allow more frequent saves
  standardHeaders: true,
  legacyHeaders: false,
  message: "Save requests are being sent too frequently. Please slow down.",
});
