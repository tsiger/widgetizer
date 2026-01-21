/**
 * Electron preload script
 * Runs in a sandboxed context with access to a limited set of APIs.
 * This is the bridge between the renderer process and Node.js.
 */

// Currently no APIs are exposed to the renderer.
// The app communicates with the backend via HTTP, not IPC.

console.log("Widgetizer preload script loaded");
