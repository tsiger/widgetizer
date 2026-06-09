// Electron entry point — forked by electron/main.js via utilityProcess.fork().
//
// Mirrors the web entry (server.js) but reports the bound port back to the
// Electron main process over the utilityProcess IPC channel.
import "@widgetizer/builder-server/env";
import { buildOssApp } from "../app/server-common.js";

const app = await buildOssApp();

// PORT=0 → OS assigns an ephemeral port. Electron sets PORT=0 to avoid collisions.
const requestedPort = parseInt(process.env.PORT || "0", 10);

const server = app.listen(requestedPort, "127.0.0.1", () => {
  const { port } = server.address();

  process.env.PORT = String(port);
  if (!process.env.SERVER_URL) {
    process.env.SERVER_URL = `http://127.0.0.1:${port}`;
  }

  console.log(`Server is running on ${process.env.SERVER_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Report the actual bound port back to the parent so it can build the
  // renderer URL without guessing.
  if (process.parentPort) {
    process.parentPort.postMessage({ type: "server-ready", port });
  }
});

server.on("error", (err) => {
  console.error(`Server failed to start on port ${requestedPort}: ${err.message}`);
  process.exit(1);
});
