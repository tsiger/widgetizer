# Built-in API inventory

[Map](../README.md) · [User operations](README.md) · [Coverage](../coverage.md)

## How to use this reference

This is the developer's checklist of requests the app can make, such as fetching pages or saving a menu. One action you take on screen may make several of these requests. You do not need to understand this list to understand the product; start with the [plain-language operation guides](README.md#read-a-workflow-without-code).

The list helps us notice when a new operation has been added without being described in the handbook. Being listed here does not mean it has been fully tested.

## Technical details

Inventory of literal routes declared on 2026-09-18, rechecked against changes through `ff2d4456` on 2026-09-19 (no added route declarations). Paths below use the local web app's `/api` mount; other shells can mount these routers elsewhere. Routes and middleware, not this table, remain authoritative for validation and authorization. Project content handlers generally resolve a requested language from query/body; a language argument is not a different endpoint.

This index cross-checks the operation directory against the backend surface. It is not a test-coverage report. Read the linked walkthrough for ownership and side effects. Editor-only widget/block changes, undo/redo, clipboard, guards and autosave are covered in [Editing](editing.md).

`GET /api/widgets?language=<code>` now returns language-resolved `resolvedDefault` values where a widget/block schema uses `defaultKey`, plus `resolvedDefaults` for starter-block `defaultKeys`. A literal `default` alongside `defaultKey` makes the editor store the localized initial value; without it the value remains a display/render suggestion. Form authoring uses page endpoints; `POST /__widgetizer/forms/<key>` in exported HTML is a hosting integration target, not a route supplied by this backend. See [forms](forms.md).

## appSettings

[Route declarations](../../../packages/builder-server/src/routes/appSettings.js) · [Behavior walkthrough](editing.md#application-settings)

| Method | Local path |
| --- | --- |
| GET | `/api/settings` |
| PUT | `/api/settings` |

## collections

[Route declarations](../../../packages/builder-server/src/routes/collections.js) · [Behavior walkthrough](content.md#collections)

| Method | Local path |
| --- | --- |
| GET | `/api/collections/schemas` |
| GET | `/api/collections/schema/:collectionType` |
| GET | `/api/collections/:collectionType` |
| GET | `/api/collections/:collectionType/:itemSlug` |
| POST | `/api/collections/:collectionType` |
| PUT | `/api/collections/:collectionType/:itemSlug` |
| DELETE | `/api/collections/:collectionType/:itemSlug` |
| POST | `/api/collections/:collectionType/bulk-delete` |
| POST | `/api/collections/:collectionType/:itemSlug/duplicate` |
| POST | `/api/collections/:collectionType/:itemSlug/discard-archived` |
| POST | `/api/collections/:collectionType/:itemSlug/translations` |
| POST | `/api/collections/:collectionType/reorder` |

## core

[Route declarations](../../../packages/builder-server/src/routes/core.js) · [Behavior walkthrough](themes.md)

| Method | Local path |
| --- | --- |
| GET | `/api/core/assets/:filename` |

## export

[Route declarations](../../../packages/builder-server/src/routes/export.js) · [Behavior walkthrough](output.md)

| Method | Local path |
| --- | --- |
| POST | `/api/export` |
| GET | `/api/export/history` |
| DELETE | `/api/export/:version` |
| GET | `/api/export/files/:exportDir` |
| GET | `/api/export/download/:exportDir` |
| GET | `/api/export/view/:exportDir` |
| GET | `/api/export/view/:exportDir/*filePath` |

## icons

[Route declarations](../../../packages/builder-server/src/routes/icons.js) · [Behavior walkthrough](themes.md)

| Method | Local path |
| --- | --- |
| GET | `/api/icons` |

## languages

[Route declarations](../../../packages/builder-server/src/routes/languages.js) · [Behavior walkthrough](languages.md)

| Method | Local path |
| --- | --- |
| POST | `/api/languages` |
| GET | `/api/languages/:code/summary` |
| DELETE | `/api/languages/:code` |

## media

[Route declarations](../../../packages/builder-server/src/routes/media.js) · [Behavior walkthrough](media.md)

| Method | Local path |
| --- | --- |
| GET | `/api/media` |
| POST | `/api/media` |
| POST | `/api/media/bulk-delete` |
| POST | `/api/media/refresh-usage` |
| GET | `/api/media/:fileId/usage` |
| DELETE | `/api/media/:fileId` |
| PUT | `/api/media/projects/:projectId/media/:fileId/metadata` |
| GET | `/api/media/projects/:projectId/media/:fileId` |
| GET | `/api/media/projects/:projectId/uploads/images/:filename` |
| GET | `/api/media/projects/:projectId/uploads/files/:filename` |

## menus

[Route declarations](../../../packages/builder-server/src/routes/menus.js) · [Behavior walkthrough](content.md#menus)

| Method | Local path |
| --- | --- |
| GET | `/api/menus` |
| GET | `/api/menus/:id` |
| POST | `/api/menus` |
| PUT | `/api/menus/:id` |
| POST | `/api/menus/:id/duplicate` |
| DELETE | `/api/menus/:id` |

## pages

[Route declarations](../../../packages/builder-server/src/routes/pages.js) · [Behavior walkthrough](content.md#pages)

| Method | Local path |
| --- | --- |
| GET | `/api/pages` |
| GET | `/api/pages/:id` |
| POST | `/api/pages` |
| PUT | `/api/pages/:id` |
| DELETE | `/api/pages/:id` |
| POST | `/api/pages/bulk-delete` |
| POST | `/api/pages/:id/duplicate` |
| POST | `/api/pages/:id/translations` |
| POST | `/api/pages/:id/content` |

## preview

[Route declarations](../../../packages/builder-server/src/routes/preview.js) · [Behavior walkthrough](output.md#preview)

| Method | Local path |
| --- | --- |
| POST | `/api/preview` |
| POST | `/api/preview/token` |
| POST | `/api/preview/collection` |
| POST | `/api/preview/widget` |
| GET | `/api/preview/global-widgets` |
| POST | `/api/preview/global-widgets/:type` |
| GET | `/api/preview/assets/:projectId/:folder/*filepath` |

## projects

[Route declarations](../../../packages/builder-server/src/routes/projects.js) · [Behavior walkthrough](projects.md)

| Method | Local path |
| --- | --- |
| GET | `/api/projects` |
| GET | `/api/projects/active` |
| POST | `/api/projects` |
| PUT | `/api/projects/active/:id` |
| PUT | `/api/projects/:id` |
| DELETE | `/api/projects/:id` |
| POST | `/api/projects/:id/duplicate` |
| POST | `/api/projects/:projectId/export` |
| POST | `/api/projects/import` |
| GET | `/api/projects/:id/theme-updates/status` |
| PUT | `/api/projects/:id/theme-updates` |
| POST | `/api/projects/:id/theme-updates/apply` |

## themes

[Route declarations](../../../packages/builder-server/src/routes/themes.js) · [Behavior walkthrough](themes.md)

| Method | Local path |
| --- | --- |
| GET | `/api/themes` |
| GET | `/api/themes/update-count` |
| GET | `/api/themes/:id` |
| GET | `/api/themes/:id/widgets` |
| GET | `/api/themes/:id/templates` |
| GET | `/api/themes/:id/versions` |
| GET | `/api/themes/:id/presets` |
| POST | `/api/themes/:id/update` |
| GET | `/api/themes/project/:projectId` |
| POST | `/api/themes/project/:projectId` |
| GET | `/api/themes/project/:projectId/locales/:lang` |
| POST | `/api/themes/upload` |
| DELETE | `/api/themes/:id` |

## translations

[Route declarations](../../../packages/builder-server/src/routes/translations.js) · [Behavior walkthrough](languages.md)

| Method | Local path |
| --- | --- |
| GET | `/api/translations/:groupId` |

## widgets

[Route declarations](../../../packages/builder-server/src/routes/widgets.js) · [Behavior walkthrough](editing.md)

| Method | Local path |
| --- | --- |
| GET | `/api/widgets` |

## Token rendering and contributed routes

| Method | Local path | Behavior |
| --- | --- | --- |
| GET | `/render/:token` | Serve an unexpired rendered HTML snapshot |

86 literal built-in routes are listed, including token rendering. [setupBuilderServer](../../../packages/builder-server/src/setupBuilderServer.js) mounts these routers and can also mount plugin-contributed project routes. Dynamic plugin contributions and static middleware mounts are outside this literal-route count. Core assets, theme assets and media serving are supporting reads, not additional editable content entities.

To refresh: inspect the route declarations and router mounts, add/remove inventory rows, and update the corresponding operation and coverage entries. Recount literal declarations; do not treat a new route as covered just because it fits an existing family.
