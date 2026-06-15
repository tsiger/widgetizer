import { LIMIT_KEYS } from "@widgetizer/core/adapters";

const SETTINGS_KEY = "config:local";
const DEFAULT_MAX_FILE_SIZE_MB = 5;

/**
 * OSS LimitsAdapter — single-user, so most limits are unbounded. The only
 * configurable limit is the per-file upload size (from app_settings). Reads the
 * OSS schema directly via the injected db handle. Implements the LimitsAdapter
 * contract from @widgetizer/core/adapters.
 */
export class LocalLimitsAdapter {
  /** @param {import('better-sqlite3').Database} db */
  constructor(db) {
    if (!db) throw new Error("LocalLimitsAdapter requires a db handle");
    this.db = db;
  }

  #maxFileSizeMB() {
    const row = this.db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(SETTINGS_KEY);
    if (row?.value) {
      try {
        const mb = JSON.parse(row.value)?.media?.maxFileSizeMB;
        if (typeof mb === "number" && mb > 0) return mb;
      } catch {
        // fall through to default
      }
    }
    return DEFAULT_MAX_FILE_SIZE_MB;
  }

  /** @param {object} _scope @param {string} key */
  async getLimit(_scope, key) {
    switch (key) {
      case LIMIT_KEYS.MAX_UPLOAD_SIZE_BYTES:
        return this.#maxFileSizeMB() * 1024 * 1024;
      case LIMIT_KEYS.MAX_MEDIA_BYTES:
      case LIMIT_KEYS.MAX_PAGES_PER_PROJECT:
      case LIMIT_KEYS.MAX_PROJECTS_PER_USER:
      case LIMIT_KEYS.FORM_SUBMISSIONS_PER_MONTH:
      case LIMIT_KEYS.MAX_WIDGETS_PER_PAGE:
        return Infinity; // single-user OSS: unbounded
      case LIMIT_KEYS.CUSTOM_DOMAIN_ALLOWED:
        return true;
      case LIMIT_KEYS.ANALYTICS_TIER:
        return "none"; // hosted analytics tiers do not apply to OSS
      default:
        throw new Error(`Unknown limit key: ${key}`);
    }
  }
}
