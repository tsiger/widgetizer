import { useState } from "react";

/**
 * The standalone preview frame's address: the render URL, plus the route's
 * `#section` when the render is new (a `page.html#section` link from another
 * page), so the runtime opens that render at the section.
 *
 * The hash is read only when a new render arrives. A render URL may be good for
 * one load only (a host can consume its token), and the stage remounts its frame
 * whenever the address changes, so a later hash-only change of the route (Back or
 * Forward between `about` and `about#team`, a plain `about.html` link clicked on
 * `about#team`) must not change the address and reload a spent render.
 *
 * @param {string|null} renderSrc  the render URL, or null while there is none
 * @param {string} hash  the route's hash, `#…` or ""
 * @returns {string|null}
 */
export function usePreviewFrameSrc(renderSrc, hash) {
  const [frame, setFrame] = useState({ renderSrc: null, src: null });
  if (frame.renderSrc === renderSrc) return frame.src;
  const src = renderSrc && hash && hash !== "#" ? `${renderSrc}${hash}` : renderSrc;
  // Adjusting state while rendering, when the input it derives from changes.
  setFrame({ renderSrc, src });
  return src;
}
