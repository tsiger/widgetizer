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
 */

/**
 * Media binaries (large, streamed). Separate from StorageAdapter because the
 * content types, URL semantics, and storage targets differ.
 * @typedef {Object} AssetStorageAdapter
 * @property {(scope: Scope, key: string, stream: unknown) => Promise<{ key: string, sizeBytes: number, contentType: string }>} upload
 * @property {(scope: Scope, key: string) => Promise<unknown | null>} download
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
});
