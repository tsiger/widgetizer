// Slot API — named regions of editor chrome that a shell fills with a single
// ReactNode each (design doc §5). Distinct from the plugin registries (which
// are multi-entry); slots are shell-provided chrome. New slots are added
// non-breakingly. The actual rendering lives in the shell/Layout (1.5e); here
// we define the contract + a resolver so it is testable framework-free.

export const SLOT_NAMES = Object.freeze([
  "sidebarHeader",
  "sidebarFooter",
  "topbarLeft",
  "topbarRight",
  "topbarBanner",
  "overlay",
  "publishConfirmation",
]);

/**
 * Resolve a named slot from a shell-provided `slots` object.
 * @param {Record<string, unknown>|null|undefined} slots
 * @param {string} name
 * @returns {unknown|null} the slot's node, or null when unset
 */
export function resolveSlot(slots, name) {
  if (slots && Object.prototype.hasOwnProperty.call(slots, name)) {
    return slots[name];
  }
  return null;
}
