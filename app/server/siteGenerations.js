const KINDS = new Set(["theme"]);

/** Counters for site changes the content digest can't see; bumped before the change happens. */
export function createSiteGenerations(db) {
  const read = db.prepare("SELECT assets, theme FROM assistant_site_generations WHERE project_id = ?");
  const exists = db.prepare("SELECT 1 FROM projects WHERE id = ?");
  const bumps = {
    assets: db.prepare(
      "INSERT INTO assistant_site_generations (project_id, assets) VALUES (?, 1) ON CONFLICT(project_id) DO UPDATE SET assets = assets + 1",
    ),
    theme: db.prepare(
      "INSERT INTO assistant_site_generations (project_id, theme) VALUES (?, 1) ON CONFLICT(project_id) DO UPDATE SET theme = theme + 1",
    ),
  };

  return {
    get(projectId) {
      const row = read.get(projectId);
      return { assets: row?.assets ?? 0, theme: row?.theme ?? 0 };
    },
    bump(projectId, kind) {
      if (!KINDS.has(kind)) throw new Error(`Unknown site change kind: ${kind}`);
      if (!exists.get(projectId)) return;
      bumps[kind].run(projectId);
    },
  };
}

/** The asset adapter with every file's old bytes held before it is deleted or replaced, whichever code path does it. */
export function holdAssetWrites(assetStorage, ledger) {
  return new Proxy(assetStorage, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (property === "prepareDelete") {
        return async (scope, keys) => {
          for (const key of keys) await ledger.hold(scope, key);
        };
      }
      if (typeof value !== "function") return value;
      if (property === "upload") {
        return async (scope, key, ...args) => {
          if (await target.stat(scope, key)) await ledger.hold(scope, key);
          ledger.forget(scope, key);
          return value.call(target, scope, key, ...args);
        };
      }
      if (property === "delete") {
        return async (scope, key, ...args) => {
          await ledger.hold(scope, key);
          ledger.forget(scope, key);
          return value.call(target, scope, key, ...args);
        };
      }
      return value.bind(target);
    },
  });
}
