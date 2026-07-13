// Same-browser cross-tab signal that the singleton active project changed. A tab
// that switches the active project announces it; sibling tabs react immediately
// (no focus needed) so a stale editor tab can show its out-of-date curtain at once.
// Same-browser only (BroadcastChannel); the focus/visibility + save-409 paths remain
// the cross-browser fallback. No-ops where BroadcastChannel is unavailable.
//
// Channels are created per call: BroadcastChannel never delivers a message to the
// object that sent it, so the announcing tab won't react to its own switch, while
// every other tab's subscriber channel does. Closing the sender after postMessage is
// safe — messages already dispatched to other channels are unaffected.
const CHANNEL_NAME = "widgetizer:active-project";
const MESSAGE_TYPE = "active-project-changed";

export function announceActiveProjectChange(projectId) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: MESSAGE_TYPE, projectId: projectId ?? null });
  channel.close();
}

/**
 * @param {(projectId: string|null) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeActiveProjectChange(handler) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const listener = (event) => {
    if (event?.data?.type === MESSAGE_TYPE) handler(event.data.projectId ?? null);
  };
  channel.addEventListener("message", listener);
  return () => {
    channel.removeEventListener("message", listener);
    channel.close();
  };
}
