/**
 * Global platform limits for the Editor service.
 *
 * When the platform sets hostedMode: true via the adapter system
 * (createEditorApp({ hostedMode: true })), these are server-enforced
 * ceilings that override user-configurable app settings (e.g., a user
 * can set maxFileSizeMB to 50, but the server caps it at
 * media.maxFileSizeMBCeiling).
 *
 * In open-source / self-hosted mode (hostedMode defaults to false), most
 * limits are NOT enforced — the user controls their own instance. Limits
 * marked "always enforced" apply regardless of mode for safety (ZIP bomb
 * protection, image decompression bombs, request body sizes).
 *
 * Single file to change when adjusting platform limits.
 */

export const EDITOR_LIMITS = {
  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------
  maxProjectsPerUser: 25,
  maxProjectNameLength: 200,
  maxProjectDescriptionLength: 1000,

  // -------------------------------------------------------------------------
  // Pages
  // -------------------------------------------------------------------------
  maxPagesPerProject: 100,
  maxPageNameLength: 200,
  maxPageSlugLength: 200,
  /** Max page JSON file size in bytes — 5 MB */
  maxPageJsonSize: 5 * 1024 * 1024,

  // -------------------------------------------------------------------------
  // Widgets & Blocks
  // -------------------------------------------------------------------------
  /** Max top-level widgets in a page */
  maxWidgetsPerPage: 50,
  /** Absolute ceiling — schema maxBlocks cannot exceed this */
  maxBlocksPerWidget: 200,
  /** Max nesting levels for nested widgets */
  maxWidgetNestingDepth: 3,
  /** Max characters in a single text content field */
  maxTextContentLength: 100_000,

  // -------------------------------------------------------------------------
  // Menus
  // -------------------------------------------------------------------------
  maxMenusPerProject: 20,
  /** Total items (flat count including nested) */
  maxMenuItemsPerMenu: 200,
  maxMenuNestingDepth: 4,
  maxMenuNameLength: 200,

  // -------------------------------------------------------------------------
  // Media
  // -------------------------------------------------------------------------
  media: {
    /** Server cap on user-configurable maxFileSizeMB (images) */
    maxFileSizeMBCeiling: 50,
    /** Server cap on user-configurable maxVideoSizeMB */
    maxVideoSizeMBCeiling: 200,
    /** Server cap on user-configurable maxAudioSizeMB */
    maxAudioSizeMBCeiling: 100,
    /** Max media files in a single project */
    maxFilesPerProject: 1000,
    /** Total media storage per user in MB — 5 GB */
    maxTotalStoragePerUserMB: 5000,
    /** Max image width or height in pixels (prevents decompression bombs) — always enforced */
    maxImageDimension: 10_000,
    /** Max total pixels for Sharp processing — always enforced */
    maxImagePixels: 100_000_000,
  },

  // -------------------------------------------------------------------------
  // Themes
  // -------------------------------------------------------------------------
  maxThemesPerUser: 20,

  // -------------------------------------------------------------------------
  // Import / Export — always enforced for safety
  // -------------------------------------------------------------------------
  /** Server cap on user-configurable maxImportSizeMB */
  maxImportSizeMBCeiling: 2000,
  /** Server cap on user-configurable maxVersionsToKeep */
  maxExportVersionsCeiling: 50,
  /** Max entries in any ZIP file (prevents ZIP bombs) — always enforced */
  maxZipEntries: 10_000,

  // -------------------------------------------------------------------------
  // Request body limits — always enforced
  // -------------------------------------------------------------------------
  /** express.json() limit for standard API routes */
  jsonBodyLimit: "2mb",
  /** express.json() limit for page content save routes */
  editorJsonBodyLimit: "10mb",
};
