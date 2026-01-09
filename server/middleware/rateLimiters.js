import rateLimit from "express-rate-limit";

// Apply a general rate limiter to all API routes
// Note: This is a local development app, so the limit is generous.
// The rate limiter is mainly to protect against runaway bugs, not malicious traffic.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per 15 minutes (generous for local dev)
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
