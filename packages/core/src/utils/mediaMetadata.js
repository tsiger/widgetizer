/**
 * A media file's alt/title/caption for one language.
 *
 * The library itself is shared across languages — the same binaries, the same
 * grid. Only these three fields vary, and only when someone has translated them.
 *
 * `null` (or no entry for the language) means INHERIT the default language;
 * `""` means DELIBERATELY BLANK. They cannot be collapsed: a decorative image
 * with empty alt text in Greek would otherwise inherit the English description,
 * which is worse for a screen reader than no alt at all.
 */
export const MEDIA_METADATA_FIELDS = ["alt", "title", "caption"];

export function resolveMediaMetadata(file, language) {
  const base = file?.metadata || {};
  const translated = language ? file?.translations?.[language] : null;
  if (!translated) return { alt: base.alt || "", title: base.title || "", caption: base.caption || "" };

  const resolved = {};
  for (const field of MEDIA_METADATA_FIELDS) {
    const value = translated[field];
    resolved[field] = value === null || value === undefined ? base[field] || "" : value;
  }
  return resolved;
}
