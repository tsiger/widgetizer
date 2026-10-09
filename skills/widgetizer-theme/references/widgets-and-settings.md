# Widgets and settings

## Definition, instance, and rendering are different objects

**Contract:** a regular widget is `widgets/<type>/schema.json` plus `widget.liquid`. Schema `type` matches the folder and instance `type`. Reserve `header`/`footer` for global widgets and `core-` for app-owned widgets. `preview.png` is optional picker artwork; it does not substitute for a valid template/schema.

An independently styled widget can start with this schema:

```json
{
  "type": "intro",
  "displayName": "Introduction",
  "aliases": ["welcome", "opening"],
  "settings": [
    { "id": "heading", "type": "text", "label": "Heading", "default": "Welcome" },
    { "id": "body", "type": "richtext", "label": "Description", "default": "<p>Introduce your work.</p>" }
  ],
  "blocks": [
    {
      "type": "point",
      "displayName": "Point",
      "settings": [
        { "id": "text", "type": "text", "label": "Text", "default": "A useful detail" }
      ]
    }
  ],
  "maxBlocks": 4,
  "defaultBlocks": [
    { "type": "point", "settings": { "text": "Our approach" } }
  ]
}
```

`settings` and block definitions are arrays. Stored instances use objects keyed by setting ID or block instance ID. `defaultBlocks` is an array of initial block instances, used when adding a widget; it is not the template's live block list. The renderer does not create those instances just because a hand-authored page omitted `blocks`.

```json
{
  "type": "intro",
  "settings": { "heading": "Our practice" },
  "blocks": {
    "first-point": { "type": "point", "settings": { "text": "Thoughtful spaces" } }
  },
  "blocksOrder": ["first-point"]
}
```

Render in the explicit order, not object-property order:

```liquid
<section id="{{ widget.id }}" class="widget widget-intro" data-widget-id="{{ widget.id }}" data-widget-type="intro">
  {% if widget.settings.heading != blank %}
    {% if widget.index == 1 %}
      <h1 data-setting="heading">{{ widget.settings.heading }}</h1>
    {% else %}
      <h2 data-setting="heading">{{ widget.settings.heading }}</h2>
    {% endif %}
  {% endif %}
  {% assign body_empty = widget.settings.body | rte_blank %}
  {% unless body_empty %}
    <div data-setting="body">{{ widget.settings.body | raw }}</div>
  {% endunless %}
  {% for point_id in widget.blocksOrder %}
    {% assign point = widget.blocks[point_id] %}
    {% if point.type == 'point' %}
      <p data-block-id="{{ point_id }}" data-setting="text">{{ point.settings.text }}</p>
    {% endif %}
  {% endfor %}
</section>
```

The heading rule above is an example appropriate for an opening section, not a guarantee that every first widget needs an H1. Design the whole page's heading structure, including templates and global content.

## Editor integration

**Contract:** emit one targetable outer element per widget with `data-widget-id="{{ widget.id }}"`; use `data-widget-type` for identification and a unique `id` for instance targeting. Mark each block's element with its actual instance key as `data-block-id`. Mark editable output with the matching `data-setting` ID in the correct widget/block scope. These attributes support preview selection, highlighting, and targeted updates; do not replace them with theme-specific names.

While the author types, the editor writes the new value straight into every element carrying that `data-setting`, replacing the element's whole content:

- On most elements it sets the text (or the HTML, for `richtext` and `code` settings).
- On an `<a>` with a `link` setting it sets `href` and the link's text.
- On an `<img>` it sets `src`.

So put `data-setting` on the innermost element that holds only that value. If a button also contains an icon, wrap the label in its own `<span data-setting="...">`; otherwise the icon disappears while typing. Leave `data-setting` off anything whose markup depends on the value in more than a text swap (a class, a count, a formatted date); the editor re-renders the widget shortly after anyway.

**Convention:** retain a `widget` base class and a type-specific class. The extra `.widget-<instance-id>` class, native CSS nesting, `.widget-container`, `.w-*`, `.t-*`, and `.color-scheme-*` are conventions of Arch, the theme bundled with Widgetizer, not platform rules. New themes may scope styles with their own selectors. CSS and element IDs must remain correct with two copies of the same widget on a page.

`maxBlocks` is an editor addition/duplication limit. Omitted or zero means unlimited; lowering the limit does not truncate existing blocks. Do not present it as server validation or a content migration.

`supportsTransparentHeader: true` marks a first-widget candidate. The actual overlay also depends on the header setting, app body state, and the theme's header/CSS implementation. This flag alone creates no visual behavior.

Use only declared block types and settings. Widget data is not comprehensively schema-validated on save: missing/invalid schemas may fall back, unknown properties may be ignored or survive. Tolerant rendering is not a supported extension system. Nested block hierarchies/repeaters are not provided by this contract.

## Supported setting types and value shapes

Every value-bearing definition has a stable `id`, supported `type`, and human-readable `label` (direct or `tTheme:`). Optional `description` supplies help text; optional `default` must have the same shape as saved values. `header` groups controls and does not store a content value.

This table is the complete list. There is no `toggle`, `boolean`, `url`, `html`, `image_picker`, `repeater` or `list` type, and no conditional-visibility property; a definition with an unknown type or property is not an extension point.

| Type | Stored value | Type-specific authoring rules |
| --- | --- | --- |
| `header` | None | `label`, optional `description`; use a unique ID by convention. |
| `text` | String | Plain text, autoescaped. |
| `textarea` | String | Multiline plain text; line breaks do not automatically become HTML breaks. |
| `number` | Number, or `""` when cleared | Optional numeric `min`, `max`, `step`. Guard empty values before arithmetic. |
| `range` | Number | Set meaningful `min`, `max`, `step`, and `default`; optional `unit`. Widgets must append a desired unit themselves in markup/CSS; automatic CSS variable units apply to global settings. |
| `checkbox` | Boolean | Use `true`/`false`, not strings. `toggle` is not a registered setting type. |
| `select` | Selected option value | Supply `options: [{ "value": "wide", "label": "Wide" }]`; make defaults belong to the options. Prefer strings for portable enum values. |
| `radio` | Selected option value | Same option contract as `select`. |
| `color` | Color string, or empty | `allow_alpha: true` enables alpha; account for rgba values rather than assuming every color is six-digit hex. |
| `richtext` | HTML string | `allow_source`, `allow_headings`, `allow_images`, `min_height`, `placeholder`. Emit sanitized HTML through `raw`; use text emptiness helpers only when appropriate for the content. |
| `code` | Raw string | `language`, `rows`; intentionally unsanitized. Only emit through a deliberate code/embed sink. |
| `font_picker` | `{ "stack": "...", "weight": 400 }` | Choose actual catalog stacks/available weights. Global font loading has the `typography` group contract. |
| `icon` | Icon-name string | Theme icon catalog; optional `options`/`allow_patterns` narrow selection. An icon name is not SVG markup. Supply the icon data and a renderer/snippet. |
| `image` | `/uploads/images/<filename>` string, or empty | `size` controls input width (`narrow`/`full`); `compact` is the older fallback; `layout: 'row'`/`'stacked'` controls editor presentation. Use the image tag, not a fabricated image object. |
| `gallery` | Ordered array of image-path strings, empty `[]` | Loop entries with the image tag. Metadata is on media records. A supported alternative to one image block per picture. |
| `file` | `/uploads/files/<filename>` string, or empty | Picker allows PDF/MP3/MP4. Render with prepared `filePath` plus basename, or supported resolved links. See assets reference. |
| `video` | `/uploads/files/<filename>.mp4` string, or empty | Uploaded MP4 only, picked from the media library; not an external/YouTube URL (use `youtube` or a text URL for those). Render a native `<video>` from `filePath` plus basename; see assets reference. Playback depends on the visitor's browser decoding the file; there is no transcoding or generated poster. |
| `youtube` | Embed object, or cleared empty value | Picker uses video identity/URL/options; optional schema `embedOptions`. Pass to the youtube tag; do not assume this is an image path. Tag arguments/defaults determine final embed options. |
| `date` | `YYYY-MM-DD` string, or empty | Calendar date, not datetime/timezone. Render with `format_date`. |
| `menu` | Menu ID/UUID string | Renderer resolves this to a menu object with `items`; do not treat its rendered value as the stored ID. |
| `link` | `{ "href": "...", "text": "...", "target": "_self" }` | Runtime can add stable `pageUuid` or `collectionType`/`collectionItemUuid`; use the resolved href. `hide_text: true` hides label editing. |
| `table` | Ordered array of row objects, empty `[]` | Define nonempty `columns`; v1 column type is `text`. Unique column IDs match `^[a-zA-Z][a-zA-Z0-9_]*$`, excluding `__proto__`, `constructor`, `prototype`. Primarily intended for collections; the editor input is shared. |

Example table field and value:

```json
{
  "id": "specifications",
  "type": "table",
  "label": "Specifications",
  "columns": [
    { "id": "label", "type": "text", "label": "Label" },
    { "id": "detail", "type": "text", "label": "Detail" }
  ],
  "default": []
}
```

```json
[
  { "label": "Location", "detail": "Athens" }
]
```

`required` is enforced for collection item data through its validation path; do not assume setting the flag gives all widget inputs server-side required validation. Collection-only `usedAsTitle`/`usedAsDate` rules are in the content reference. `outputAsCssVar` is for global theme settings, not automatic per-widget styling.

## Defaults and links

Settings omitted from widget/block instances fall back to their schema default; explicit stored values override defaults. Empty links should be explicit when suppressing a nonempty default:

```json
{ "href": "", "text": "", "target": "_self" }
```

Read link objects through `.href`, `.text`, and `.target`. Guard empty destinations before rendering a button/link. For `_blank`, supply an appropriate `rel` such as `noopener noreferrer`. Do not bake UUIDs from a sample project into templates. Localization's `defaultKey`, `resolvedDefault`, and `defaultBlocks[].defaultKeys` have different roles; follow the localization reference instead of storing unresolved keys as user content.