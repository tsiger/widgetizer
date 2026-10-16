export const PROMPT_COOLDOWN_MS = 2000;

/**
 * True only for a message from the main frame of the editor window while it shows
 * the editor, never from a preview iframe or another window.
 */
export function isTrustedSender({ sender, senderFrame } = {}, { webContents, rendererOrigin }) {
  if (!webContents || sender !== webContents || !senderFrame || senderFrame !== sender.mainFrame) return false;
  try {
    return new URL(senderFrame.url).origin === rendererOrigin;
  } catch {
    return false;
  }
}

/**
 * The one way to turn assistant access on in the desktop app: the user answers a
 * prompt drawn by the main process. One request runs at a time, a short pause
 * follows each so a page can't reopen it endlessly, and a lost reply is reported
 * as unknown rather than retried.
 *
 * @param {{
 *   isTrusted: (event: any) => boolean,
 *   getAccess: () => Promise<{ enabled: boolean }>,
 *   enable: () => Promise<{ enabled: boolean }>,
 *   ask: () => Promise<boolean>,
 *   now?: () => number,
 *   cooldownMs?: number,
 * }} deps
 * @returns {(event: any) => Promise<{ result: "enabled"|"cancelled"|"busy"|"refused"|"unavailable"|"unknown" }>}
 */
export function createEnableGate({ isTrusted, getAccess, enable, ask, now = Date.now, cooldownMs = PROMPT_COOLDOWN_MS }) {
  let running = false;
  let readyAt = 0;

  return async function requestEnable(event) {
    if (!isTrusted(event)) return { result: "refused" };
    if (running || now() < readyAt) return { result: "busy" };
    running = true;
    try {
      let access;
      try {
        access = await getAccess();
      } catch {
        return { result: "unavailable" };
      }
      if (access.enabled) return { result: "enabled" };
      if (!(await ask())) return { result: "cancelled" };
      try {
        return { result: (await enable()).enabled ? "enabled" : "unknown" };
      } catch {
        return { result: "unknown" };
      }
    } finally {
      running = false;
      readyAt = now() + cooldownMs;
    }
  };
}
