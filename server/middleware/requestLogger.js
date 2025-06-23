import fs from "fs/promises";
import path from "path";

// This middleware logs incoming API requests to a file.

const logFilePath = path.join(process.cwd(), "logs", "api-requests.log");

const requestLogger = async (req, res, next) => {
  const logMessage = `${new Date().toISOString()} - ${req.method} ${req.originalUrl}\n`;

  try {
    // Ensure the logs directory exists
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    // Append the log message to the file
    await fs.appendFile(logFilePath, logMessage);
  } catch (error) {
    // We don't want to stop the request if logging fails,
    // but we should log the error to the console.
    console.error("Failed to log request:", error);
  }

  next();
};

export default requestLogger;
