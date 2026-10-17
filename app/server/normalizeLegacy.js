import { randomUUID } from "node:crypto";
import { parseContentKey } from "@widgetizer/core/contentAddress";
import { listContentKeys } from "@widgetizer/assistant/snapshots";

const IDENTIFIED_KINDS = new Set(["page", "item", "menu"]);

/**
 * Gives pages, collection items and menus saved before ids existed their id now, the
 * way the editor would on its next save, so a snapshot and its restore agree on them.
 * Run inside the site's content-write section. Reports whether anything changed.
 */
export async function normalizeLegacyIds({ storage, scope, rebuildUsage }) {
  let changed = false;
  for (const key of await listContentKeys(storage, scope)) {
    const parsed = parseContentKey(key);
    if (!parsed || !IDENTIFIED_KINDS.has(parsed.kind) || (parsed.kind === "item" && parsed.slug === "_order")) continue;
    const bytes = await storage.read(scope, key);
    let data;
    try {
      data = JSON.parse(bytes.toString("utf8"));
    } catch {
      continue;
    }
    if (!data || typeof data !== "object" || Array.isArray(data) || data.uuid) continue;
    await storage.write(scope, key, JSON.stringify({ ...data, uuid: randomUUID() }, null, 2));
    changed = true;
  }
  if (changed) await rebuildUsage(scope);
  return changed;
}
