# Web App Map

Projects: Identifier usage: projectId (UUID) is the stable identity used in routes/API; folderName is mutable and used only for filesystem paths. Add new project Edit project Clone project Delete project Set active project Export project (ZIP download for backup/transfer) Import project (ZIP upload from another installation) View theme update indicator (shows when theme's latest version > project's version) Apply theme update (copies updatable files from theme's latest/ to project)

Pages: Identifier usage: page actions use projectId (UUID) in API; server resolves folderName for filesystem paths. Add new page Edit page settings Clone page Delete page (single) Delete pages (bulk) Design page (Page editor)

Menus: Identifier usage: menu actions use projectId (UUID) in API; server resolves folderName for filesystem paths. Add new menu Edit menu settings Edit menu structure (drag and drop) Clone menu Delete menu

Media: Identifier usage: media API routes use projectId (UUID); server resolves folderName for uploads/media.json paths. Upload media Browse media (grid/list) Search and filter media Edit media metadata Delete media (single) Delete media (bulk) Refresh media usage tracking Select media for inputs

Themes: Identifier usage: theme upload/list is global (no projectId). Theme activation happens via project edit using projectId (UUID). View themes Upload theme Activate theme (via project edit) Delete theme View pending update count (sidebar badge) Update theme (build latest/ snapshot from base + updates/)

Export: Identifier usage: export API uses projectId (UUID); output directory uses folderName for filesystem paths. Create export View export history View export Download export Delete export version

App Settings: Identifier usage: global settings (no projectId or folderName). View app settings Edit app settings Save app settings Cancel app settings changes Toggle developer mode (reserved for future developer tools)

Dashboard: Identifier usage: displays active project (projectId UUID) and resolves folderName server-side as needed. View active project summary Get started entry points

Preview: Identifier usage: preview uses projectId (UUID) to render; server resolves folderName for filesystem paths. Preview page (standalone)

Plugins: Identifier usage: no projectId or folderName (global view). View plugins
