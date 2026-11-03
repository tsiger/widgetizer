/**
 * A `res.sendFile` / `res.download` callback with one set of rules for how a
 * file send can end.
 *
 * - The client left (the request aborted, or writing to its closed connection
 *   failed): routine — a page closed or a download cancelled. Nothing to send
 *   and nothing to log; Express treats these the same way when no callback is
 *   given.
 * - Any other failure after the headers went out: no error status can follow,
 *   so the real error is logged and the connection closed, which the client
 *   sees as a cut-off transfer instead of waiting on it.
 * - A failure before the headers: the route answers it, through
 *   `onFailedBeforeHeaders(err)` (a 404 for a missing file, say).
 *
 * @param {import('express').Response} res
 * @param {(err: Error) => void} onFailedBeforeHeaders
 * @returns {(err?: Error) => void}
 */
export function sendFileDone(res, onFailedBeforeHeaders) {
  return (err) => {
    if (!err || clientLeft(err)) return;
    if (res.headersSent) {
      console.error("Error sending file after the response started:", err);
      res.destroy();
      return;
    }
    onFailedBeforeHeaders(err);
  };
}

function clientLeft(err) {
  return err.code === "ECONNABORTED" || err.syscall === "write";
}
