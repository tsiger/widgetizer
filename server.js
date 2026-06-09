// OSS web-mode entry point.
//
// Load .env FIRST — before any module that reads process.env (config.js does at
// import time).
import "@widgetizer/builder-server/env";
import { buildOssApp } from "./app/server-common.js";

const app = await buildOssApp();

// PORT=0 → OS assigns an ephemeral port at bind time. Otherwise, use the requested port.
const requestedPort = parseInt(process.env.PORT || "3001", 10);

const server = app.listen(requestedPort, "127.0.0.1", () => {
  const { port } = server.address();

  // Publish the actual bound port so downstream code (preview/render
  // controllers) that builds self-referencing URLs sees the real port.
  process.env.PORT = String(port);
  if (!process.env.SERVER_URL) {
    process.env.SERVER_URL = `http://127.0.0.1:${port}`;
  }

  console.log(`Server is running on ${process.env.SERVER_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

server.on("error", (err) => {
  console.error(`Server failed to start on port ${requestedPort}: ${err.message}`);
  process.exit(1);
});
