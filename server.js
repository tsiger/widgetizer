// OSS web-mode entry point.
//
// Load .env FIRST — before any module that reads process.env (config.js does at
// import time).
import "@widgetizer/builder-server/env";
import { startOssServer } from "./app/server-common.js";

// Web mode defaults to port 3001; PORT=0 still yields an ephemeral port.
await startOssServer({ defaultPort: 3001 });
