/**
 * The message key for a page-editor save the server refused. A save sends the
 * page (with its header, footer and areas) first and the site settings after,
 * so a refusal over an image no longer in the media library names the part
 * that was refused (`saveStore` marks a refusal of the site settings with
 * `savePart: "theme"`). Shared with embedding shells that run their own save
 * buttons.
 *
 * @param {unknown} err - the rejection from `useAutoSave().save(false)`
 * @returns {string} an i18n key
 */
export function saveFailureMessageKey(err) {
  if (err?.code === "MEDIA_REFERENCE_MISSING") {
    return err.savePart === "theme" ? "pageEditor.mediaUsage.missingSiteSettings" : "pageEditor.mediaUsage.missing";
  }
  return "pageEditor.toolbar.saveFailed";
}
