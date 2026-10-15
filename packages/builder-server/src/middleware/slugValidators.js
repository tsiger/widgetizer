import { body, param } from "express-validator";
import { isSafePathSegment } from "../utils/pathSecurity.js";

// Slugs and ids from a request become storage keys or folders (`pages/<slug>.json`,
// `themes/<id>`). Express decodes `%2F` in route params, which would otherwise let
// `..%2Ftheme` reach the project's own theme.json.

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const slugMessage = (name) => `${name} must contain lowercase letters, numbers, and hyphens only.`;
const segmentMessage = (name) => `${name} must be a single name, without slashes.`;

/** Collection slugs and types: the strict form the app generates. */
export const slugParam = (name) => param(name).matches(SLUG_PATTERN).withMessage(slugMessage(name));

export const slugBody = (name) => body(name).isString().bail().matches(SLUG_PATTERN).withMessage(slugMessage(name));

/**
 * Page and menu slugs and theme ids: any single name. Pages and menus a theme
 * ships keep their file names (a third-party `About_Us.json` included), and
 * uploaded themes install under their zip's folder name, so the strict form would
 * lock those out. Containment is what matters: no separator, `.` or `..`.
 */
export const segmentParam = (name) => param(name).custom(isSafePathSegment).withMessage(segmentMessage(name));

export const segmentBody = (name) => body(name).custom(isSafePathSegment).withMessage(segmentMessage(name));
