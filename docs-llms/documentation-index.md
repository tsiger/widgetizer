# Documentation Index & Reference Guide

This document serves as a comprehensive index to all documentation in the Widgetizer project. Use this guide to quickly find the appropriate documentation for your needs, whether you're developing, troubleshooting, or understanding system architecture.

> **Post-refactor note.** The codebase now lives in npm-workspace packages behind adapter contracts. The two authoritative maps are **[core-architecture.md](core-architecture.md)** (orientation) and **[core-packages.md](core-packages.md)** (adapters / DI / `Scope` / `LIMIT_KEYS`). Per-subsystem docs defer the contract to those two rather than re-deriving it.

---

## 🗺️ Authoritative Maps

### **[core-architecture.md](core-architecture.md)** - Application Architecture

**Purpose**: Authoritative orientation map (#1 of 2) — a thin index of how the refactored package codebase fits together and where each subsystem lives, deferring all per-subsystem detail to the dedicated docs **When to use**:

- Understanding the real package split (admin-shell FE in `app/src/`, site-workspace FE in `packages/editor-ui/src/`, backend in `packages/builder-server/src/`, shared primitives in `packages/core/src/`, residual runtime in `src/`)
- Onboarding new developers and finding where a subsystem lives
- Tracing the DI assembly and scoped routers at a high level
- Locating which dedicated doc owns a given subsystem

**Key topics**: Workspace package layout & shells, `createEditorApp`/`setupBuilderServer`/`initDb` DI assembly, scoped routers, `req.scope`/`req.adapters`/write-guard, admin vs site shell routing, one-line index rows per subsystem (Projects, Pages, Menus, Media, Themes, Export, App Settings, Preview, Page Editor, Core Widgets, Collections), pointer to core-packages.md for adapter contracts and `LIMIT_KEYS`

---

### **[core-packages.md](core-packages.md)** - Packages & Adapter Architecture

**Purpose**: Authoritative adapter/package map (#2 of 2) — the five packages, the OSS/hosted adapter boundary, adapter contracts + `Scope` shape, `LIMIT_KEYS`/errors/conformance, DI assembly, editor-ui seams, render-engine scope-free boundary, and the `require-scope-arg` lint rule **When to use**:

- Understanding the five packages and the OSS/hosted boundary
- Working with the adapter contracts, `Scope` shape, `LIMIT_KEYS`, or error types
- Wiring or mounting the backend (`setupBuilderServer`, `createEditorApp`, `initDb`) or embedding the editor (`EditorProvider`, `createEditorRoutes`)
- Building a new adapter implementation against the conformance suites
- Tracing the render-engine scope-free boundary or the `require-scope-arg` lint rule

**Key topics**: Five packages, OSS/hosted boundary, adapter contracts (Storage/AssetStorage incl. `stat()` + download byte-range/Publish/Limits/ScopeResolver), `Scope`, `LIMIT_KEYS` (incl. `MAX_COLLECTION_ITEMS`/`MAX_COLLECTIONS`) + constants, error types + status codes, conformance suites, `projectScopedRouter` mounts (incl. `/collections`), editor-ui seams (apiBase/editorFetch, routeBase, EditorProvider/EditorShell, extension registry/hooks/slots, tailwind preset), render-engine deps bag, residual `src/` runtime assets, `require-scope-arg`

---

## 📚 Theme Development & Authoring

### **[theming.md](theming.md)** - Theme Development & Structure

**Purpose**: Canonical theme-authoring entry point — theme structure, `theme.json` manifest/global settings, `layout.liquid`, Liquid tags, widgets/blocks/templates/menus/assets/locales/presets, and advanced features, tightened to defer deep detail to the dedicated docs **When to use**:

- Building new themes from scratch
- Understanding theme structure and file organization
- Working with Liquid templates, tags, and global components (header/footer)
- Managing theme assets, CSS variables, and locales (i18n)
- Implementing scroll reveal animations

**Key topics**: Theme manifest, layout template, Liquid tags & filters (`rte_text`/`rte_blank`, richtext + `| raw`), widgets, blocks, global settings, menu rendering & collection-item link targets (`collectionItemUuid`/`collectionType`), asset management, scroll reveal animations, theme locales, pointers to theming-setting-types.md, theme-presets.md, and core-export.md

---

### **[theming-widgets.md](theming-widgets.md)** - Widget Authoring Guide

**Purpose**: Canonical theme-author widget-authoring guide — `widget.liquid` skeleton, JS isolation + editor lifecycle events, the enqueue asset system, schema conventions, standardized block types, accessibility, and an authoring checklist, slimmed so token tables live in arch-design-system.md and setting-type JSON in theming-setting-types.md **When to use**:

- Building new widgets from scratch (schema.json + widget.liquid)
- Adding JavaScript interactivity with editor lifecycle events
- Using the enqueue asset system
- Implementing standardized block types and following accessibility practices

**Key topics**: Widget structure, JS isolation & editor lifecycle events, enqueue asset system, schema conventions, standardized block types (heading/text/button), color-scheme inline-style pattern, accessibility, authoring checklist, cross-references to arch-design-system.md (design tokens) and theming-setting-types.md (setting JSON)

---

### **[theming-setting-types.md](theming-setting-types.md)** - Setting Types Reference

**Purpose**: Authoritative author-facing catalog of all theme/widget setting types with schema properties, JSON examples, and Liquid usage — now also the home for the shipped `file` setting type **When to use**:

- Defining settings in `theme.json` global configuration
- Creating widget schemas with proper setting types
- Understanding setting properties, CSS variable output, and i18n labels
- Looking up the `file` setting type or richtext/link options

**Key topics**: Setting types (color, text, range, select, date, gallery, table, icon, youtube, richtext, code, `file`, etc.), common properties, CSS variable generation, i18n label resolution (tTheme: keys), collection field flags (`usedAsTitle`/`usedAsDate`), richtext `allow_headings`/`allow_images`/`min_height`, link targets (`pageUuid`/`collectionType`/`collectionItemUuid`), icon `allow_patterns`, `rte_text`/`rte_blank`

---

### **[arch-design-system.md](arch-design-system.md)** - Arch Theme Design System

**Purpose**: Reference for the **Arch THEME's** CSS-custom-property design system — tokens, color schemes, typography, spacing, grid/carousel, component/block patterns, header/footer, body-class style settings, and the `theme.json` → `{% theme_settings %}` → `base.css` pipeline (renamed from `theme-design-system.md` to disambiguate from the editor-UI style guide) **When to use**:

- Understanding the Arch theme's design tokens and CSS variables
- Looking up spacing, typography, or color token values
- Working with the `.color-scheme-{standard|highlight}-{primary|secondary}` system
- Using layout containers, grids, carousels, and component/block classes
- Tracing the CSS variable pipeline from theme.json to rendered CSS

**Key topics**: Design tokens (`--space-*`/`--font-size-*` tables, single source), color-scheme classes, typography (Inter heading + body defaults), spacing scale (`spacing-airy` 1.2, `--section-padding-block` × `--spacing-scale`), layout containers, grid/carousel system, card/button/form/icon components, block system, header/footer globals, `--card-shadow` token, reveal animations, responsive breakpoints, widget inventory (56 page + 2 global), snippets inventory, CSS variable pipeline

---

## 🎨 Theme & Content Distribution

### **[core-themes.md](core-themes.md)** - Theme Management Interface

**Purpose**: The Themes management page (UI + CRUD routes) — list/upload/update/delete, sidebar update badge, theme locales/site-icon — with deep update/preset mechanics deferred to theme-updates.md and theme-presets.md **When to use**:

- Understanding theme upload, installation, and validation
- Working with theme preview cards and the update badge
- Implementing theme management UI
- Troubleshooting theme installation or deletion safeguards

**Key topics**: Theme display, admin-shell routing (`app/src/pages/Themes.jsx`), upload/validation, update badge, deletion safeguards, theme locale behavior, site-icon snippet, `resolvePresetPaths` return shape, locale route + `resolveActiveProject` middleware, note that `themeController` is intentionally path-based (not scope-first)

---

### **[theme-updates.md](theme-updates.md)** - Theme Update System

**Purpose**: Authoritative doc for the theme-update subsystem — seed/user-data split, partial/delta folders, `deleted/` removals, materialized `latest/` snapshot, `theme.json` settings merge, per-project `receiveThemeUpdates`, version validation, and the REST API surface **When to use**:

- Understanding how theme updates work and which files are updated vs. protected
- Publishing new theme versions
- Applying theme updates to projects
- Tracing the settings-merge behavior

**Key topics**: Version folders, partial/delta folders, `deleted/` removals, materialized `latest/` snapshot (5s source cache), settings merge, updatable paths (incl. `collection-types`; `collections/` item data protected), `receiveThemeUpdates`, version validation, REST API, note that update writes use direct fs-extra (not the scope-first storage adapter)

---

### **[theme-presets.md](theme-presets.md)** - Theme Presets

**Purpose**: Concise current-state conceptual overview of theme presets (what they are, the directory/registry/fallback model) that points to theme-preset-file-format.md (format), core-projects.md (creation flow), and theme-preset-process.md (authoring) **When to use**:

- Understanding what presets are and the directory/registry/fallback model
- Orienting before diving into preset file format or the authoring workflow
- Understanding settings overrides and the collections/media seeding dimension at a high level

**Key topics**: Preset concept, directory/registry/fallback model, settings overrides, collections/media seeding (one-line), pointers to theme-preset-file-format.md, core-projects.md, and theme-preset-process.md

---

### **[theme-preset-file-format.md](theme-preset-file-format.md)** - Preset File Format

**Purpose**: Structural reference for the JSON files that make up an Arch theme preset — `preset.json` overrides, page/header/footer/menu template shapes, link objects, color-scheme strings, the `presets.json` registry, and the runtime fields that must NOT appear in source **When to use**:

- Authoring or validating preset JSON files
- Understanding preset overrides and template shapes
- Working with link objects and color-scheme strings in presets
- Understanding which runtime fields to omit from source

**Key topics**: `preset.json` overrides, page/header/footer/menu template shapes, `collections/` + `media/` seeding directories, link objects (incl. `collectionItemUuid`/`collectionType` auto-remap like `pageUuid`), color-scheme strings, `presets.json` registry (`liveDemo`, `{default, presets:[...]}` envelope), no-gallery/table field types note, `rte_text`/`rte_blank` helpers, omit-runtime-fields rule

---

### **[theme-preset-process.md](theme-preset-process.md)** - Preset Production Workflow

**Purpose**: Step-by-step manual production workflow for producing a polished Arch preset, matched to the current bundled-preset-media pipeline (pack-once seeding rather than per-project manual upload) **When to use**:

- Producing a new polished Arch preset end to end
- Packing media into a preset once via the seeding pipeline
- Syncing themes/presets and setting up the `liveDemo` convention

**Key topics**: Pack-once media seeding (`themes/arch/presets/<id>/media/` + `manifest.json`, `projectController.seedPresetMedia`, `scripts/pack-preset-media.js`), `npm run theme:sync`/`preset:sync`, `liveDemo` URL convention, `default` key + blank preset, collections dimension, package-path code references

---

### **[theme-preset-generator.md](theme-preset-generator.md)** - Preset Generation Playbook

**Purpose**: Working authoring playbook for generating high-quality Arch presets — a 4-phase workflow plus color/spacing/typography/icon/image/differentiation rules — largely independent of the package refactor **When to use**:

- Generating a high-quality Arch preset from a brief
- Applying color/spacing/typography/icon/image rules
- Differentiating presets from one another

**Key topics**: 4-phase workflow, color/spacing/typography rules, icon & image guidance (flat hyphenated media names, no path separators), differentiation rules, image-variant generation (theme-overridable defaults)

---

## 🏛️ Core Subsystems

### **[core-projects.md](core-projects.md)** - Project Management System

**Purpose**: Project-management workflow — admin-shell Projects pages/forms, project create/duplicate/export/import/edit, theme-copy + preset application + link enrichment on creation, project-switch isolation, and the `/api/projects` route table **When to use**:

- Understanding the project lifecycle and creation flow
- Implementing project-related features
- Working with the project store/queries and active-project handling
- Troubleshooting project state or the scope-first resolver

**Key topics**: Project CRUD, admin-shell pages (`app/src/` ProjectsList/ProjectForm/ProjectImportModal), stores/queries in `packages/editor-ui/src/`, `apiFetch` + `X-Project-Id` from `getActiveProjectId()`, theme-copy + preset application + link enrichment on creation, scope-first resolver (`req.scope` via `req.adapters.scopeResolver`), ZIP import/export, `siteTitle`, `/api/projects` route table

---

### **[core-project-id-architecture.md](core-project-id-architecture.md)** - Project Identity System

**Purpose**: The durable UUID-vs-folderName project identity model — stable UUID for API/metadata vs mutable filesystem folderName, rename = directory move + metadata update, export naming — reframed around the scope-first model **When to use**:

- Understanding how projects are identified and stored
- Implementing project renaming logic
- Working with filesystem paths vs API IDs
- Troubleshooting "project not found" errors

**Key topics**: UUID vs folderName, scope-first handlers (`req.scope` + injected adapters), rename = directory move + metadata update, still-path-based exceptions (`theme.json` via `getProjectThemeJsonPath`, some legacy page reads), OSS active-project routes vs host-mounted project-id editor routes, pointer to core-packages.md for the Scope/adapter contract

---

### **[core-pages.md](core-pages.md)** - Page Management System

**Purpose**: End-to-end page CRUD — page JSON model/storage, Pages list/forms/bulk UI, client API wrapper, Express routes + controller (create/read/update/delete/duplicate/bulk-delete/savePageContent), UUID preservation, slug uniqueness, media-usage sync, and deleted-page cleanup **When to use**:

- Understanding page data structure and storage
- Implementing page CRUD and bulk operations
- Working with slugs, UUID preservation, and media-usage sync
- Troubleshooting page limits or slug conflicts

**Key topics**: Page JSON structure, scope-first storage (`req.scope` + `req.adapters.storage`; fs-extra only in legacy render/export helpers), Pages list/forms/bulk UI, `generateUniqueSlug` (`(Copy)` name), `MAX_WIDGETS_PER_PAGE` 422 cap, 409 explicit-slug-conflict, bulkDelete 207/400 semantics, pointer to core-hooks.md for `usePageSelection`

---

### **[core-menus.md](core-menus.md)** - Navigation Menu System

**Purpose**: Menu-management subsystem — per-project menu JSON storage, `pageUuid`/`collectionItemUuid` link-resolution lifecycle, React menu editor pages/components, client API helper, and Express routes/controller CRUD + duplicate **When to use**:

- Building navigation systems
- Understanding the menu data model and link targets
- Implementing menu editing interfaces
- Working with menu depth/item caps and render-time link resolution

**Key topics**: Menu JSON (top-level `uuid`, `item_<uuid>` ids, `pageUuid` + `collectionItemUuid`/`collectionType` link targets), editor pages/components in `packages/editor-ui/src/`, scope-first StorageAdapter path (`getMenuById` is the fs-extra render holdover), `MAX_MENU_DEPTH=32`/`MAX_MENU_ITEMS` caps + 422 over-cap, render-time resolution (`render-engine/menuResolver.js`), `linkEnrichment.js` clone/delete cleanup

---

### **[core-collections.md](core-collections.md)** - Collections (CMS) System

**Purpose**: The collections subsystem — theme-owned collection-type schemas, scope-first item CRUD/storage, the `| collection` Liquid filter, item-page rendering with depth prefixing, limits, and sanitization **When to use**:

- Authoring or understanding collection-type schemas (fields, `slugPrefix`, `hasItemPages`, `usedAsTitle`/`usedAsDate`)
- Working with the scope-first `collectionService` and collection routes
- Using the `| collection` Liquid filter in templates
- Understanding item-page depth prefixing, SEO, and export output

**Key topics**: Collection-type schemas, item record shape & lifecycle, storage keys (`collection-types/`, `collections/`), scope-first service API, routes (`:collectionType`/`:itemSlug`) & isolation, `| collection` filter, item-page depth prefixing (`outputPathPrefix`/`prefixInternalHref`), per-item SEO (`robots: index,follow` default), `MAX_COLLECTION_ITEMS`/`MAX_COLLECTIONS`, duplicate-uuid recovery, `_archived`/invalid normalization, `mediaBasePaths` richtext-media resolution, item preview

---

### **[core-page-editor.md](core-page-editor.md)** - Visual Page Editor

**Purpose**: Architecture and behavior of the visual Page Editor in editor-ui — component structure, Zustand store data flow, load/edit/preview/save/undo-redo, the postMessage preview protocol, navigation guard, and global-widget editing **When to use**:

- Understanding the page editor architecture
- Working with editor components and the Zustand store
- Implementing editor features (preview, save, undo/redo)
- Troubleshooting the preview protocol or navigation guard

**Key topics**: Editor components, Zustand store data flow, load/edit/preview/save/undo-redo, postMessage preview protocol (`packages/editor-ui/src/queries/previewManager.js`, `src/utils/previewRuntime.js` residual), navigation guard (`packages/editor-ui/src/hooks/useNavigationGuard.js`), global-widget editing, pointer to core-hooks.md

---

### **[core-media.md](core-media.md)** - Media Library System

**Purpose**: Canonical Media Library reference — per-project storage/resizing, the SQLite metadata model, usage tracking, audio/range streaming, the Media page + hooks, and the media controller/routes/usage service — now also absorbing the shipped file-assets library/usage facts **When to use**:

- Implementing file upload (images, files/PDF, audio) functionality
- Understanding media storage, resizing, and metadata
- Working with usage tracking and deletion protection
- Troubleshooting upload size limits or streaming

**Key topics**: Per-project storage/resizing, SQLite metadata, projectScopedRouter media routes (`'/'`, `'/:fileId'`, `'/bulk-delete'`, `'/refresh-usage'`, `'/:fileId/usage'` via `X-Project-Id`; `uploadWithLimit` middleware), `MEDIA_ACCEPT`/`NON_IMAGE_ACCEPT`, `getMediaCategory` (PDF → `uploads/files/`), audio byte-range (HTTP 206) streaming, usage tracking (pages/global/site settings/og_image/embedded-richtext/collection items, recursive scan), decompression-bomb guards, two-gate size enforcement, deletion protection, Copy URL

---

### **[core-export.md](core-export.md)** - Static Site Export & Version Management

**Purpose**: The site-export pipeline — editor-ui export UI, server-side static-HTML generation (versioning/render/SEO/formatting/validation/asset copying/history), the export-management API, and scope-bound filesystem-backed serving — now also owning the file-asset export path **When to use**:

- Understanding the export process and version management
- Working with static site generation and validation ordering
- Implementing export functionality and history tracking
- Troubleshooting export issues

**Key topics**: `exportProjectToDir()` core with fail-fast validation-before-write, scope-resolved endpoints (`X-Project-Id`, no `:projectId` in path), versioning/history (`sizeBytes`/`hasIssuesReport`/`developerMode`, `cleanupProjectExports`, failed-export recording), `renderingService` split (render-engine + builder-server), collection item-page export + two-pass validation, forms manifest + `manifest.collections`, markdown alternate link, file-asset export (`assets/files/`, `/uploads/files/` rewrite, `filePath` var), `collectionDeps` adapter threading, ZIP downloads, site icons

---

### **[core-widgets.md](core-widgets.md)** - Core Widgets System

**Purpose**: The built-in `core-` widgets library — purpose, file layout, schema metadata (`isCore`/`category`), the `useCoreWidgets` opt-out, and the scope/adapter-resolved load/render flow **When to use**:

- Understanding which widgets are always available
- Learning how themes opt out via `useCoreWidgets`
- Adding new core widgets to the platform

**Key topics**: Spacer, Divider (core-form deferred to core-form-widget.md), `packages/core/src/widgets/` + `CORE_WIDGETS_DIR` resolution, `isCore`/`category` schema metadata, `useCoreWidgets` opt-out, `GET /api/widgets` load flow (`getProjectWidgets`/`getCoreWidgets`), render path `deps.coreWidgetsDir/<type>/widget.liquid`, `hasPreview`, asar read-only behavior

---

### **[core-form-widget.md](core-form-widget.md)** - Form Widget & Forms Manifest

**Purpose**: The `core-form` contact/inquiry widget plus the export-time `widgetizer.forms.json` manifest it pairs with for the Widgetizer Hosted forms service **When to use**:

- Understanding the markup contract the hosted Worker recognises (`data-widgetizer-form`, honeypot, Turnstile placeholder, status element)
- Configuring form widgets (fields, choices, consent, info/social sidebar blocks)
- Understanding how form/field/option identifiers are auto-derived from labels at export time
- Troubleshooting export-time form validation errors

**Key topics**: Form widget settings/blocks, derived identifier model (handleize), honeypot & Turnstile contract, manifest emitter (`buildFormsManifest`), per-site/field/option limits, export pipeline wiring, layout recipes

---

## 🗄️ Data & Persistence

### **[core-database.md](core-database.md)** - Database & Storage Architecture

**Purpose**: Focused hybrid-persistence reference — the SQLite metadata vs filesystem content boundary, DB init/pragmas/DI connection, schema tables + migration history, and the repository layer **When to use**:

- Understanding where data is stored now
- Tracing migrations and the DB/filesystem boundary
- Planning changes to repositories or persisted metadata
- Wiring the DB connection via DI

**Key topics**: Tables and relationships, 4-migration history (`owner_id`, `caption`, backfill, `_migrations` tracking), Connection & DI (`initDb({ getConnection })` vs `getDb()` fallback, pragmas), repository pattern, scope-first/adapter-agnostic framing, DB vs filesystem boundaries (incl. `collections/<type>/<slug>.json`), pointers to core-packages.md and core-export.md

---

## ⚙️ Configuration & Cross-Cutting

### **[core-appSettings.md](core-appSettings.md)** - Global Application Settings

**Purpose**: The App Settings page (global config: general/media/export/developer) and its schema-driven UI + server-side enforcement — a thin orientation that defers image-size/export-version detail to core-media/core-export and the scope contract to core-packages **When to use**:

- Managing global application settings
- Understanding server-side setting enforcement
- Implementing setting validation and schema defaults

**Key topics**: Schema-driven UI (`AppSettings.jsx`/`AppSettingsPanel.jsx` in `app/src/`, `useAppSettings.js` + `appSettings.schema.json` in `packages/editor-ui/src/`), active-project-scoped upload (`POST '/'`, `X-Project-Id`/`req.scope`), two-stage enforcement (multer limits-adapter cap + controller `getSetting` comparison), `useGuardedFormPage`, schema defaults (maxFileSizeMB 50, quality 85), pointers to core-media.md/core-export.md/core-packages.md

---

### **[core-hooks.md](core-hooks.md)** - Custom React Hooks

**Purpose**: Index of editor-ui custom React hooks (confirmation modal, navigation guards, selection, media management, export state, app settings, date formatting, theme locale, link targets) — APIs + where used, with subsystem-deep hooks demoted to one-line pointers **When to use**:

- Understanding confirmation-modal and navigation-guard patterns
- Implementing selection state or guarded form pages
- Working with link-target and theme-locale hooks
- Finding which hook a subsystem uses

**Key topics**: `useConfirmationModal`/`useConfirmationAction`, `useNavigationGuard`/`useFormNavigationGuard(hasUnsavedChanges, skipRef)`/`useGuardedFormPage`, `usePageSelection`, `useLinkTargets` (collection-item uuid targets), `useDeleteKeyShortcut`, `useStickyActionBar`, media/export/app-settings hooks (pointers), `useThemeLocale` (developer-mode cache invalidation), `useFormatDate`; all under `packages/editor-ui/src/hooks/*`

---

### **[core-security.md](core-security.md)** - Platform Security

**Purpose**: Single security reference — input validation/sanitization, helmet/CORS, SVG sanitization, error handling, advanced-theme raw-code injection, upload limits, import/export path-traversal, preview isolation, the cross-tenant contract, and link/URL safety **When to use**:

- Understanding the server's security layers
- Reviewing protection against common vulnerabilities
- Configuring the application for a production environment
- Tracing the cross-tenant isolation floor

**Key topics**: Input validation, two-tier (2mb/10mb) JSON body parser, HTTP security headers/helmet, CORS, SVG sanitization (incl. tenant), global error handling, gallery/table setting-type sanitizers, richtext `allow_headings`/`allow_images` opt-in tag sets + path-validated `<img>`, `rte_text`/`rte_blank` filters, `collectionItemUuid` link enrichment, Project-Switch Isolation + write-guard, cross-tenant contract (cites core-packages.md for Scope/`LIMIT_KEYS`), Link & URL safety (`sanitizeHref`/`safe_url`, image-path allowlist), `createEditorApp({ adapters })` entry point

---

### **[core-ux.md](core-ux.md)** - Core UX Patterns

**Purpose**: Thin cross-cutting UX-principles doc — toasts, confirmation modals, navigation guards, redirect/go-with-the-flow conventions, and the bulk-delete pattern — with per-domain enumerations replaced by pointers to the dedicated docs **When to use**:

- Understanding standard user flows and feedback conventions
- Implementing consistent toasts, redirects, and confirmation modals
- Applying the bulk-delete pattern

**Key topics**: Toast notifications, confirmation modals (themes use in-app `ConfirmationModal`; in-use guard is a disabled menu item, 409 fallback), navigation guards, redirect/go-with-the-flow conventions, bulk-delete pattern, scope-first/adapter-injected + quota/`LIMIT_KEYS` shaping note, pointers to the per-domain core-* docs

---

### **[core-editor-ui-style-guide.md](core-editor-ui-style-guide.md)** - Editor/Admin App Style Guide

**Purpose**: Standalone visual style guide for the **ADMIN/EDITOR app chrome** (pink accent + slate neutrals, typography, spacing, Tailwind/HTML snippets for buttons/inputs/tables/cards/badges/toasts/modals/sidebar/layout) — renamed from `core-design-system.md` to disambiguate from the Arch theme design system **When to use**:

- Building or styling editor/admin UI chrome (not theme output)
- Looking up the pink-accent + slate palette, typography, or spacing
- Reusing Tailwind/HTML snippets for buttons/inputs/tables/cards/badges/toasts/modals/sidebar
- Finding the in-repo implementation of the style system

**Key topics**: Pink accent + slate neutrals, typography, spacing, snippet catalogue (buttons/inputs/tables/cards/badges/toasts/modals/sidebar/layout), sidebar width (`--sidebar-width` 14rem/w-56), Tailwind ^4.1.x, Implementation-in-this-repo (`packages/editor-ui/src/styles/preset.css`, `app/src/index.css`, `packages/editor-ui/src/components/ui/Button.jsx`, page-editor narrow-sidebar overrides)

---

## 💻 Desktop Builds

### **[core-electron.md](core-electron.md)** - Electron Desktop App

**Purpose**: Electron-runtime-specific guide — preview window, error handling, runtime data paths, the `utilityProcess`/dynamic-port server model, and local Windows update testing — with release/auto-update and asar-bundling detail cross-linked to CLAUDE.md and core-packages.md **When to use**:

- Running Electron in development mode
- Building production distributions for macOS and Windows
- Understanding runtime paths, the dynamic-port server model, and packaging
- Code signing and distribution

**Key topics**: Preview window, error handling, runtime data paths, `utilityProcess` dynamic-port server (`{ type: "server-ready", port }`), `electron/builder.config.mjs` (mac block; package.json has no build key), Windows NSIS `Widgetizer-Setup-x.x.x.exe`, dev port 3000, `scripts/build-electron.mjs` build entry + `server-bootstrap.js`, FE citations (`UpdateBanner` in `app/src/`, Layout/ErrorBoundary in `packages/editor-ui`), cross-links to CLAUDE.md (release/auto-update) and core-packages.md (asar bundling)

---

## 🚪 Conceptual & Future

### **[project-overview.md](project-overview.md)** - What Is Widgetizer

**Purpose**: High-level conceptual "what is Widgetizer" front door (hybrid storage, portability, end-user concepts, Create/Build/Export) — intentionally code-path-free **When to use**:

- Getting a high-level mental model of the product
- Explaining Widgetizer to a non-developer audience
- Understanding the end-user Create/Build/Export flow

**Key topics**: Hybrid storage, portability, end-user concepts (Pages, Widgets, Media — images/files/audio, Menus, Collections), theme presets, Create/Build/Export flow

---

### **[future-mcp.md](future-mcp.md)** - Future: Widgetizer MCP Server

**Purpose**: Proposal and rationale for a local MCP (Model Context Protocol) server that lets MCP-compatible LLM clients drive Widgetizer through its existing local API and documented schema rules **When to use**:

- Evaluating the case for a Widgetizer MCP server
- Understanding the proposed MCP-tool ↔ REST-API mapping and resource model
- Planning LLM-driven site scaffolding use cases

**Key topics**: docs-llms as proof of concept, REST-API → MCP-tool mapping, self-describing widget schemas as MCP resources, local-first architecture, tool-agnostic reach, use cases (site scaffolding from a prompt)

---

## ✅ Project Tracking

- **[TODO.md](TODO.md)** — Living task/issue tracker for in-flight work; not a reference doc.
- **[user-test-checklist.md](user-test-checklist.md)** — Standalone manual user-test checklist (no codebase knowledge assumed): IDs/actions/expected results, test pack/setup, and run waves for confirming create/edit/preview/export/backup/import/update/delete flows.

---

## 🎯 Quick Reference by Role

### **Theme Developers**

Primary docs: `theming.md`, `theming-widgets.md`, `theming-setting-types.md`, `arch-design-system.md`, `theme-updates.md`, `theme-presets.md` Secondary: `theme-preset-file-format.md`, `theme-preset-process.md`, `theme-preset-generator.md`, `core-export.md`, `core-menus.md`, `core-collections.md`

### **Frontend Developers**

Primary docs: `core-page-editor.md`, `core-projects.md`, `core-pages.md`, `core-editor-ui-style-guide.md` Secondary: `core-media.md`, `core-appSettings.md`, `core-hooks.md`, `core-form-widget.md`

### **Backend Developers**

Primary docs: `core-packages.md`, `core-database.md`, `core-export.md`, `core-media.md`, `core-projects.md` Secondary: `core-pages.md`, `core-menus.md`, `core-collections.md`, `core-appSettings.md`, `core-security.md`

### **System Architects**

Primary docs: `core-architecture.md`, `core-packages.md`, `core-security.md` Secondary: All other documents for comprehensive understanding

### **Content Managers / End-Users**

Primary docs: `project-overview.md`, `core-themes.md`, `core-page-editor.md` Secondary: `core-media.md`, `core-menus.md`, `core-collections.md`, `user-test-checklist.md`

---

## 📖 Documentation Standards

1. **Structure** – Each document includes overview, implementation details, and workflows.
2. **Code Examples** – Practical examples with proper syntax highlighting.
3. **API References** – Complete endpoint documentation with parameters.
4. **File Paths** – Exact file locations for reference (package paths post-refactor).
5. **Cross-References** – Links to related docs where applicable.

When adding new features, always update the relevant documentation **and** this index.

---

## 🗄️ Archived / Historical

These docs describe completed work or superseded designs. They are kept for history and are not part of the current reference set.

- **[archive/core-file-assets.md](archive/core-file-assets.md)** — Original file-assets architecture/decisions proposal. Its durable facts now live in core-media.md (library/usage), core-export.md (export path), and theming-setting-types.md (the `file` setting type).
- **[archive/branch-experimentation-findings.md](archive/branch-experimentation-findings.md)** — Closed port-audit + remediation log from the experimentation branch; valuable as history, misleading as current-state.
- **[archive/theme-presets-tracker.md](archive/theme-presets-tracker.md)** — Completed theme-presets implementation tracker (all rows done).
