export function shouldResetProjectScopedStores(prevProjectId, nextProjectId) {
  return Boolean(prevProjectId) && prevProjectId !== nextProjectId;
}

export function handleActiveProjectChange({
  prevProjectId,
  nextProjectId,
  themeStore,
  widgetStore,
  autoSaveStore,
  pageStore,
}) {
  if (!shouldResetProjectScopedStores(prevProjectId, nextProjectId)) {
    return false;
  }

  themeStore.getState().resetForProjectChange();
  widgetStore.getState().resetForProjectChange();
  autoSaveStore.getState().reset();
  pageStore.getState().clearPage();
  return true;
}
