# Liquid and render context

## Engine contract and scope

**Contract:** Widgetizer uses LiquidJS with `.liquid` files and HTML autoescape (`outputEscape: "escape"`). Widget schemas live in JSON files, not `{% schema %}` tags. Shopify objects, filters, tags, app blocks, and asset conventions are not implicitly available.

Use normal LiquidJS control flow, assignments, captures, loops, and `render` for snippets. The theme's `snippets/` is searched before core snippets. `{% render 'card', entry: post, theme: theme %}` sees explicit arguments and render globals; it does not inherit the caller's `widget`, `page`, `theme`, `project`, or `item`. Pass these when needed. `include` shares scope; prefer isolated `render` for new snippets.

| Context | Author-facing values |
| --- | --- |
| Layout | `header`, `main_content`, `footer` (already rendered HTML); `body_class`, `page_title`; `page`, `project`, `theme`, `site_icons`, `imagePath`, `filePath` |
| Widget | `widget.id`, `.type`, `.settings`, `.blocks`, `.blocksOrder`, `.index`; `theme`, `site_icons`, `imagePath`, `filePath`; `page` and `project` on page-aware renders |
| Collection item template | `item` (prepared record), `collection` (definition), `page` (page-shaped item context), `project`, `theme`, media paths/icons |
| Paginating widget | `pagination` only for the widget driving pagination; page-aware contexts also expose `page.pagination` |
| Snippet | Explicit arguments plus globals; pass `filePath`, `site_icons`, etc. if the snippet needs them |

`widget.index` is one-based on ordinary pages and can be null for global or isolated renders. Guard optional context. Page-aware values include language, direction, translations and breadcrumbs. Do not treat a missing page during an isolated widget render as a fatal error.

Supported public globals include `renderMode` (`preview` or `publish`), `outputPathPrefix`, `cleanUrls`, `breadcrumbs`, and `icons`. `icons` holds every icon from the theme's `assets/icons.json` keyed by name, each with a `body` of SVG markup (see the assets reference). Within top-level contexts they are also reachable through `globals`; inside a `render` snippet the global names survive but the `globals` variable itself is not inherited. Leave internal caches, loaders, project resolution, and asset queues to the engine.

Do not shadow `page`, `project`, `widget`, `globals`, `currentPageData`, `mediaFiles`, `imagePath`, `breadcrumbs`, or `currentCanonicalPath` with unrelated local data. Tags and core snippets read these names through Liquid. Passing the real value under its own name is fine. Choose local names such as `hero_image` instead of `imagePath`.

## Layout example

This example assumes `assets/base.css` exists. It enables every core layout hook and imposes no design system (the starter theme's `layout.liquid` is the same idea, plus site icons and a shared script):

```liquid
<!doctype html>
<html lang="{{ page.language | default: 'en' }}" dir="{{ page.dir | default: 'ltr' }}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {% seo %}
    {% fonts %}
    {% theme_settings %}
    {% asset src: 'base.css' %}
    {% custom_css %}
    {% custom_head_scripts %}
    {% header_assets %}
  </head>
  <body class="{{ body_class }}">
    {{ header | raw }}
    <main id="main-content">{{ main_content | raw }}</main>
    {{ footer | raw }}
    {% footer_assets %}
    {% custom_footer_scripts %}
  </body>
</html>
```

**Contract:** emit main content; retain the asset queue hooks when using enqueued assets; emit configured globals; preserve `body_class` when depending on app-provided page/state classes. The custom-code and font hooks may output nothing when unconfigured.

Site icons are not printed by a tag. The layout receives a `site_icons` object with `primaryIconHref`, `primaryIconType`, `primaryIconSizes`, `legacyIconHref`, `serpIconHref`, `appleTouchIconHref` and `manifestHref` (each may be blank) and writes the `<link>` elements itself. Copy the starter's `snippets/site-icons.liquid` rather than rewriting it.

## Registered custom tags

Named arguments use `key: value` syntax, separated by commas. The table covers every custom tag registered in the audited engine. Tags emit markup directly; `raw` is an output filter, not a suffix for tag syntax.

| Tag | Arguments, defaults, and behavior |
| --- | --- |
| `{% theme_settings %}` | No arguments. Emits global CSS variables from raw theme settings, or nothing when none qualify. See the manifest contract. |
| `{% fonts %}` | No arguments. Loads recognized font-picker selections from the `typography` group, with provider/preconnect handling. No eligible fonts means no output. It does not load arbitrary font families. |
| `{% seo %}` | No arguments. Emits title/meta, canonical/social/structured data as supported by page/project data. Keep it in layout; a snippet invoking it needs `page` and `project` passed in. Canonical/absolute structured data depends on site configuration. |
| `{% custom_css %}` | No arguments. Emits the advanced `custom_css` value/default inside a style tag. Empty/unconfigured means no output. |
| `{% custom_head_scripts %}` | No arguments. Emits advanced `custom_head_scripts` as raw HTML, with no wrapper. |
| `{% custom_footer_scripts %}` | Same for `custom_footer_scripts`; place before body closes. |
| `{% asset src: 'base.css' %}` | Required `src`; optional `defer: false`, `async: false`, `crossorigin`, `integrity`, `media`, `id`, `alt`. CSS produces a link, JS a script, recognized image extensions an image, other types a URL. Missing src produces nothing. Origin depends on context; see assets reference. There is no `theme: true` override on this tag. |
| `{% enqueue_style src: 'intro.css' %}` | Registers without inline output. `location: 'header'`, `priority: 50`, optional `media`, `id`, `theme: false`. Use `theme: true` for a shared theme asset from a widget. |
| `{% enqueue_script src: 'intro.js' %}` | Registers without inline output. `location: 'footer'`, `priority: 50`, `defer: false`, `async: false`, `theme: false`. Boolean flags require booleans. |
| `{% enqueue_preload src: resource_url, as: 'image' %}` | Required `src`, `as`; optional `type`, `fetchpriority`, `media`, `imagesrcset`, `imagesizes`, `crossorigin: false`, `theme: false`. Missing required values produces nothing. Use a resolved image-tag path for image preloads. |
| `{% header_assets %}` | No arguments. Emits registered preloads and header styles/scripts. Numeric priorities are ascending; lower runs first. |
| `{% footer_assets %}` | No arguments. Emits footer styles/scripts. Queues deduplicate by source string, not widget instance. |
| `{% image src: widget.settings.image %}` | Media-library image tag. Required path-string `src`; `size: 'medium'`, `class: ''`, `lazy: true`, `alt: ''`, `title: ''`, `srcset: false`; optional `sizes`, `loading`, `fetchpriority`, `decoding`, `output`. `output: 'path'` or `'url'` returns the resolved image path. Blank src returns nothing. |
| `{% placeholder_image aspect: 'landscape' %}` | Core placeholder; `aspect` is `landscape`, `portrait`, or `square` (unknown falls back to landscape). Optional `src` chooses a theme asset; `output: 'img'` or `'url'`, `class`, `style`, `alt` (default `Placeholder`), `width`, `height`, `loading`. |
| `{% youtube src: widget.settings.video %}` | Accepts URL/video ID string or stored embed object with `videoId`/`url`. `width: '560'`, `height: '315'`, `class: 'youtube-embed'`, `loading: 'lazy'`, optional `title`; `autoplay: false`, `controls: true`, `mute: false`, `loop: false`, `modestbranding: false`, `rel: true`, optional `start`, `end`. Default emits iframe; `output: 'url'` emits embed URL; `'thumbnail'` emits thumbnail URL with optional `quality` (default `hqdefault`). Blank src emits nothing; invalid input produces an error comment. Tag defaults override stored embed options. |

### Image details that affect correctness

`image` looks up the basename in the project's media library. It is not a general remote-image or theme-asset loader. Requested sizes fall back to the original when unavailable. Without metadata it still constructs an upload URL; that does not prove the binary exists or will be exported.

Registered media supplies localized alt/title and dimensions; an explicit nonempty alt/title wins. An empty `alt` argument does not suppress a nonempty metadata alt. SVGs do not get raster dimensions/variants. `srcset: true` requires multiple usable candidates and skips the library thumbnail; `sizes` is emitted only with an actual srcset. Explicit `loading` wins over `lazy`. Choose eager loading intentionally for the first important image.

```liquid
{% if widget.settings.image != blank %}
  {% image src: widget.settings.image, size: 'large', srcset: true, sizes: '100vw', loading: 'eager', fetchpriority: 'high' %}
{% else %}
  {% placeholder_image aspect: 'landscape', alt: '' %}
{% endif %}
```

## Registered custom filters

| Filter | Contract and example |
| --- | --- |
| `media_meta` | `path \| media_meta` returns metadata; `path \| media_meta: 'alt'` selects a property in the page language. Missing path/record/property returns empty. |
| `handleize` | String to lowercase transliterated handle: `'Our Studio' \| handleize`. Can return empty; supply a positional fallback when an ID must exist. |
| `safe_url` | Sanitizes an author-controlled URL; rejects dangerous schemes as empty. Use on plain URL text in quoted href/src attributes. It does not construct internal addresses or sanitize CSS/JavaScript. |
| `rte_text` | Removes markup/normalizes whitespace for text-only emptiness checks; not a display renderer. |
| `rte_blank` | Boolean empty-text test for rich text, including `<p></p>` and nonbreaking spaces. Text-only semantics: do not hide image-only rich text with it when images are allowed. |
| `format_date` | Date-only `YYYY-MM-DD` to configured format; optional override, e.g. `value \| format_date: 'D MMM YYYY'`. Invalid/blank is empty. Uses page language; default format comes from `theme.general.date_format` or the core default. |
| `collection` | `'projects' \| collection: limit: 6, sort: 'manual', offset: 0`. Returns prepared item records or an empty list when unavailable. Pagination can override limit/offset for the active listing. |
| `page_url` | `'contact' \| page_url`; optional `lang: 'el'`. Handles render depth, language, home path, and Clean URLs. Empty slug returns empty. |
| `item_url` | `entry.slug \| item_url: 'work'`; argument is the collection's **slugPrefix**, which may differ from its type. Optional `lang:`. Empty slug/prefix returns empty. |
| `t` | `'site.common.next' \| t`; interpolation via named arguments, e.g. `t: number: 2`. See localization for dictionary/fallback rules. |

Use `page_url`/`item_url` for paths constructed from known slugs. Structured links, menus, and rich-text links are already resolved by the renderer: do not run a finished href through `page_url` or add another depth prefix. For collection results prefer `entry.url` when it is present; list-only collections have no detail URL.

## Escaping and code boundaries

**Contract:** leave plain strings autoescaped. Use `| raw` only for deliberately rendered HTML: the layout's composed HTML, sanitized rich-text fields, trusted theme SVG markup, and explicitly supported embed/code sinks. A text field, translated label, URL, or arbitrary user string is not made safe by `raw`.

```liquid
<h2 data-setting="heading">{{ widget.settings.heading }}</h2>
{% assign body_empty = widget.settings.body | rte_blank %}
{% unless body_empty %}
  <div data-setting="body">{{ widget.settings.body | raw }}</div>
{% endunless %}
{% assign destination = widget.settings.link.href | safe_url %}
{% if destination != blank %}
  <a href="{{ destination }}">{{ widget.settings.link.text }}</a>
{% endif %}
```

Rich text is sanitized according to its declared schema at the server boundary. `code` is intentionally unsanitized; ordinary `{{ code_value }}` still autoescapes. Custom CSS/script hooks are explicit executable-content features, not rich-text substitutes. HTML escaping does not make interpolation safe inside script bodies or CSS. Prefer escaped `data-*` attributes for strings consumed by scripts; parse them as data. Restrict dynamic CSS to appropriate typed values and supported options.

## Core snippets

`menu` takes a **resolved menu object** and renders up to three item levels in the audited core snippet. Parameters: `menu`, `aria_label`, `skip_nav`, `class_nav`, `class_list`, `class_item`, `class_link`, `class_submenu`, `class_has_submenu`. The `menu` setting starts as a stored ID but reaches the template as a resolved object. Do not nest another nav unless `skip_nav: true` is passed.

```liquid
{% render 'menu', menu: widget.settings.navigation, aria_label: 'Primary' %}
```

`breadcrumbs` takes `class_nav`, `class_list`, `class_item`, `class_link`, `class_current`, `separator`, `home_label`, `page_label`, `aria_label`, `show_home`. It reads the trail from globals and emits nothing for an empty trail. Supply translated labels where needed. Override a core snippet by shipping a theme snippet of the same name only when intentionally taking responsibility for its behavior.

## What does not exist

LiquidJS's standard tags and filters work (`if`, `for`, `assign`, `capture`, `case`, `render`, `append`, `default`, `split`, `where`, `date`, and so on). Beyond those, the tables above are the complete list of Widgetizer's own tags and filters. In particular there is no `{% schema %}`, `{% section %}`, `{% form %}`, `{% paginate %}`, `{% style %}` or `{% javascript %}`; no `asset_url`, `img_url`, `image_url`, `stylesheet_tag`, `script_tag`, `money` or `link_to`; and no `section`, `shop`, `settings` or `routes` object. LiquidJS skips an unknown filter without an error, so a made-up filter fails silently: the value passes through unchanged. For example `| min: 4` does nothing; the real filter is `| at_most: 4`.

`references/contract.json` lists tag/filter names and custom tag argument names for the recorded app/LiquidJS versions. It is an authoring catalog; the app checker reads the current app source.
