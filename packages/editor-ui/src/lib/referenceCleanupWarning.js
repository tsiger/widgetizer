/**
 * Did a delete succeed while the tidy-up after it did not?
 *
 * Deleting a page, collection item, menu or language also clears the links and
 * selections that pointed at it. The content goes whether or not that sweep can
 * finish, so the server answers with a success carrying a
 * `REFERENCE_CLEANUP_INCOMPLETE` warning rather than reporting a failed deletion
 * for something that was, in fact, deleted.
 *
 * The warning carries the storage keys it could not write, for logs. They must not
 * reach the person reading the message: "pages/el/index.json" tells them nothing
 * they can act on, and what they need to know is which of their pages to look at.
 *
 * @param {object} result the parsed response body
 * @returns {boolean}
 */
export function hasIncompleteReferenceCleanup(result) {
  return Boolean(result?.warnings?.some((warning) => warning?.code === "REFERENCE_CLEANUP_INCOMPLETE"));
}
