# Future: Roadmap — four features, built in series

> **Status: order decided 2026-09-09.** Nothing is urgent; each stage is finished and shipped before the next starts, and each lands groundwork the later ones use instead of rewriting. This page is the entry point — start here, then open the stage's own doc.

| stage | what ships | design doc | what it lands for later stages |
|---|---|---|---|
| **0. Groundwork** | **(a)** A `page_url` filter (`'index' | page_url`) replacing the Arch header logo's inline Clean-URLs `if`; also fixes the header CTA default that ships as a raw `contact.html`. **(b)** One Site URL base helper so every absolute URL — canonical, og:image, sitemap, robots, later JSON-LD ids and hreflang — is joined the same way. | `future-multilang-implementation-plan.md`, steps 0 and 1 | One way for a theme to link to a page; one way to build an absolute URL. |
| **1. Collection pagination** | Paginated copies of the page hosting a listing widget (`blog.html`, `blog/page/2.html`), switched on per widget. | `future-pagination-design.md` | Derived output depth, the addressing module (output / public / preview paths), the `page` reserved name, the widget-schema `collection` declaration. |
| **2. Structured data** | Automatic JSON-LD through the existing SEO tag; project-owned site identity and business details that Arch shows in the footer. | `future-structured-data-design.md` | Global widgets rendering with `page` and `project` in context; the split between stable facts and translatable text. |
| **3. Multilang** | Per-language pages in one project, language folders, translation groups, hreflang, switcher. | `future-multilang-design.md` (decisions) + `future-multilang-implementation-plan.md` (steps) | — |

## Reading order when picking this up

1. This page.
2. `future-multilang-implementation-plan.md` — its Phase 0 lists the shared groundwork with file names and done-when criteria, and marks which stage each piece ships in.
3. The design doc of the stage you are on. Each one states where it sits in the series and what it inherits.

## Rules that hold across all four

- A single-language, non-paginated project must export byte-for-byte what it exports today after every stage (allowing for the deliberate `<html lang>` change in multilang).
- Path and URL logic lives in `@widgetizer/core` helpers (`internalHref.js`, the addressing module), never in a theme template or a controller.
- Theme-facing contracts — the `pagination` object, `page.translations`, `project.identity` — are frozen once Arch ships against them. Get the fields right before that.
- The task tracker is never cited from these docs; reasons go inline.
