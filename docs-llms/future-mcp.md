# Future: Widgetizer MCP Integration

> **Status: Design decided — not implemented.** All eight design steps are agreed. The few remaining open items are listed under **Next**. The previous proposal (HTTP calls to a fixed `localhost:3001`, a long low-level tool list) no longer matches the architecture and was replaced; it is readable in git history.

---

## Goal

Let non-technical Widgetizer users build and edit their sites by chatting with an AI assistant. Claude Desktop and Codex are the primary targets, but any MCP-compatible assistant must be able to connect, even if that takes a manual step. The assistant works on the user's sites through the running Widgetizer app.

### Direction already agreed

- **A new workspace package** (`packages/mcp`, alongside the existing packages).
- **A bridge to the running app, not direct storage access.** The `mcp` branch prototype opened the SQLite database and project files itself. That bypasses the app's validation, sanitisation and services, duplicates backend logic (e.g. widget discovery), and leaves an open editor unaware of the changes. The new design goes through the running app, so every write follows the same rules as the editor and the editor can reflect it.
- **No manual setup for users.** Users never edit config files, open a terminal or see ports. The packaged app binds an OS-assigned port (`PORT=0`), so how the bridge finds the app is part of the connection design (step 2).

---

## Step 1 — User journeys (Decided)

The first version covers all of these:

| Journey | Example request |
|---|---|
| New site from a description | "I run a bakery called Crumbly, make me a website." |
| Edit an existing site | "Open my bakery site and…" |
| Rewrite content | "Rewrite my About page to sound friendlier." |
| Add, change or remove sections | "Add a testimonials section under the hero." |
| Change the look | "Warmer colours, a more elegant heading font." |
| Header, footer and menu | "Add a Contact link to the menu." |
| Business details | "Update our opening hours and phone number." |
| Images from the media library, and the logo | "Use the croissant photo in the hero." |
| Collections | "Add a news post about our summer opening." |
| Translate | "Make a Greek version of the site." |
| SEO basics | "Write titles and descriptions for all my pages." |
| Review and advise (read-only) | "Anything missing before I publish?" |
| Export the site files | "Export the site so I can upload it." |
| Undo the assistant's changes | "Undo what you just did." |

**Should-have (soon after):** import photos from a local folder the user picks.

**Out of scope:** publishing online (hosting/deployment), theme and widget authoring, switching an existing site's theme (themes are chosen at creation), anything outside Widgetizer (domains, email).

### Constraints that came with the journeys

- **Promise only what the theme offers.** Available widgets, blocks, settings and collection types depend on the site's theme. "Add testimonials" has to discover whether the theme does that with blocks or with collection items. New sites start from a theme preset.
- **Business details are real data.** Hours, address, phone and logo update the project's site identity (see `core-projects.md`, Site Identity and Business Details), not text typed into a footer.
- **Never invent facts.** The assistant must not make up business facts, prices or customer testimonials. Where it needs them it asks, or uses clearly marked placeholders.
- **Honest review.** Reading content cannot judge visual or mobile quality, or whether a form works. Review either uses a rendered preview or says what it couldn't check.
- **Undo needs designing.** The editor's undo history covers only edits made in the editor and clears when a page loads. The assistant's changes (often across several pages) are not covered today. See step 3.
- **Language-aware throughout.** Every journey acts on a specific site language, not just the default.

---

## Step 2 — Setup and connection (Decided)

### Any assistant, one shared bridge

- The bridge (the MCP server in `packages/mcp`) is assistant-neutral: one implementation for every MCP client, with no Claude-specific behaviour. Its tool descriptions and guidance are written for any assistant.
- Claude Desktop's desktop extension (`.mcpb`) and any later plugins are only packaging around that same bridge (step 8).
- Widgetizer gets a **"Connect an AI assistant"** screen:
  - **Claude Desktop:** the Connect button opens Widgetizer's `.mcpb` file, which hands it to Claude Desktop's own install screen (review, permissions, Install). If that handoff fails (file associations, installation or organisation policy), Widgetizer shows the file and explains the drag-and-drop and **Settings → Extensions** alternatives. If Claude Desktop isn't installed, say so and link to its download.
  - **Codex:** guided setup. Widgetizer shows the exact values to enter in Codex's own settings screen (the ChatGPT desktop app's **Settings → MCP servers → Add server → STDIO**: command and arguments), or one `codex mcp add` command for CLI users. Widgetizer configuring it automatically is a possible later improvement.
  - **Other MCP assistants:** generic copy-paste connection details plus a help page.
  - The screen shows "Connected" **only after a real, authenticated bridge connection**, not merely because a file was opened or a config was shown. It names the surfaces actually verified (e.g. Claude desktop chat).
- Result quality depends on the assistant; weaker models may follow the guidance less well. That's outside our control and not a reason to fork the bridge.

### Finding the running app

- The packaged app binds an OS-assigned port on `127.0.0.1` (`PORT=0`), so the address changes every launch.
- On startup Widgetizer writes a small **connection file** in its own data folder: the current address and a secret token. The bridge reads it on each connection attempt and never caches a stale address.
- The file is removed (or marked stale) on shutdown. The bridge also handles a leftover file from a crash: the address doesn't answer, so it's treated as "not running".

### Secret token

- The backend accepts connections only from the same computer, but today any local program can call it. Because we are deliberately inviting an outside program in, bridge requests must carry the token from the connection file. Requests without it are refused.
- How this coexists with the editor's own requests (which don't use the token today) is an implementation detail for later. The token must protect the paths the bridge uses without breaking the editor.

### When Widgetizer is closed

- The bridge **never launches Widgetizer itself**: for non-technical users an app opening on its own looks alarming. The assistant gets a clear message to relay, along the lines of "Widgetizer isn't open — please open it and I'll carry on."

### Which Widgetizer versions

- **First release:** the desktop app and the self-run web version. The web version can write the same connection file, so it costs little extra.
- **Widgetizer Hosted (later):** designed for now, built later. There is no local connection file; users connect their assistant to their online account by signing in, as with any online service. The available actions stay the same; only the connection and sign-in differ. Nothing in the bridge's actions may assume local files or a single user.

---

## Step 3 — Safety and trust (Decided)

All rules below are **enforced by Widgetizer**, not just written into the assistant's instructions. A careless or weaker assistant must not be able to bypass them.

### Three kinds of action

- **Look** (read sites, pages, settings, media, collections): always allowed. This includes **listing all sites**, which "edit an existing site" needs.
- **Change** (text, sections, colours/fonts, menus, business details, SEO, collection items, translations): allowed, because the job can be undone.
- **Remove or replace a lot**: deleting a page, collection item or media file; removing a language; replacing a whole menu or the header/footer; rewriting many pages in one job; exporting. Widgetizer refuses these until the user has approved the exact plan **in Widgetizer's own Allow/Cancel prompt** (see step 5, "Confirm-first actions"). Approval through the assistant alone doesn't count. The confirmation is tied to that specific plan and to the site as it stood when the plan was made. Impact is counted across the whole job, so many small calls can't add up to an unconfirmed large change.
- **Deleting a whole site is impossible** through the assistant.

### Jobs

- A **job** is one bounded user request ("redo my About page"). Widgetizer issues it an ID and records its site, its language(s) and a short summary. It has an explicit finish or abort.
- **One job at a time per site.** Each job is pinned to one site and an explicit language scope. If the user switches site mid-job, the job stops.
- Today's editor saves (page, globals and theme settings saved in parallel) are not one all-or-nothing site transaction. A job needs recovery information that survives a partial failure or a dropped connection.

### Undo (snapshots)

- A snapshot of the site is taken **immediately before a job's first change**, not while the assistant is only reading or discussing.
- The snapshot covers the **whole logical site**, preserving all IDs:
  - project details, business identity and language setup
  - theme settings
  - pages and their SEO, header/footer, and menus
  - collection items, their order and their translation links
  - media metadata and descriptions, and media usage

  That holds **across all languages**. It must be a consistent picture of both the files and the site's database rows, not a copy of the whole shared database.
- **Images:** if a later change deletes a file, undo must bring it back, and media usage is reconciled after a restore (see "Snapshot storage" below).
- History is limited by **disk space as well as by count**: keep the last several jobs.

#### Snapshot storage: copy content, hold images

- **Sizes measured on real local projects:**
  - the largest project has about **1.8 MB** of site content (pages, menus, collections) against about **94 MB** of uploads
  - typical projects have **0.1–0.2 MB** of content
  - Arch's `theme.json` is about **15 KB**
  - the remaining ~18 MB per project is copied theme files, which jobs never change and which are not snapshotted

  Ten full snapshots of the largest site are about 18 MB. **Disk space is not a real concern**; the only meaningful growth is retained deleted media.
- **Content is copied in full** per snapshot: content files, theme settings, and the site's database rows. To keep capture and restore fast, pack each snapshot as one archive plus a manifest, not thousands of loose files, and measure snapshot and restore time on large collections. Incremental snapshots can come later if needed.
- **Media binaries are never copied.** A snapshot records every asset in the site's media library at that moment: unused uploads too, and every recorded resized copy, not just images that appear on pages. Otherwise a restore could bring back library entries whose files are gone.
- **Hold, don't delete.** When a file is deleted or replaced, it moves to retention instead of being erased, as long as any kept snapshot needs it. This covers every deletion path, including the user deleting media in the editor outside a job. Otherwise undoing an earlier job breaks.
  - A replacement that reuses a filename must still keep the old bytes. Retained assets are immutable versions, not identified by path alone.
  - Make it crash-safe: record the retention before removing the live file. Purge only when nothing needs the file: not the live library, not a kept snapshot, not a running job.
  - Undo also removes or reconciles assets the job *added*.
- **The disk cap is a target, not a hard limit.** For example, 200 MB per site, counting retained files and temporary space, with the oldest snapshots pruned first. A single job that deletes a large media library can exceed it on its own. Widgetizer therefore **always keeps at least the most recent snapshot**, and never prunes a running job's recovery point. If a job's recovery state can't fit at all, refuse the job rather than run it without undo.
- **Theme updates end undo for earlier jobs.** Snapshots skip theme files, and restoring an old `theme.json` onto newer theme files could break the site. Each snapshot records the theme version, and a theme update disables undo for jobs made before it.
- **Storage-neutral.** "Holding area" is a concept, not "move a file into a folder". Local storage can move files; Hosted's cloud storage may keep immutable object versions and clean up later. The asset storage contract needs explicit retention support, and the bridge must not assume filesystem rename behaviour.
- **First version: undo works only if nothing has changed since the job finished.** If the user has edited by hand since, Widgetizer explains why it can't undo instead of wiping their later work. Selective undo (keeping later edits) would need a change log plus conflict checks; that is a later improvement.
- Two ways to undo: ask the assistant ("undo what you just did"), or use an **"Undo assistant changes"** button in Widgetizer. The user shouldn't need the assistant to fix its own mistakes.
- After a restore, the editor reloads its state and clears its own undo history. That history is separate from job undo and would otherwise be out of step.
- **Creating a site:** "make me a new site" authorises creating and opening it. Undoing that job returns the site to its starting preset; it doesn't delete it, consistent with the no-site-deletion rule.

### Which site

- The assistant works **only on the site currently open in Widgetizer**. It may list all sites, but switching happens only when the user asks, and Widgetizer visibly switches so the user always sees where the work happens.
- The existing active-project mismatch guard only checks IDs a request supplies. Job pinning (above) is what guarantees the site can't change underneath a job.

### The user and the assistant at the same time

- A job **starts only when nothing in the site is unsaved**, anywhere: pages, header/footer, theme settings, menus, collection forms and project details, not just the page being changed. Otherwise the assistant tells the user to save or discard first.
- **While a job runs, the site is locked for editing** in Widgetizer, with a clear "Assistant is working…" message (usually seconds). No fresh edits or saves can race the job.

### Exports

- Exports are versioned, but Widgetizer keeps only the last *N* (a setting, default 10) and deletes the oldest automatically. The assistant must mention when an export will remove an older one, and treats exporting as a confirm-first action.
- Exports and export history are **outside job undo**. Undo never implies it can take back files already exported or downloaded.

---

## Step 4 — Seeing changes live (Decided)

Today the editor has no live-update channel: it loads data only when the user navigates and never learns about changes made elsewhere. This step adds one.

### Notifications

- **One app-owned event contract** shared by desktop, web and Hosted, not something Electron-specific. One-way server-to-editor events (e.g. Server-Sent Events) are a reasonable starting transport; Stop and other actions stay ordinary requests.
- Events are scoped to the site (and, in Hosted, to the user) and carry the job ID and a site revision. After a reconnect, the editor refetches the authoritative job and site state instead of trusting missed events.
- The backend notifies after each **coherent saved step** (e.g. "About page done"), not after every field write, plus one **final full refresh** when the job ends.
- The editor refreshes everything affected, not just the page JSON. A menu or collection change can alter the current preview without touching that page, and the media library has a cache that must be invalidated. The media library, collection lists, menus and settings screens all refresh.
- Live refreshes may simply reload the affected data. Clearing the editor's own undo history is acceptable: users understand someone else is editing on their behalf, and undoing the assistant's work is handled by job undo (step 3). Fresh server state is applied as a clean baseline and must not trigger an autosave. Where cheap, reuse the preview's existing content-morphing reload to avoid a full flash.

### During a job

- A **top banner**: "Assistant is updating your site…" plus the current activity (e.g. "Rewriting the About page"). It shows "step X of Y" only when the total is actually known, and has a **Stop** button.
- The **lock** (step 3) covers every open Widgetizer window or tab, and backend writes too, not just the window showing the banner. Windows that reconnect learn about the lock before re-enabling editing. Unsaved edits are never discarded to get past a navigation guard.

### Stop

- **Stop means stop and undo the whole job:** refuse further writes, let in-flight work settle, restore the snapshot, refresh, then unlock. The banner shows "Stopping…" meanwhile.
- If the restore fails, Widgetizer reports a recovery state plainly rather than claiming the job was cancelled. Exported or downloaded files stay outside this promise.

### When a job finishes

- **Widgetizer writes the completion message** from what actually happened, not from the assistant's chat summary. The same structured record goes back to the assistant, and it stays available if the chat disconnects. It lists:
  - **what changed** (each page, menu, setting, collection item)
  - **warnings**
  - **what the user needs to do next** (e.g. "Replace the 3 placeholder photos", "Check the opening hours", "Your phone number is missing from the footer")

  Verified facts and the assistant's suggestions are shown separately. The message offers **Undo**.
- **Navigation, once, at the end** (never during the job):
  - **One page changed:** go to that page, in the language the job worked in.
  - **Several pages changed:** go to the most important one: the page the user named in their request, otherwise the first in the site's page order. The message lists the other changed pages as links.
  - **New site created:** go to its home page.
  - **Only site-wide changes** (colours, fonts, menu, header/footer): stay on the current page.
  - Switching to another site during a job stops it (step 3). The stop message appears where the user now is, and never switches them back.
- Changed sections are briefly highlighted once the preview is ready.

---

## Step 5 — The actions the assistant gets (Decided)

### Principles

- **A small number of broad action families**, explicit enough for Widgetizer to validate reliably. No generic "do anything" action.
- **Structured, not raw.** The assistant never sees filesystem paths or whole internal documents, but it does not edit by prose either. Reads expose stable IDs, current values and the permitted options. Edits submit typed operations against those IDs, and errors are field-specific and fixable ("`layout` must be one of: grid, list").
- **Widgetizer validates every write** against the theme's real schemas (setting keys and types, select options, ranges, block types, `maxBlocks`, link shape, fonts) before saving.
- **Results report actual effects:** every affected page and language, including side effects such as reference clean-up or collection listings that change.
- **New orchestration over existing capabilities.** Most underlying operations exist as routes and controllers today. Atomic batches of section operations, full schema validation, readable inspection, the job lifecycle and screenshots are new work.

### Looking (always allowed)

| Action | What it returns |
|---|---|
| List sites | All sites, and which one is open |
| Site overview | Pages, menus, languages, theme, business details, unsaved state |
| Read a page | Its sections and blocks, with IDs and current values, in readable form |
| Read header/footer, menus, look | Current header/footer sections, menu items, theme settings (colours, fonts, style) |
| What the theme offers | Section types with their options, collection types, and presets with their guidance file |
| Browse media | Library items with IDs, descriptions and usage |
| Read collections | Items per collection type, in order |
| Preview a page | Rendered text (headings, links, content, errors) **and** desktop + mobile screenshots |

**Preview:** rendered text is close to free (preview routes already render HTML, including collection item pages). **Screenshots are in the first version** and are new app-side work: Widgetizer captures and returns the images itself, because a localhost link won't open in every assistant. Neither output proves an interactive form works, so review says so (step 1).

### Working (the job lifecycle, step 3)

- **Start a job** (one-line summary, language scope)
- **Job status and result**, so the assistant can recover after a disconnect
- **Stop / abort**, the same operation as the banner's Stop button (step 4)
- **Finish a job**, which returns Widgetizer's completion record
- **Undo the last job**
- **Open another site**, only when the user asks (step 3)

### Changing (inside a job)

| Family | Covers |
|---|---|
| Create a site | From a theme + preset. Needs a special start-up path: there is nothing to snapshot until scaffolding finishes, so undoing it returns the site to its initial preset state (step 3). |
| Pages | Create, rename, title and SEO, duplicate. Delete is confirm-first. |
| Edit sections | One action with an explicit target (a page, the header or the footer): add, change, reorder or remove sections and their blocks, in one batch. Header/footer keep their own structural restrictions. |
| Menus | Edit items and structure. Replacing a whole menu is confirm-first. |
| Look | Theme settings: colours, fonts, style options |
| Business and site details | Site identity (hours, address, phone, logo), site title, site address and other supported project settings |
| Collection items | Add, edit, reorder. Remove is confirm-first. Collection *types* are fixed by the theme; the assistant can't invent new ones. |
| Media | Edit descriptions/alt text. Delete is confirm-first. Uploading from a local folder is the should-have (step 7). |
| Languages | **Add a language** to the site (it creates that language's starting menus and header/footer; it doesn't translate anything). Removing a language is confirm-first. |
| Export | Confirm-first, outside job undo (step 3) |

- **Images aren't a separate action.** A media ID is a value that any edit accepts (sections, blocks, collection items, theme settings, the logo). Finding media and editing its descriptions stay separate.
- **Translating is ordinary editing.** The assistant writes the translated content through the normal page, menu and collection edits in the target language. Widgetizer creates the translation versions and keeps the IDs, translation links and grouping consistent.

### Confirm-first actions

- **Widgetizer asks the user itself**, in its own window: "The assistant wants to delete the About page. [Allow] [Cancel]." A confirmation code handed to the assistant would prove nothing, because the assistant could pass it straight back.
- The request returns the exact plan and waits for the user's answer in Widgetizer. The approval is bound to that plan, the site revision, the job and the connected client. It is single-use and expires.
- The site is **not** held locked while the prompt waits. If the site changed in the meantime, the approval is void and the plan is re-checked.

---

## Step 6 — What the assistant knows (Decided)

Knowledge is served **on demand, in small pieces**, through tool results, not dumped up front. Tool results are the dependable delivery path across MCP clients. The same content may also be mirrored as MCP resources for clients that use them. MCP prompts are used only for optional starter workflows, never for required instructions, since MCP treats prompts as user-controlled.

### Rules that apply to every layer

- **Guidance is advisory.** Theme or preset prose never overrides the user's request, platform validation, the Allow/Cancel confirmations or the job rules.
- **Token budgets.** Core guidance is roughly 500–800 tokens, and discovery returns compact catalog entries. Detail requests return only the selected widget's schema and guidance. Long results are paginated, never silently truncated. "What the theme offers" doesn't return every schema and insight at once.
- **Versioned with the theme.** An existing site gets guidance matching its *copied* theme version. Choosing a preset for a new site uses the installed theme source. Results carry source/version identifiers.
- **Never invent from examples.** Recipe content, preset voice and example text are never treated as facts: no reviews, ratings or business claims are copied from them.
- **One maintained source per kind of guidance.** No parallel long and short versions that drift apart.
- **Not served:** `docs-llms/` developer docs and `skills/widgetizer-theme*`. They are theme-authoring material, and nothing is summarised from them at runtime.
- **Themes without guidance files** (older or third-party) still get layer 1 plus their schemas, and older unstructured `insights.md` files get a bounded fallback. Migration is not required for them to work.

### Layer 1 — Platform guidance (ships with the app)

- **Always present, short, assistant-neutral:** how Widgetizer works, the job rules, never invent facts, write for the site's visitors, ask one focused question when unsure.
- **Fetched only when the task needs it:**
  - writing (tone, length)
  - SEO
  - translation quality
  - images: crop and focal-point suitability, mobile composition
  - accessibility: meaningful vs decorative alt text, heading structure, descriptive links, contrast checks

  Explicit user preferences and the site's existing voice take precedence over any suggested voice.

### Layer 2 — Theme composition guide (optional, theme-owned)

- A new optional file shipped inside the theme and written by the theme author. It covers how to compose good pages with this theme, which colour schemes to use where, section rhythm, and dos and don'ts.
- For Arch it is **curated once** from existing material such as `arch-design-system.md`, written for content authors rather than developers. It is not generated from developer docs at runtime.
- Collection-specific rules stay scoped. `skills/theme-collections/widgetizer-premium.json` targets Common and future premium-collection themes, not Arch or third-party themes. Its content-facing rules are distilled into those themes' guides, and its CSS and authoring instructions are never shipped globally.
- It includes **collection guidance**: which fields matter, and how collection-backed sections relate to their items. Widget guidance alone doesn't explain how to author those.

### Layer 3 — Per-section guidance (`insights.md`, restructured)

- `themes/<theme>/widgets/<w>/insights.md` already exists for most Arch widgets: 54 files, about 395 KB in total, with `banner` alone around 15 KB. It is useful source material but not fit for runtime as-is. It mixes composition advice with duplicated schema tables, implementation details and preset-generation restrictions.
- It stays **the one maintained per-section source**, restructured into fixed sections:
  - **Purpose**
  - **When to use**
  - **Pitfalls**
  - **Recipes**
- **Remove duplicated inventories, not behavioural explanations.** Keys, options and defaults come from `schema.json`. Insights keep what a schema can't express: visual effects, how settings interact, spacing, and constraints on which section can open a page.
- **What the bridge serves:** Purpose and When to use during discovery/selection, since suitability is needed to choose a widget. Pitfalls/caveats come automatically with a widget's details. Individual recipes come on request.
- **Recipes are structured fenced examples** inside the same file, which `scripts/validate-theme.js` checks against the widget's schema, block types and limits. Passing validation doesn't prove visual or behavioural claims, which still need human or rendered review.
- Preset-generation restrictions move out of insights into the preset docs. `theme-preset-generator.md` (which requires reading schema + insights, and expects adjacency, content-burden and replacement advice) is updated alongside the restructuring so nothing it relies on is lost. No code parses the current tables.
- **Include core widgets** in the migration, notably `packages/core/src/widgets/core-form/insights.md`, and keep its deployment limitation prominent: the form only receives submissions on Widgetizer Hosting, and on any other static host submissions fail. The assistant must say so whenever it adds a form.

### Layer 4 — Preset guidance file (direction decided, format open)

Preset choice for "new site from a description" currently rests on a one-line niche label in `presets.json` (e.g. "Bakery") plus the preset's templates. That handles obvious matches but not near-misses or niches with no preset. **TODO:** define the file's format.

- **Where:** one guidance file per preset folder (`presets/<id>/…`), not entries in `presets.json`. It stays self-contained (copying or deleting a preset folder carries its guidance) and keeps `presets.json` small, since the editor's preset picker loads it. Prose is also easier for theme authors to write per preset. It is optional: presets without it still work.
- **Hand-write intent, derive inventory.** The file holds only judgement: the rationale behind the preset, the kinds of business it suits (shop, service, appointments, portfolio, hospitality), look and mood, similar niches it adapts to, and how to adapt it. Pages, widgets, menus and seeded collections are read from the preset's actual files (including root template/menu fallbacks), never listed by hand, so they can't drift.
- **Suitability is not functionality.** "Suits appointment-based businesses" must not imply booking software, and "shop" must not imply checkout. Rank presets by the capabilities the user needs and the effort to adapt, not by niche label alone.
- **How the assistant uses it.** Recommend one best fit and offer two or three only when the alternatives genuinely matter. Ask one focused question when unsure. With no niche match, pick the closest *kind* of business, adapt it, and say which preset it started from (with its live demo). Blank is for explicit minimalist requests or a last resort.
- **Validation.** Extend `scripts/validate-theme.js` to check the file's structure and any page/widget references it makes. Require it for bundled presets via repository checks; third-party themes without it stay valid. Update the theme authoring skill reference and regenerate its catalog.
- **Serving.** Read it from the installed theme source (the same `getThemeSourceDir()` path preset listing uses), so theme updates and runtime sync carry it. Presets aren't copied into projects. The `preset:sync` dev watcher rebuilds the synced project when `preset.json`, templates or menus change (`shouldRebuildProject` in `scripts/preset-sync.js`). The guidance file must stay out of that trigger list, because editing it changes no content.

---

## Step 7 — Images (Decided)

Media IDs are values any edit accepts, and finding media and editing its descriptions are separate actions (step 5). This step covers how the assistant chooses, describes and adds images.

### Choosing from the library

- **Browse media** returns paginated metadata: ID, dimensions, type, descriptions and usage, plus **optional small thumbnails**, and a larger view on request. The assistant can then see what a photo shows and whether its orientation and aspect suit the slot (a wide banner vs a tall card).
- Filenames and descriptions are hints, not proof of what an image shows. Many library items have empty descriptions.
- There is no general focal-point field. Positioning within a slot follows whatever the theme's schema offers for that setting.

### Writing descriptions (alt, title, caption)

- The assistant may fill in **missing** descriptions as an ordinary undoable change, based on what it actually sees. It doesn't guess identities and makes no business claims.
- It preserves existing descriptions unless asked to change them.
- Descriptions belong to the library item and are shared by every placement. A change affects every page that uses the image, and the assistant says so. They are also per language.

### Decorative images (open issue)

- **What works today:** an image whose library alt text is empty renders with `alt=""`, which screen readers treat as decorative. The image tag uses the placement's alt, falling back to the library alt (`alt || metadata.alt` in `packages/core/src/tags/imageTag.js`). An image used only decoratively is therefore handled by leaving its library alt empty, and the assistant must **not** "fill in" alt text for images that are decorative.
- **Per-language blank:** the data model distinguishes "deliberately blank in this language" (`""`) from "inherit the default language" (`null`); see `packages/core/src/utils/mediaMetadata.js`. But the media panel has no control to set a deliberate blank, and saving the panel quietly turns an existing blank back into "inherit". **Undecided:** bring back a control for it, or drop the concept from the server and docs. Until that is settled, the assistant doesn't try to blank a description per language.
- **Per-placement decorative:** not possible today. Alt text belongs to the image rather than the placement, and an empty placement override falls back to the library text. The same image can't be meaningful in one spot and decorative in another. This is rare and out of scope for the first version, and the assistant never blanks an image's library metadata to make one placement decorative.

### Adding new files from the user's computer (should-have)

- **The assistant never reads the user's disk.** Widgetizer shows a **"Choose files"** button with an explanation ("The assistant would like you to add photos"), and the user picks the files. In the web and Hosted versions this is a button the user clicks, not a dialog triggered remotely.
- The selection is bound to the site and the request. The site is **not** held locked while the user chooses. Cancelling and partial upload failures are handled and reported.
- Uploads follow the existing rules: the type allowlist (jpg, png, gif, webp, svg, pdf, mp3, mp4), size limits (the platform limit plus the App Settings per-file limit), automatic raster resizing and SVG sanitisation.
- First scope is picking files. Recursive folder import is a separate later step. Photos dragged into the chat are not supported in the first version, because passing files through assistants is inconsistent.

### Demo photos in new sites

- A new site's preset images already become real library assets: creation copies originals and pre-generated sizes, registers fresh project-scoped media IDs and rescans usage. Arch uses its bundled preset-media pool, other themes may supply per-preset media, and some presets have none.
- **Users may keep demo photos on their live site.** "Replace the demo photo in the About page hero" is a friendly suggestion in the completion record's next steps, not a warning. Reminders are grouped by page and placement, not as a list of unused library files.
- Widgetizer **tracks which media came from the preset**, so these reminders are reliable.
- The assistant never presents demo people, premises or products as the user's actual business.

### Deleting and other media types

- Deletion already refuses assets that are in use, and the Allow prompt doesn't override that. The assistant replaces the references first, then deletes through the retention-aware path (step 3).
- **Video, PDF and audio** can be placed (where a widget setting accepts them) and picked the same way. They aren't image-equivalents: MP4 gets no automatic poster image or transcoding, captions are image-only, and thumbnails don't reveal what a document, audio or video contains. The assistant doesn't claim to have checked their content.

### Not in the first version

Stock-photo search, AI-generated images, cropping or editing images.

---

## Step 8 — Packaging and updates (Decided)

External facts below were checked against Anthropic's and OpenAI's documentation on 2026-10-09; distribution rules change, so re-check them when building.

### A thin relay; the app owns the abilities

- What runs inside the assistant is a **thin relay**. The actions, rules, validation and guidance all live in the Widgetizer app. On connecting, the relay asks the app for its protocol version, capabilities and action list, so the assistant gains new abilities when Widgetizer updates, without reinstalling anything.
- **Version handshake with explicit compatibility ranges.** Keep the Widgetizer bridge-protocol version separate from the MCP protocol version. On a mismatch, give a plain message naming *which* side to update ("Please update Widgetizer" vs "Please update the connection"), and distinguish "restart the connection" from "install an update". Report the connected relay's version: Widgetizer can offer a newer relay but can't assume the user installed it.
- **After Widgetizer restarts**, the relay rediscovers the address and token from the connection file (step 2) and refreshes its tools or asks the client to reconnect. It **never replays an interrupted write**.
- The relay imports **nothing from Electron or the native backend modules** (`better-sqlite3`, `sharp`), which are rebuilt for Electron's ABI at package time and can't load in a plain Node runtime.

### Claude

- **First version: a self-distributed desktop extension (`.mcpb`).** Anthropic still supports installing an `.mcpb` directly in the Claude desktop app: double-click it, drag it into the window, or use **Settings → Extensions → Advanced settings → Install Extension…**. Each path opens Claude's install screen. Claude Desktop bundles Node, so the extension needs no runtime from us. The `.mcpb` carries its own copy of the relay (built from `packages/mcp`). It does **not** point at code inside the installed Widgetizer app: Anthropic's docs describe bundled entry points only, so that approach isn't a supported contract.
- **Updates are manual** for a privately distributed `.mcpb`. The app always ships the latest `.mcpb`, and the Connect screen offers **"Update connection"** when the handshake says the installed relay is too old.
- **Later: a Widgetizer plugin in Anthropic's directory**, for discoverability and automatic updates. Since 2026 the directory **no longer accepts `.mcpb` listings**: a local server must be packaged in a plugin (a public GitHub repo with `.claude-plugin/plugin.json`, a README and a license, human review for a new listing, updates by merging to a tracked branch, scanned before they're served). Caveats:
  - A plugin's local MCP server is **ignored in regular chat**. It loads in Claude Code and in Cowork, while skills load everywhere. So the plugin **complements the `.mcpb`, it doesn't replace it**.
  - Since 2026-10-06, new **Pro/Max Cowork tasks run in Anthropic's cloud**. They reach local connectors and plugin local servers only through the desktop app, while it's open. Team/Enterprise still document local sessions. Promise only the surfaces actually tested per plan.
  - Plugin updates go through scanning and publication, so they don't arrive instantly. Avoid duplicate tool registrations when a user has both the `.mcpb` and the plugin.
  - The plugin can carry an onboarding skill (e.g. "install and open Widgetizer first"). Essential workflow rules stay in the relay's tool results (step 6).

### Codex

- **First version: guided setup** (step 2). The ChatGPT desktop app's Codex has a settings screen for adding a STDIO MCP server. CLI users run `codex mcp add widgetizer -- <command> <args>`, or add `[mcp_servers.widgetizer]` with `command`, `args` and optional `env` in `~/.codex/config.toml`. Desktop, CLI and the IDE extension share configuration on the same machine. Widgetizer generates correctly escaped absolute paths. **No secret goes into the pasted config**: the relay reads the token from the connection file.
- **Initialisation instructions:** Codex reads the server's instructions, and its docs recommend making the first 512 characters self-contained, so the essential workflow rules go first.
- **Later: a Codex plugin.** Codex plugins can bundle the relay and skills. A **Git marketplace** works now (`codex plugin marketplace add owner/repo`, then `codex plugin add …`, updated with `codex plugin marketplace upgrade`). OpenAI's **public** plugin directory currently requires a public HTTPS MCP endpoint and says to contact OpenAI about local servers, so a public local listing isn't self-service. The Codex IDE extension doesn't support plugins, though it does support directly configured MCP servers.
- **Plain ChatGPT chat** (not Codex) can't launch a local server. It connects only to a public HTTPS endpoint or through OpenAI's Secure MCP Tunnel, which is extra infrastructure. Hosted covers it later.

### The relay's runtime for non-Claude assistants

- Claude Desktop runs the `.mcpb` with its bundled Node, but Codex and other clients launch the relay command themselves and users may have no Node installed. Users must never need to install anything.
- **Chosen direction: ship a separate small Node runtime** alongside the app, with the standalone relay JS **outside the ASAR archive**. This is predictable, at the cost of roughly 30–40 MB of installer size and keeping that runtime patched. Final confirmation rests with the maintainer.
- **Rejected for now: borrowing Electron's built-in Node** (`ELECTRON_RUN_AS_NODE`). The app's own server deliberately avoids that mode, because it strips ASAR support and breaks file access on Windows (`electron/main.js`). It would also need the `RunAsNode` fuse enabled and packaged-platform testing. A Node single-executable build is another option, but it adds its own build and signing pipeline.
- The self-run web version runs the same relay entry point with plain Node (a quiet npm script, with stdout reserved for MCP traffic).

### Hosted (later)

- **One remote MCP server** (Streamable HTTP + OAuth). It can be listed in Anthropic's directory as a connector, optionally paired with a plugin carrying skills, and connected in ChatGPT as a custom MCP server. Each client has its own OAuth setup and eligibility checks.
- Remote connectors work in Claude on web, mobile and desktop, and in Cowork and Claude Code. "Works on web/mobile" means the Hosted service is reachable there. It never grants those sessions access to anything on the user's computer.

### Release process

- The relay and extension get their own build, pack, **sign and verify** steps (the MCPB CLI has its own signing), separate from the app's macOS signing/notarization and Windows signing. Add them to the release checklist in `CLAUDE.md`.
- Build the relay artifacts **before** app signing, so they're inside the signed bundle.
- Test the installed builds on **macOS arm64 and x64 and Windows x64**, including updating Widgetizer while an assistant is connected.

### Not in the first version

- **In-chat interactive previews** (MCP Apps). They are an optional later enhancement that would need UI-capability negotiation. An embedded preview wouldn't give the model visual evidence or reach localhost by itself, so preview data would still go through tools, and approvals stay in Widgetizer (step 5). The first version uses screenshots and text results plus "Open in Widgetizer".

---

## Next

All eight design steps are decided. Before implementation: define the preset guidance file format (step 6, layer 4), settle the per-language blank alt decision (step 7), confirm the relay runtime (step 8), and turn this design into an implementation plan.
