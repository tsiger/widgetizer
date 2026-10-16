// Electron entry point — forked by electron/main.js via utilityProcess.fork().
//
// Mirrors the web entry (server.js) but reports the bound port back to the
// Electron main process over the utilityProcess IPC channel.
import "@widgetizer/builder-server/env";
import { startOssServer } from "../app/server-common.js";

if (process.env.NODE_ENV === "production" && !process.env.WIDGETIZER_EDITOR_SECRET) {
  console.error("Refusing to start: the desktop app must pass an editor credential.");
  process.exit(1);
}

// Electron sets PORT=0 to avoid collisions; report the bound port to the parent
// so it can build the renderer URL without guessing.
const { shutdown, assistantAccess, enableAssistant } = await startOssServer({
  defaultPort: 0,
  onReady: (port) => {
    if (process.parentPort) {
      process.parentPort.postMessage({ type: "server-ready", port });
    }
  },
});

const rpcMethods = { assistantAccess, enableAssistant };

process.parentPort?.on("message", ({ data }) => {
  if (data?.type === "shutdown") {
    shutdown().finally(() => process.exit(0));
    return;
  }
  if (data?.type === "rpc" && typeof data.id === "string" && Object.hasOwn(rpcMethods, data.method)) {
    Promise.resolve()
      .then(() => rpcMethods[data.method]())
      .then(
        (value) => process.parentPort.postMessage({ type: "rpc-result", id: data.id, ok: true, value }),
        (error) => process.parentPort.postMessage({ type: "rpc-result", id: data.id, ok: false, error: error.message }),
      );
  }
});
