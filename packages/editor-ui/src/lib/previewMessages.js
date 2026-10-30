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

function isStringList(value) {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (!isShortString(value[i], MAX_THEME_READ_LENGTH)) return false;
  }
  return true;
}

// The site settings a full render read: `{ widgets?: { [widgetId]: string[] }, layout?: string[] }`.
// Checked by shape only, with no count or size cap — a large page legitimately
// reports thousands of widgets, and the browser has already copied the message by
// the time it gets here. Any other shape (a cycle or a class instance included)
// drops the whole value to null, which the editor reads as "unknown".
function readThemeReads(value) {
  if (value === null || value === undefined || !isPlainObject(value)) return null;
  const { widgets, layout } = value;
  if (widgets !== undefined) {
    if (!isPlainObject(widgets)) return null;
    for (const key of Object.keys(widgets)) {
      if (key.length > MAX_THEME_READ_LENGTH || !isStringList(widgets[key])) return null;
    }
  }
  if (layout !== undefined && !isStringList(layout)) return null;
  return {
    ...(widgets !== undefined ? { widgets } : {}),
    ...(layout !== undefined ? { layout } : {}),
  };
}

// One reader per inbound type; each returns the payload to use, or null to drop
// the message. Types the editor does not handle have no entry and are dropped.
const PAYLOAD_READERS = {
  PREVIEW_READY(payload) {
    if (payload === undefined || payload === null) return { themeReads: null };
    if (!isPlainObject(payload)) return null;
    return { themeReads: readThemeReads(payload.themeReads) };
  },
  WIDGET_SELECTED(payload) {
    if (!isPlainObject(payload) || !isShortString(payload.widgetId, MAX_ID_LENGTH)) return null;
    const blockId = payload.blockId ?? null;
    if (blockId !== null && !isShortString(blockId, MAX_ID_LENGTH)) return null;
    return { widgetId: payload.widgetId, blockId };
  },
  REORDER_WIDGET(payload) {
    if (!isPlainObject(payload) || !isShortString(payload.widgetId, MAX_ID_LENGTH)) return null;
    if (payload.direction !== "up" && payload.direction !== "down") return null;
    return { widgetId: payload.widgetId, direction: payload.direction };
  },
  NAVIGATE_PREVIEW(payload) {
    if (!isPlainObject(payload) || !isShortString(payload.url, MAX_URL_LENGTH)) return null;
    return { url: payload.url };
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
    if (!isPlainObject(data) || typeof data.type !== "string" || !Object.hasOwn(PAYLOAD_READERS, data.type)) {
      return null;
    }
    const payload = PAYLOAD_READERS[data.type](data.payload);
    return payload ? { type: data.type, payload } : null;
  } catch {
    return null;
  }
}
