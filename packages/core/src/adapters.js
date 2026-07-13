// @widgetizer/core/adapters — adapter contracts shared by both shells.
//
// JavaScript has no interfaces, so the adapter contracts are expressed as JSDoc
// typedefs plus this module's runtime export, LIMIT_KEYS. The OSS shell wires
// the @widgetizer/adapters-local implementations; hosted wires its own cloud
// implementations. Conformance test suites (in @widgetizer/core/test-helpers)
// pin the behaviour both must satisfy.

/**
 * The acting principal behind a request.
 * @typedef {Object} Actor
 * @property {string} id              Opaque identity. OSS uses "default"; hosted uses the Clerk user id.
 * @property {'local' | 'cloud'} kind
 */

/**
 * Everything a scope-aware operation needs. Authorization is resolved ONCE by
 * the ScopeResolver; downstream code trusts the scope.
 * @typedef {Object} Scope
 * @property {Actor} actor
 * @property {string} projectId   UUID — used for DB queries and authorization.
 * @property {string} folderName  Filesystem-friendly id — used to construct paths.
 */

/**
 * Resolves the actor/scope for a request. Throws AuthenticationError(401),
 * AuthorizationError(403), or NotFoundError(404).
 * @typedef {Object} ScopeResolver
 * @property {(req: unknown) => Promise<Actor>} resolveActor
 * @property {(req: unknown) => Promise<Scope>} resolveScope
 */

/**
 * Project content (small whole-file JSON: pages, menus, theme settings).
 * @typedef {Object} StorageAdapter
 * @property {(scope: Scope, relativePath: string) => Promise<Buffer | null>} read
 * @property {(scope: Scope, relativePath: string, content: Buffer | string) => Promise<void>} write
 * @property {(scope: Scope, relativePath: string) => Promise<void>} delete
 * @property {(scope: Scope, relativeDir: string) => Promise<string[]>} list
 * @property {(scope: Scope, relativePath: string) => Promise<boolean>} exists
 * @property {(scope: Scope, relativePath: string) => Promise<{ size: number, mtime: Date } | null>} stat
 * @property {(scope: Scope) => string} getProjectBase - Absolute path to the project's
 *   working directory (the root read/write/list resolve against). Lets shared, scope-first
 *   code hand a dir-explicit FS operation the correct per-project dir without knowing the
 *   OSS-vs-hosted on-disk layout.
 */

/**
 * Media binaries (large, streamed). Separate from StorageAdapter because the
 * content types, URL semantics, and storage targets differ.
 * @typedef {Object} AssetStorageAdapter
 * @property {(scope: Scope, key: string, stream: unknown) => Promise<{ key: string, sizeBytes: number, contentType: string }>} upload
 * @property {(scope: Scope, key: string, range?: { start: number, end: number }) => Promise<unknown | null>} download
 *   Returns a readable stream of the asset, or null if absent. With an inclusive
 *   `{ start, end }` byte range, returns just that slice (powers HTTP 206 media seeking).
 * @property {(scope: Scope, key: string) => Promise<{ size: number } | null>} stat
 *   Byte size of the asset (for Content-Length / Content-Range), or null if absent.
 * @property {(scope: Scope, key: string) => Promise<void>} delete
 * @property {(scope: Scope, prefix: string) => Promise<string[]>} list
 * @property {(scope: Scope, key: string, opts: { context: 'editor' | 'published' }) => string} getUrl
 */

/**
 * Publishing target. RenderStream is an AsyncIterable<{ path, content }>.
 * Throws LimitExceededError(402) or UpstreamError(503).
 * @typedef {Object} PublishAdapter
 * @property {(scope: Scope, renderStream: AsyncIterable<{ path: string, content: Buffer | string }>, options?: object) => Promise<{ version: number, fileCount: number, sizeBytes: number, meta?: object }>} publish
 */

/**
 * Tier/limit lookups. Keys come from LIMIT_KEYS.
 * @typedef {Object} LimitsAdapter
 * @property {(scope: Scope, key: string) => Promise<number | string | boolean>} getLimit
 */

/**
 * The OSS single-tenant actor. There is no auth in OSS, so every request acts as
 * this frozen local default. Shared here (rather than re-declared per package) so
 * the scope resolver, the editor store, and any other caller reference one
 * canonical literal. Hosted constructs its own cloud actor per request instead.
 * @type {Actor}
 */
export const LOCAL_ACTOR = Object.freeze({ id: "default", kind: "local" });

/**
 * Canonical limit keys. Frozen so callers reference constants, not strings.
 * @readonly
 */
export const LIMIT_KEYS = Object.freeze({
  MAX_UPLOAD_SIZE_BYTES: "MAX_UPLOAD_SIZE_BYTES",
  MAX_PAGES_PER_PROJECT: "MAX_PAGES_PER_PROJECT",
  MAX_PROJECTS_PER_USER: "MAX_PROJECTS_PER_USER",
  MAX_MEDIA_BYTES: "MAX_MEDIA_BYTES",
  CUSTOM_DOMAIN_ALLOWED: "CUSTOM_DOMAIN_ALLOWED",
  ANALYTICS_TIER: "ANALYTICS_TIER",
  FORM_SUBMISSIONS_PER_MONTH: "FORM_SUBMISSIONS_PER_MONTH",
  // Per-page widget count ceiling — guards the render/save loops against an
  // attacker persisting tens of thousands of widgets in one page.
  MAX_WIDGETS_PER_PAGE: "MAX_WIDGETS_PER_PAGE",
  // Total menu-item node count ceiling — guards the recursive menu sanitize/
  // render walks against an attacker persisting a huge menu tree.
  MAX_MENU_ITEMS: "MAX_MENU_ITEMS",
  // Per-collection item-count ceiling — guards the collection write path and the
  // export-time enumeration against a tenant persisting unbounded items.
  MAX_COLLECTION_ITEMS: "MAX_COLLECTION_ITEMS",
  // Collection-type count ceiling per project (defense against amplification of
  // the export-time per-collection enumeration). OSS stays unbounded.
  MAX_COLLECTIONS: "MAX_COLLECTIONS",
});

/**
 * Default DoS-protection ceiling for widgets per page.
 * The hosted limits adapter returns this for LIMIT_KEYS.MAX_WIDGETS_PER_PAGE;
 * OSS stays unbounded (Infinity). It also serves as the hard clamp the render
 * loops apply as a safety net against already-persisted oversized pages. Set far
 * above any realistic page (real pages have tens of widgets).
 */
export const MAX_WIDGETS_PER_PAGE = 5000;

/**
 * Default DoS-protection ceiling for total menu-item nodes.
 * Hosted returns this for LIMIT_KEYS.MAX_MENU_ITEMS; OSS stays unbounded
 * (Infinity). Far above any realistic menu (real menus have tens of items).
 */
export const MAX_MENU_ITEMS = 1000;

/**
 * Hard cap on menu-tree nesting depth. Applied at both
 * save (reject deeper trees) and render (the link-resolution walk stops here),
 * so the recursive menu walks can never blow the stack on a hostile or unchecked
 * tree. Tier-independent — the nav template only renders three levels, so any
 * realistic menu is far shallower than this.
 */
export const MAX_MENU_DEPTH = 32;
