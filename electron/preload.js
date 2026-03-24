/**
 * Electron preload script
 * Runs in a sandboxed context with access to a limited set of APIs.
 * This is the bridge between the renderer process and Node.js.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronUpdater", {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (_event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on("update-download-progress", (_event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", () => callback());
  },
  downloadUpdate: () => ipcRenderer.send("download-update"),
  installUpdate: () => ipcRenderer.send("install-update"),
});
