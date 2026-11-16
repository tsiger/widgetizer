# Roadmap after 1.0.0

Features to work on after the 1.0.0 launch, in order. Recorded 2026-11-16. This is a proposed order, not a commitment or a schedule.

1. **AI assistant and site skill.** Let AI assistants read and edit a Widgetizer site, with approval and undo, then add a guided "build me a site" workflow on top. Mostly built on the `mcp` branch; it needs merging onto 1.0.0 and testing in the packaged apps. ([#202](https://github.com/tsiger/widgetizer/issues/202), [#208](https://github.com/tsiger/widgetizer/issues/208), [future-mcp.md](future-mcp.md), [future-skills-site.md](future-skills-site.md))

2. **Image optimization.** Themes load the right image size for each place, new uploads are optimized automatically, and later existing media libraries too. ([#128](https://github.com/tsiger/widgetizer/issues/128), [future-image-optimization.md](future-image-optimization.md))

3. **Drafts and trash.** Keep unfinished pages and collection items out of the published site, and make deleted ones recoverable. ([#141](https://github.com/tsiger/widgetizer/issues/141), [#119](https://github.com/tsiger/widgetizer/issues/119), [future-drafts-and-trash.md](future-drafts-and-trash.md))

4. **Cookie consent.** Agree the behaviour first, then add a site-wide banner that holds back optional scripts and embeds until the visitor agrees. ([#230](https://github.com/tsiger/widgetizer/issues/230))

5. **Better shared areas.** An "After header" area, moving widgets between a page and an area, forms in areas, and recovery for areas a theme removed. ([#163](https://github.com/tsiger/widgetizer/issues/163) follow-ups, [future-shared-widget-areas.md](future-shared-widget-areas.md))

6. **Language refinements.** Smaller language and date-format improvements, shipped one by one; whether a site's main language can change is decided separately. ([#146](https://github.com/tsiger/widgetizer/issues/146), [#179](https://github.com/tsiger/widgetizer/issues/179), [#180](https://github.com/tsiger/widgetizer/issues/180), [#188](https://github.com/tsiger/widgetizer/issues/188)–[#192](https://github.com/tsiger/widgetizer/issues/192), [#203](https://github.com/tsiger/widgetizer/issues/203))

7. **Site quality checks.** A link checker for broken and empty links, plus a decision on the accessibility standard and how automated checks should work. ([#164](https://github.com/tsiger/widgetizer/issues/164), [#211](https://github.com/tsiger/widgetizer/issues/211), [#193](https://github.com/tsiger/widgetizer/issues/193))

8. **Purchased themes in the desktop app.** A signed-in way to get and update paid themes in the desktop app. Depends on product decisions still to be made.

9. **Shopify storefront widgets.** Product, product grid, cart and checkout widgets for Arch, driven by a Shopify store. Built on the `shopify-swc` branch without tests; it needs bringing up to date and testing against a real store.

10. **More author control.** Editable collection item-page templates, custom widgets that theme updates leave alone, and an option to hide or show collections, each scoped separately. ([#210](https://github.com/tsiger/widgetizer/issues/210), [#207](https://github.com/tsiger/widgetizer/issues/207), [#200](https://github.com/tsiger/widgetizer/issues/200), [future-custom-widgets.md](future-custom-widgets.md))

11. **Content import.** Fill collections from one outside source first, such as a feed or WordPress. A proposal only; no code exists yet.

12. **AI-generated sites.** Describe a business and get a complete, editable site. Builds on the AI assistant and needs its own work on generated collection types.
