// Built-in OSS editor navigation, contributed through the SAME plugin registry
// as user plugins — EditorShell composes the list as `[builtinNavPlugin, ...plugins]`.
// The two sections (site, tools) are represented by an ordered NAV_GROUPS table
// plus a per-item `group` tag, so plugin-contributed navItems can join an
// existing group or render in a trailing section of their own.

import { File, ListTree, Image, Settings, Rocket, Eye } from "lucide-react";

/** Ordered nav groups for the built-in editor surface. */
export const NAV_GROUPS = [
  { id: "site", titleKey: "navigation.site" },
  { id: "tools", titleKey: "navigation.tools" },
];

/** Group items whose `group` is unknown fall back here. */
const FALLBACK_GROUP = "tools";

/** @type {{ name: string, navItems: object[] }} */
export const builtinNavPlugin = {
  name: "builtin-nav",
  navItems: [
    { id: "pages", labelKey: "navigation.pages", path: "/pages", icon: File, requiresProject: true, group: "site" },
    { id: "menus", labelKey: "navigation.menus", path: "/menus", icon: ListTree, requiresProject: true, group: "site" },
    { id: "media", labelKey: "navigation.media", path: "/media", icon: Image, requiresProject: true, group: "site" },
    { id: "settings", labelKey: "navigation.settings", path: "/settings", icon: Settings, requiresProject: true, group: "site" },
    { id: "preview", labelKey: "navigation.sitePreview", icon: Eye, requiresProject: true, group: "site", action: "openSitePreview" },
    { id: "export", labelKey: "navigation.exportSite", path: "/export-site", icon: Rocket, requiresProject: true, group: "tools" },
  ],
};

/**
 * Bucket a flat navItems list into ordered sections for the sidebar. Known
 * groups (NAV_GROUPS) come first in their declared order; any leftover groups
 * (e.g. plugin-defined) follow in first-seen order with no title.
 *
 * @param {object[]} navItems - flat list from the registry (already plugin-tagged)
 * @param {Array<{id: string, titleKey?: string}>} [groups]
 * @returns {Array<{ id: string, titleKey?: string, items: object[] }>}
 */
export function groupNavItems(navItems = [], groups = NAV_GROUPS) {
  const byGroup = new Map();
  for (const item of navItems) {
    const id = item.group ?? FALLBACK_GROUP;
    if (!byGroup.has(id)) byGroup.set(id, []);
    byGroup.get(id).push(item);
  }

  const sections = [];
  for (const group of groups) {
    if (byGroup.has(group.id)) {
      sections.push({ id: group.id, titleKey: group.titleKey, items: byGroup.get(group.id) });
      byGroup.delete(group.id);
    }
  }
  // Trailing groups not declared in NAV_GROUPS (plugin-defined), first-seen order.
  for (const [id, items] of byGroup) {
    sections.push({ id, titleKey: undefined, items });
  }
  return sections;
}
