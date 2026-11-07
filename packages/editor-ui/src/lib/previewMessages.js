// Inbound side of the editor <-> preview postMessage bridge.
//
// The preview document runs the site's own scripts next to the preview runtime,
// so an origin + source check says only which frame posted a message, never which
// code did. Every message the editor acts on therefore goes through
// readPreviewMessage(), which checks where it came from AND validates its payload
// against the shape the runtime sends; listeners use only the payload it returns,
// never `event.data`.
import { getPreviewTargetOrigin } from "./previewBase";

const MAX_ID_LENGTH = 128;
const MAX_THEME_READ_LENGTH = 256;
const MAX_URL_LENGTH = 2048;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const isShortString = (value, max) => typeof value === "string" && value.length <= max;

// A fresh array of the list's strings, each read once; null for anything else.
function copyStringList(value) {
  if (!Array.isArray(value)) return null;
  const length = value.length;
  const copy = [];
  for (let i = 0; i < length; i++) {
    const item = value[i];
    if (!isShortString(item, MAX_THEME_READ_LENGTH)) return null;
    copy.push(item);
  }
  return copy;
}

// The site settings a full render read: `{ widgets?: { [widgetId]: string[] }, layout?: string[] }`.
// Checked by shape: every key and string is capped at MAX_THEME_READ_LENGTH, but
// neither the number of entries nor the total size is — a large page legitimately
// reports thousands of widgets, and the browser has already copied the message by
// the time it gets here. Each property is read once and what passes is copied
// into fresh objects and arrays, so nothing downstream ever touches the sender's
// containers (a getter or proxy cannot answer differently later). Any other shape
// (a cycle or a class instance included) drops the whole value to null, which the
// editor reads as "unknown".
function readThemeReads(value) {
  if (!isPlainObject(value)) return null;
  const widgets = value.widgets;
  const layout = value.layout;
  const copy = {};
  if (widgets !== undefined) {
    if (!isPlainObject(widgets)) return null;
    const widgetsCopy = {};
    for (const key of Object.keys(widgets)) {
      if (key.length > MAX_THEME_READ_LENGTH) return null;
      const reads = copyStringList(widgets[key]);
      if (!reads) return null;
      // Defined, not assigned: a widget id of "__proto__" stays an ordinary key.
      Object.defineProperty(widgetsCopy, key, { value: reads, enumerable: true, writable: true, configurable: true });
    }
    copy.widgets = widgetsCopy;
  }
  if (layout !== undefined) {
    const layoutCopy = copyStringList(layout);
    if (!layoutCopy) return null;
    copy.layout = layoutCopy;
  }
  return copy;
}

// One reader per inbound type; each reads every field once and returns a fresh
// payload to use, or null to drop the message. Types the editor does not handle
// have no entry and are dropped.
const PAYLOAD_READERS = {
  PREVIEW_READY(payload) {
    if (payload === undefined || payload === null) return { themeReads: null };
    if (!isPlainObject(payload)) return null;
    return { themeReads: readThemeReads(payload.themeReads) };
  },
  WIDGET_SELECTED(payload) {
    if (!isPlainObject(payload)) return null;
    const { widgetId, blockId = null } = payload;
    if (!isShortString(widgetId, MAX_ID_LENGTH)) return null;
    if (blockId !== null && !isShortString(blockId, MAX_ID_LENGTH)) return null;
    return { widgetId, blockId };
  },
  REORDER_WIDGET(payload) {
    if (!isPlainObject(payload)) return null;
    const { widgetId, direction } = payload;
    if (!isShortString(widgetId, MAX_ID_LENGTH)) return null;
    if (direction !== "up" && direction !== "down") return null;
    return { widgetId, direction };
  },
  NAVIGATE_PREVIEW(payload) {
    if (!isPlainObject(payload)) return null;
    const { url, fragment } = payload;
    if (!isShortString(url, MAX_URL_LENGTH)) return null;
    // The section the link names on that page (an element id, decoded).
    if (fragment === undefined) return { url };
    if (!isShortString(fragment, MAX_URL_LENGTH) || fragment === "") return null;
    // The listener encodes it into the route; an unpaired surrogate can't be.
    try {
      encodeURIComponent(fragment);
    } catch {
      return null;
    }
    return { url, fragment };
  },
  SCROLL_POSITION(payload) {
    if (!isPlainObject(payload)) return null;
    const { scrollY } = payload;
    if (typeof scrollY !== "number" || !Number.isFinite(scrollY) || scrollY < 0) return null;
    return { scrollY };
  },
};

function fromPreview(event, checkSource, iframe) {
  if (!event) return false;
  // A render base that cannot be parsed gives "*" for outbound targets; inbound it
  // means no known origin, so nothing is accepted and the bridge fails visibly.
  const origin = getPreviewTargetOrigin();
  if (origin === "*" || event.origin !== origin) return false;
  if (checkSource && (!iframe || event.source !== iframe.contentWindow)) return false;
  return true;
}

/**
 * Whether a `message` event came from the preview: its origin is the preview's
 * (derived from the render base) and, when an iframe is passed, it was posted by
 * that iframe's window. Passing a missing iframe (null) rejects every message.
 * @param {MessageEvent} event
 * @param {HTMLIFrameElement|null} [iframe]
 * @returns {boolean}
 */
export function isPreviewMessage(event, iframe) {
  return fromPreview(event, arguments.length > 1, iframe);
}

/**
 * The preview message an event carries, checked like isPreviewMessage() and
 * validated against its type's payload shape.
 * @param {MessageEvent} event
 * @param {HTMLIFrameElement|null} [iframe]
 * @returns {{ type: string, payload: object } | null} null when the event is not
 *   from the preview, is of a type the editor does not handle, or is malformed.
 */
export function readPreviewMessage(event, iframe) {
  if (!fromPreview(event, arguments.length > 1, iframe)) return null;
  try {
    const data = event.data;
    if (!isPlainObject(data)) return null;
    const { type, payload: raw } = data;
    if (typeof type !== "string" || !Object.hasOwn(PAYLOAD_READERS, type)) return null;
    const payload = PAYLOAD_READERS[type](raw);
    return payload ? { type, payload } : null;
  } catch {
    return null;
  }
}
