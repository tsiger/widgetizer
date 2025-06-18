// Utilities for sending patch messages to the preview iframe

export function patchStyle(iframe, selector, property, value) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'PATCH_STYLE',
      payload: { selector, property, value },
    },
    '*',
  );
}

export function patchText(iframe, selector, content) {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'PATCH_TEXT',
      payload: { selector, content },
    },
    '*',
  );
}

export function patchClass(iframe, selector, className, action = 'add') {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'PATCH_CLASS',
      payload: { selector, className, action },
    },
    '*',
  );
}
