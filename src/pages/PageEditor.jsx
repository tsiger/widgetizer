import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import WidgetList from "../components/pageEditor/WidgetList";
import PreviewPanel from "../components/pageEditor/PreviewPanel";
import SettingsPanel from "../components/pageEditor/SettingsPanel";
import EditorTopBar from "../components/pageEditor/EditorTopBar";
import LoadingSpinner from "../components/ui/LoadingSpinner";

import usePageStore from "../stores/pageStore";
import useWidgetStore from "../stores/widgetStore";
import useAutoSave from "../stores/saveStore";
import useThemeStore from "../stores/themeStore";
import useNavigationGuard from "../hooks/useNavigationGuard";

export default function PageEditor() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [previewMode, setPreviewMode] = useState("desktop");
  const previewIframeRef = useRef(null);

  const { page, loading, error } = usePageStore();
  const {
    schemas: widgetSchemas,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    setSelectedWidgetId,
    setSelectedBlockId,
    setSelectedGlobalWidgetId,
  } = useWidgetStore();
  const { hasUnsavedChanges, isSaving, isAutoSaving, lastSaved, save, startAutoSave, stopAutoSave } = useAutoSave();
  const { settings: themeSettings } = useThemeStore();

  // Add navigation guard
  useNavigationGuard();

  // Load initial data
  useEffect(() => {
    const pageId = searchParams.get("pageId");
    // Always call loadPage, even with null pageId - it handles the null case properly
    usePageStore.getState().loadPage(pageId);
    if (pageId) {
      useWidgetStore.getState().loadSchemas();
      useThemeStore.getState().loadSettings();
    }
  }, [searchParams]);

  // Setup auto-save
  useEffect(() => {
    startAutoSave();
    return () => stopAutoSave();
  }, [startAutoSave, stopAutoSave]);

  // Handle block selection (cross-component coordination)
  const handleBlockSelect = (blockId) => {
    setSelectedBlockId(blockId);
  };

  // Handle widget selection (cross-component coordination)
  const handleWidgetSelect = (widgetId) => {
    setSelectedWidgetId(widgetId);
  };

  // Handle global widget selection (cross-component coordination)
  const handleGlobalWidgetSelect = (widgetType) => {
    setSelectedGlobalWidgetId(widgetType);
  };

  // Get the selected widget and its schema (needed by SettingsPanel)
  const selectedWidget = selectedWidgetId && page?.widgets[selectedWidgetId];
  const selectedWidgetSchema = selectedWidget ? widgetSchemas[selectedWidget.type] || {} : {};

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message={t("pageEditor.loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">{t("pageEditor.error", { message: error })}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>{t("pageEditor.noPageSelected")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900">
      <EditorTopBar
        pageName={page.name}
        pageId={page.id}
        hasUnsavedChanges={hasUnsavedChanges()}
        isAutoSaving={isAutoSaving}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onSave={() => save(false)}
        onPreviewModeChange={setPreviewMode}
      />

      <div className="flex flex-1 overflow-hidden">
        <WidgetList
          page={page}
          widgets={page?.widgets || {}}
          widgetSchemas={widgetSchemas}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          onWidgetSelect={handleWidgetSelect}
          onBlockSelect={handleBlockSelect}
          onGlobalWidgetSelect={handleGlobalWidgetSelect}
          previewIframeRef={previewIframeRef}
        />

        <PreviewPanel
          ref={previewIframeRef}
          page={page}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          widgets={page?.widgets}
          widgetSchemas={widgetSchemas}
          themeSettings={themeSettings}
          previewMode={previewMode}
          onWidgetSelect={handleWidgetSelect}
          onBlockSelect={handleBlockSelect}
          onGlobalWidgetSelect={handleGlobalWidgetSelect}
        />

        <SettingsPanel
          selectedWidget={selectedWidget}
          selectedWidgetSchema={selectedWidgetSchema}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          widgetSchemas={widgetSchemas}
          onBackToWidget={() => setSelectedBlockId(null)}
        />
      </div>
    </div>
  );
}
