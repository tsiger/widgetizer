import { DATA_DIR, refreshAllMediaUsageFromDir } from "@widgetizer/builder-server";
import { createSnapshots, createAssetLedger } from "@widgetizer/assistant/snapshots";
import { createLocalSnapshotStore, createLocalHoldStore } from "@widgetizer/assistant/local";
import { createSiteRows } from "./siteRows.js";

export function rebuildUsageWithoutWrites(storage) {
  return (scope) =>
    refreshAllMediaUsageFromDir({
      projectId: scope.projectId,
      projectDir: storage.getProjectBase(scope),
      stampMissing: false,
    });
}

/** Which bytes each library file holds, with old bytes kept in the data folder. `assetStorage` is the undecorated adapter. */
export function createOssAssetLedger({ assetStorage, dataRoot = DATA_DIR }) {
  return createAssetLedger({ assetStorage, holdStore: createLocalHoldStore({ dataRoot }) });
}

/** Snapshots of the open sites, stored in the data folder. Callers hold the site's content-write section. */
export function createOssSnapshots({ adapters, db, generations, ledger, dataRoot = DATA_DIR }) {
  return createSnapshots({
    storage: adapters.storage,
    assets: ledger,
    rows: createSiteRows(db),
    generations,
    store: createLocalSnapshotStore({ dataRoot }),
    rebuildUsage: rebuildUsageWithoutWrites(adapters.storage),
  });
}
