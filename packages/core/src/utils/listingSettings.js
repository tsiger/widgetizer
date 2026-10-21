// Two controls the editor adds to every widget that lists a collection, instead
// of each theme declaring them: `listing_anchor` marks the listing its items'
// pages belong under, and `paginate` splits the listing into pages, which needs
// the schema to name its per-page setting. The page save path enforces how they
// interact (one paginating widget per page, one anchor per collection).

export const LISTING_SETTING_IDS = ["listing_anchor", "paginate"];

/**
 * The listing controls a widget schema gets, as setting definitions, or an empty
 * list for a widget that lists no collection.
 * @param {object} schema - A widget schema
 * @returns {Array<{ id: string, type: "checkbox", default: false, description: string }>}
 */
export function listingSettingsFor(schema) {
  if (typeof schema?.collection?.type !== "string") return [];
  const settings = [
    {
      id: "listing_anchor",
      type: "checkbox",
      default: false,
      description: "This is the collection's main listing: its items' pages link back here. One per collection; turning it on clears it elsewhere.",
    },
  ];
  if (typeof schema.collection.perPageSetting === "string") {
    settings.push({
      id: "paginate",
      type: "checkbox",
      default: false,
      description: `Split the listing into pages of "${schema.collection.perPageSetting}" items. Only one per page; it also makes this the main listing.`,
    });
  }
  return settings;
}
