// This middleware handles errors globally, preventing the server from crashing.

 
const errorHandler = (err, req, res, _next) => {
  // Multer reports per-file size breaches mid-stream, before the whole file is
  // buffered. Map those uploads to 413.
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large", code: "LIMIT_FILE_SIZE" });
  }

  // Errors carrying a numeric statusCode (WidgetizerError from @widgetizer/core,
  // thrown by adapters/handlers) map directly to that status. Otherwise fall
  // back to any status already set on the response, else 500.
  const statusCode = Number.isInteger(err?.statusCode)
    ? err.statusCode
    : res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : 500;

  res.status(statusCode);

  res.json({
    message: err.message,
    // Stable machine-readable code when the error provides one (e.g. PROJECT_MISMATCH).
    ...(err?.code ? { code: err.code } : {}),
    // Only show the stack trace in development mode
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
