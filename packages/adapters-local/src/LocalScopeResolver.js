import { NotFoundError } from "@widgetizer/core/errors";
import { LOCAL_ACTOR } from "@widgetizer/core/adapters";

// Reads the OSS schema directly via the injected db handle (rather than
// importing @widgetizer/builder-server repositories) so adapters-local stays
// decoupled from builder-server.
function readActiveProjectId(db) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'activeProjectId'").get();
  if (row && row.value) return JSON.parse(row.value);
  return null;
}

function readFolderName(db, projectId) {
  const row = db.prepare("SELECT folder_name FROM projects WHERE id = ?").get(projectId);
  return row ? row.folder_name : null;
}

/**
 * OSS ScopeResolver — single-tenant. There is no auth and no per-request
 * actor; the scope is always the singleton "active project". Implements the
 * ScopeResolver contract from @widgetizer/core/adapters.
 */
export class LocalScopeResolver {
  /** @param {import('better-sqlite3').Database} db */
  constructor(db) {
    if (!db) throw new Error("LocalScopeResolver requires a db handle");
    this.db = db;
  }

  async resolveActor(_req) {
    return LOCAL_ACTOR;
  }

  async resolveScope(_req) {
    const projectId = readActiveProjectId(this.db);
    if (!projectId) {
      throw new NotFoundError("No active project", { code: "NO_ACTIVE_PROJECT" });
    }
    const folderName = readFolderName(this.db, projectId);
    if (!folderName) {
      throw new NotFoundError("Active project not found", { code: "PROJECT_NOT_FOUND" });
    }
    return { actor: LOCAL_ACTOR, projectId, folderName };
  }
}

/**
 * OSS preview ScopeResolver. In OSS the preview surface is same-origin and
 * single-tenant, so it resolves the same singleton active project. (Hosted
 * uses a JWT-verifying TokenPreviewScopeResolver instead.)
 */
export class LocalPreviewScopeResolver extends LocalScopeResolver {}
