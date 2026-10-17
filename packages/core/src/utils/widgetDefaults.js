/**
 * Build a flat settings object from a schema settings array.
 *
 * A setting naming a site string carries `resolvedDefault`, the word in the
 * language being edited. Whether that word is written into the new widget is
 * decided by whether the setting ALSO has a literal `default`: with one, the
 * value is something content must carry — a form field's label is its submitted
 * name — so the resolved word is stored and the owner edits it from there.
 * Without one, it stays a suggestion the render resolves per page, which is
 * what keeps one language's wording from following a page into its translations.
 */
export function buildDefaultSettings(settingsSchema) {
  const defaults = {};
  if (Array.isArray(settingsSchema)) {
    settingsSchema.forEach((setting) => {
      if (setting.default === undefined) return;
      defaults[setting.id] = setting.resolvedDefault !== undefined ? setting.resolvedDefault : setting.default;
    });
  }
  return defaults;
}

/**
 * Build a default block payload from a widget schema and a block type/overrides.
 */
export function buildDefaultBlock(widgetSchema, blockDef, generateBlockId) {
  const blockSchema = widgetSchema.blocks?.find((b) => b.type === blockDef.type);
  const blockSettings = {
    ...buildDefaultSettings(blockSchema?.settings),
    ...(blockDef.settings || {}),
    // Each starting block names its own words, because one block schema cannot
    // hold three different labels. English stays above as the fallback for a
    // language nothing was written in.
    ...(blockDef.resolvedDefaults || {}),
  };
  return {
    id: generateBlockId(),
    data: { type: blockDef.type, settings: blockSettings },
  };
}

/**
 * Build a complete default widget payload from a schema.
 */
export function buildDefaultWidget(widgetSchema, widgetType, generateBlockId) {
  const settings = buildDefaultSettings(widgetSchema.settings);
  const blocks = {};
  const blocksOrder = [];

  if (Array.isArray(widgetSchema.defaultBlocks)) {
    widgetSchema.defaultBlocks.forEach((blockDef) => {
      const { id, data } = buildDefaultBlock(widgetSchema, blockDef, generateBlockId);
      blocks[id] = data;
      blocksOrder.push(id);
    });
  }

  return { type: widgetType, settings, blocks, blocksOrder };
}
