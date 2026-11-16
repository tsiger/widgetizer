/**
 * Start the export viewer, then report the app ready. The viewer's bind settles
 * (success or not) before `onReady` fires, so a caller that publishes the
 * viewer's origins sees the final answer. A viewer failure only logs: it never
 * rejects and never reaches the app's own exit-on-listen-error path. An error
 * thrown by `onReady` itself is not swallowed: it rejects the returned promise
 * so the caller sees it.
 *
 * @param {object} options
 * @param {{ start: Function, origins: () => string[] }} options.viewer
 * @param {string} options.host the app's bind host; the viewer binds on it too
 * @param {number} options.appPort the port the app is bound to
 * @param {boolean} options.appPortWasRequested false when the OS picked the app port
 * @param {(port: number, viewer: { port: number, origins: string[] } | null) => void} [options.onReady]
 * @param {Pick<Console, "log"|"error">} [options.log]
 * @returns {Promise<void>}
 */
export async function startViewerThenReady({ viewer, host, appPort, appPortWasRequested, onReady, log = console }) {
  let info = null;
  try {
    const started = await viewer.start({ host, appPort, appPortWasRequested });
    if (started) info = { port: started.port, origins: viewer.origins() };
  } catch (err) {
    log.error(`Export viewer failed to start: ${err?.message ?? err}`);
  }

  // When the viewer is off or can't bind, it has already logged why.
  if (info) log.log(`Export viewer is running on ${info.origins[0] ?? `port ${info.port}`}`);

  onReady?.(appPort, info);
}
