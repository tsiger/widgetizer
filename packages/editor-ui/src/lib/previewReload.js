// The one path by which the editor's preview frame gets a new document.
//
// Every full reload — the first load, a structural change, a morph that found the
// document's session ended, and the keep-alive saying the session ended — mints
// through load(). Mints run one at a time: a load() asked for while one is under
// way waits, and when that mint answers its document is dropped and a single
// follow-up mints from the editor's state as it is then. So the document in the
// frame is always the one whose session the coordinator holds and keeps alive,
// and each mint names the newest live session as the one it replaces (the server
// ends that one as it mints), so overlapping reloads leave one live session.
// requestReload() is the session-ended entry: it does nothing while a mint is
// under way (that mint brings a new session anyway), so overlapping "session
// ended" signals cause one reload.
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
  // The answer for the document in the frame; its session is the one re-renders echo.
  let shown = null;
  // The newest session minted for this frame, shown or not: the next mint replaces it.
  let newestSession = null;
  let stopKeepAlive = () => {};
  let keepAliveGeneration = 0;
  let running = false;
  // The load() waiting for the running mint: { isCurrent, resolve, reject }.
  let queued = null;
  let disposed = false;

  const stopCurrentKeepAlive = () => {
    keepAliveGeneration += 1;
    stopKeepAlive();
    stopKeepAlive = () => {};
  };

  // Keeps the shown document's session alive. When a mint that replaced it was
  // dropped, that session is already gone and the first touch says so (410),
  // which reloads the frame onto a live one.
  const keepShownAlive = () => {
    stopCurrentKeepAlive();
    const generation = keepAliveGeneration;
    stopKeepAlive = keepAlive({
      session: shown?.session ?? null,
      absoluteExpiresAt: shown?.absoluteExpiresAt,
      idleExpiresAt: shown?.idleExpiresAt,
      onEnded: () => {
        if (!disposed && generation === keepAliveGeneration) requestReload();
      },
    });
  };

  async function run(request) {
    running = true;
    // The document on show is on its way out.
    stopCurrentKeepAlive();
    let minted;
    let failure = null;
    try {
      minted = await mint({ replaces: newestSession });
      newestSession = minted?.session ?? null;
    } catch (error) {
      failure = error;
    }
    running = false;

    if (disposed) {
      request.resolve(false);
      return;
    }
    if (queued) {
      // A newer load() was asked for meanwhile: this answer is out of date. Its
      // session is named as the one the follow-up replaces, and never shown.
      const next = queued;
      queued = null;
      request.resolve(false);
      run(next);
      return;
    }
    if (failure) {
      keepShownAlive();
      request.reject(failure);
      return;
    }
    if (!request.isCurrent()) {
      keepShownAlive();
      request.resolve(false);
      return;
    }
    shown = minted ?? null;
    keepShownAlive();
    show(minted);
    request.resolve(true);
  }

  /**
   * Mint the next document and show it, unless `isCurrent()` says the editor
   * moved on by the time the mint answers.
   * @param {() => boolean} [isCurrent]
   * @returns {Promise<boolean>} whether this call's document was shown; false when
   *   a later load() superseded it or isCurrent() said no.
   */
  function load(isCurrent = () => true) {
    if (disposed) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      const request = { isCurrent, resolve, reject };
      if (running) {
        queued?.resolve(false);
        queued = request;
        return;
      }
      run(request);
    });
  }

  /** Reload because the frame's session ended. */
  function requestReload() {
    if (disposed || running) return;
    const isCurrent = beginReload();
    load(isCurrent).catch(onReloadError);
  }

  return {
    load,
    requestReload,
    /** The shown document's session, for its widget re-renders; null when the host gives none. */
    get session() {
      return shown?.session ?? null;
    },
    /** The frame's document is gone (another page is opening); its session stays named for replaces. */
    release() {
      shown = null;
      stopCurrentKeepAlive();
    },
    /** The editor is closing: stop everything and ignore any answer still on its way. */
    dispose() {
      disposed = true;
      queued?.resolve(false);
      queued = null;
      stopCurrentKeepAlive();
    },
  };
}
