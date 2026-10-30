// The one path by which the editor's preview frame gets a new document.
//
// Every full reload — the first load, a structural change, a morph that found the
// document's session ended, and the keep-alive saying the session ended — mints
// through load(). It names the frame's session as the one the new document
// replaces (the server ends that one as it mints), keeps the newest session alive,
// and stops the previous keep-alive first, so a late answer about a replaced
// session can never reload the document that replaced it. requestReload() is the
// session-ended entry: it does nothing while a mint is under way (that mint brings
// a new session anyway), so overlapping "session ended" signals cause one reload.
//
// When the host gives its preview documents no session (the OSS server never
// does), the keep-alive is a no-op and replaces is never sent.
import { startPreviewKeepAlive } from "../queries/previewManager";

/**
 * @param {object} options
 * @param {(options: { replaces: string|null }) => Promise<object>} options.mint -
 *   Mints a document from the editor's current state; answers
 *   `{ token, session?, absoluteExpiresAt?, idleExpiresAt? }`.
 * @param {(minted: object) => void} options.show - Puts a minted document in the frame.
 * @param {() => (() => boolean)} options.beginReload - Prepares a session-ended
 *   reload (e.g. remembers where the view was) and returns its isCurrent check.
 * @param {(error: Error) => void} [options.onReloadError]
 * @param {typeof startPreviewKeepAlive} [options.keepAlive]
 */
export function createPreviewReloadCoordinator({
  mint,
  show,
  beginReload,
  onReloadError = () => {},
  keepAlive = startPreviewKeepAlive,
}) {
  // The newest minted document's answer: its session is the frame's live one.
  let current = null;
  let stopKeepAlive = () => {};
  let keepAliveGeneration = 0;
  let mintTicket = 0;
  let adoptedTicket = 0;
  let mintsInFlight = 0;
  let disposed = false;

  const stopCurrentKeepAlive = () => {
    keepAliveGeneration += 1;
    stopKeepAlive();
    stopKeepAlive = () => {};
  };

  const keepCurrentAlive = () => {
    stopCurrentKeepAlive();
    const generation = keepAliveGeneration;
    stopKeepAlive = keepAlive({
      session: current?.session ?? null,
      absoluteExpiresAt: current?.absoluteExpiresAt,
      idleExpiresAt: current?.idleExpiresAt,
      onEnded: () => {
        if (!disposed && generation === keepAliveGeneration) requestReload();
      },
    });
  };

  /**
   * Mint the next document and show it, unless `isCurrent()` says a newer update
   * overtook this one by the time the mint answers.
   * @param {() => boolean} [isCurrent]
   * @returns {Promise<boolean>} whether the new document was shown
   */
  async function load(isCurrent = () => true) {
    // The document on show is on its way out.
    stopCurrentKeepAlive();
    const ticket = ++mintTicket;
    mintsInFlight += 1;
    let minted;
    try {
      minted = await mint({ replaces: current?.session ?? null });
    } catch (error) {
      // Nothing replaced the document on show: keep its session alive again.
      if (!disposed && ticket === mintTicket) keepCurrentAlive();
      throw error;
    } finally {
      mintsInFlight -= 1;
    }
    if (disposed) return false;
    // The server ended the replaced session, so this one is the frame's live session
    // even when a newer update discards the document — unless a later mint already
    // answered.
    if (ticket > adoptedTicket) {
      adoptedTicket = ticket;
      current = minted ?? null;
      keepCurrentAlive();
    }
    if (!isCurrent()) return false;
    show(minted);
    return true;
  }

  /** Reload because the frame's session ended. */
  function requestReload() {
    if (disposed || mintsInFlight > 0) return;
    const isCurrent = beginReload();
    load(isCurrent).catch(onReloadError);
  }

  return {
    load,
    requestReload,
    /** The frame's live session, for its widget re-renders; null when the host gives none. */
    get session() {
      return current?.session ?? null;
    },
    /** The frame's document is gone (another page is opening); its session stays named for replaces. */
    release: stopCurrentKeepAlive,
    /** The editor is closing: stop everything and ignore any answer still on its way. */
    dispose() {
      disposed = true;
      stopCurrentKeepAlive();
    },
  };
}
