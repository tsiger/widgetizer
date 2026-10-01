# Assets and browser behavior

## Choose the correct asset origin

**Contract:** theme assets, widget assets, and uploaded media are separate sources. Use the supported tags so preview API URLs and static output paths stay aligned.

| Source | Location | How to reference |
| --- | --- | --- |
| Shared theme CSS/JS | `assets/` | `asset` in layout; `enqueue_style`/`enqueue_script` with `theme: true` when called inside a widget |
| Widget CSS/JS | Beside its `widget.liquid` | Enqueue a uniquely named file without `theme: true` |
| Static theme images/fonts | `assets/` | Asset tag where appropriate; fonts can use CSS-relative `url(...)`; custom placeholders use `placeholder_image src:` |
| Uploaded image | Media library + `uploads/images/` | `image` tag and `media_meta` filter |
| Uploaded file | Media library + `uploads/files/` | Resolved `filePath` plus basename, or a supported file link |

Asset/enqueue origin is detected from the actual top-level widget environment. A `{% render %}` snippet uses theme assets, even if passed a `widget` argument. Enqueue widget-local files in the widget template itself. `asset` has no `theme: true` option; the enqueue tags do.

```liquid
{% enqueue_style src: 'intro-layout.css' %}
{% enqueue_script src: 'intro-interaction.js', defer: true %}
{% enqueue_script src: 'shared-navigation.js', theme: true, defer: true, priority: 10 %}
```

Missing `src` silently produces no asset. Style location defaults to header and script location to footer. Lower priorities load first within the appropriate queue; equal-priority order follows registration. Queues use the source string as the key, so conflicting options for the same source replace the earlier registration. Do not use `async` when execution order matters.

## Export constraints

**Contract:** the current exporter copies enqueued widget CSS/JS into the shared output `assets/` directory by **basename**. Use unique basenames across theme and widget assets, for example `intro-interaction.js`, not a separate `script.js` in every widget. Keep widget-local runtime CSS/JS at the widget root and reference the basename; do not assume nested widget asset paths survive export.

Theme assets are copied as a directory. Put static fonts/images and supporting asset trees there. Do not assume arbitrary images or other files placed beside a widget template will be exported. Use enqueue tags for widget CSS/JS; a direct `asset` reference does not register a file in the export queue.

The engine supplies depth-aware asset URLs and CSS/JS cache-busting. Do not construct `/api/preview/...`, hardcode project IDs or localhost, or manually append `?v=`. Hardcoded `/assets/...` breaks subdirectory deployment, and `assets/...` without the correct depth can break item, translated, and paginated pages.

Media must be registered as well as present on disk. A raw file copied to uploads can appear in one preview while missing from media-dependent export behavior. Preset media requires the binary files and its manifest; see the content reference.

For a `file` field in a widget:

```liquid
{% if widget.settings.document != blank %}
  {% assign document_name = widget.settings.document | split: '/' | last %}
  {% assign document_url = filePath | append: '/' | append: document_name %}
  <a href="{{ document_url | safe_url }}">Download</a>
{% endif %}
```

Pass `filePath` explicitly if moving that code into an isolated snippet. Do not double-prefix a resolved URL.

For preloading an uploaded hero, capture the actual image-tag path:

```liquid
{% if widget.settings.image != blank %}
  {% capture hero_url %}{% image src: widget.settings.image, size: 'large', output: 'path' %}{% endcapture %}
  {% enqueue_preload src: hero_url, as: 'image', fetchpriority: 'high' %}
{% endif %}
```

A relative script/style preload follows widget/theme origin rules; fonts resolve from theme assets. Preload only a resource the page actually requests, using matching size/source options.

## Widget lifetime in the editor

**Contract:** widgets can be added, duplicated, removed, and have their DOM replaced without a full navigation. Initialization only on `DOMContentLoaded` is insufficient for an enqueued script that stays loaded after a widget is replaced.

Design the initializer to accept a widget element, bind once per actual element, and work for multiple instances. A `WeakSet`/`WeakMap` is useful for tracking live elements; avoid a boolean keyed only by widget ID because replacement keeps the ID but changes the element. Avoid a `data-initialized` flag as your own state: the preview runtime uses it too.

Enqueued scripts should perform an initial scan, then listen for the bubbling `widget:updated` event and initialize the relevant element. Handle the case where the script is loaded after DOMContentLoaded. Inline scripts inside the widget are re-executed on replacement; wrap them in a function scope to avoid redeclaring global `const`/`let` bindings. Do not repeatedly install document-level handlers from every instance.

Core's runtime cleans up resources it tracks, but arbitrary theme event listeners, timers, and observers are still the theme's responsibility. Prefer event delegation or instance-owned resources with cleanup appropriate to replacement/removal. Do not invent an undocumented `widget:destroy` event or cleanup registration API.

## Editor events

These events dispatch on the element bearing `data-widget-id` and bubble:

| Event | Detail | Purpose |
| --- | --- | --- |
| `widget:select` | `{}` | Widget selected |
| `widget:deselect` | `{}` | Widget deselected |
| `widget:block-select` | `{ blockId }` | A block selected |
| `widget:block-deselect` | `{ blockId }` | A block deselected |
| `widget:updated` | `{ widgetId }` | Widget changed/replaced; initialize current DOM |

Selection transitions deselect the old block, deselect the old widget if changed, select the new widget if changed, then select the new block. Re-selecting the same state does not guarantee another event.

Use `window.Widgetizer?.designMode` to gate editor-specific behavior. It is not guaranteed in exported sites or standalone preview. Examples: stop autoplay while selected, show the chosen carousel slide, open the selected accordion panel. The underlying controls must also work for ordinary visitors.

## Verification obligations

Check two instances, a duplicate, settings changes, reorder, delete, and re-add. Confirm each instance responds independently and interactive state is reinitialized correctly. Check keyboard access, visible focus, image alternative text, and reduced-motion behavior when the feature uses motion. These are authoring quality requirements; the ZIP importer does not test them.

Core widgets own their markup and assets. If using `core-form`, style its actual contract and verify it separately. Do not create a parallel theme-specific submission system merely to achieve a different appearance.

Evidence: [asset URL resolver](../../../packages/core/src/utils/assetUrl.js), [enqueue tags](../../../packages/core/src/tags), [export asset copying](../../../packages/builder-server/src/controllers/exportController.js), [preview replacement/events](../../../packages/core/src/runtime/previewRuntime.js), [core form contract](../../../docs-llms/core-form-widget.md).
