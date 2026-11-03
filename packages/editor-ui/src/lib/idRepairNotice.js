import usePageStore from "../stores/pageStore";
import useAutoSave from "../stores/saveStore";
import useToastStore from "../stores/toastStore";

// One notice at a time, by id: a later load's notice replaces an earlier one.
const NOTICE_ID = "id-repairs";

/**
 * The notice for ids a page load renamed, naming the old ids (what custom CSS and
 * links use), or null when only order entries that named no widget were dropped.
 * @param {{ widgets: object[], blocks: object[] }} report
 * @param {Function} t
 * @returns {string|null}
 */
export function idRepairsMessage(report, t) {
  const ids = [
    ...report.widgets.map(({ from }) => from),
    ...report.blocks.map(({ from, widget }) => t("pageEditor.idRepairs.block", { block: from, widget })),
  ];
  if (ids.length === 0) return null;
  return t("pageEditor.idRepairs.renamed", { ids: ids.join(", ") });
}

/**
 * Take the page load's id repair, if any: schedule the autosave that writes it (no
 * edit will, and a repair left unsaved comes back on every load) and show the
 * notice, which stays until dismissed.
 * @param {Function} t
 */
export function announceIdRepairs(t) {
  const report = usePageStore.getState().idRepairs;
  if (!report) return;
  usePageStore.getState().clearIdRepairs();
  useAutoSave.getState().resetAutoSaveTimer();
  const message = idRepairsMessage(report, t);
  if (message) useToastStore.getState().showToast(message, "warning", { id: NOTICE_ID, duration: 0 });
}

/** Close the notice: it is about the page that was loaded, and stays until dismissed. */
export function dismissIdRepairs() {
  useToastStore.getState().dismissToast(NOTICE_ID);
}
