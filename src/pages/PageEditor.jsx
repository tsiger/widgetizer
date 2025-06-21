import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import WidgetList from "../components/pageEditor/WidgetList";
import PreviewPanel from "../components/pageEditor/PreviewPanel";
import SettingsPanel from "../components/pageEditor/SettingsPanel";
import EditorTopBar from "../components/pageEditor/EditorTopBar";
import WidgetSelector from "../components/pageEditor/WidgetSelector";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import BlockSelector from "../components/pageEditor/blocks/BlockSelector";

import usePageStore from "../stores/pageStore";
import useWidgetStore from "../stores/widgetStore";
import useAutoSave from "../stores/saveStore";
import useThemeStore from "../stores/themeStore";
import useProjectStore from "../stores/projectStore";
import useConfirmationModal from "../hooks/useConfirmationModal";
import useNavigationGuard from "../hooks/useNavigationGuard";

export default function PageEditor() {
  const [searchParams] = useSearchParams();
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState(0);
  const [isBlockSelectorOpen, setIsBlockSelectorOpen] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState(null);
  const [previewMode, setPreviewMode] = useState("desktop");

  const { page, loading, error } = usePageStore();
  const {
    schemas: widgetSchemas,
    selectedWidgetId,
    selectedBlockId,
    setSelectedWidgetId,
    setSelectedBlockId,
    addWidget,
    deleteWidget,
    duplicateWidget,
    reorderWidgets,
    updateWidgetSettings,
    updateBlockSettings,
    reorderBlocks,
  } = useWidgetStore();
  const { hasUnsavedChanges, isSaving, isAutoSaving, lastSaved, save, startAutoSave, stopAutoSave } = useAutoSave();
  const { settings: themeSettings } = useThemeStore();
  const { activeProject, loading: projectLoading } = useProjectStore();

  // Add navigation guard
  useNavigationGuard();

  // Load initial data
  useEffect(() => {
    const pageId = searchParams.get("pageId");
    if (pageId && activeProject) {
      usePageStore.getState().loadPage(pageId);
      useWidgetStore.getState().loadSchemas();
      useThemeStore.getState().loadSettings();
    }
  }, [searchParams, activeProject]);

  // Setup auto-save
  useEffect(() => {
    startAutoSave();
    return () => stopAutoSave();
  }, [startAutoSave, stopAutoSave]);

  // Handle preview mode change
  const handlePreviewModeChange = (mode) => {
    setPreviewMode(mode);
  };

  // Handle widget deletion with confirmation
  const handleDeleteWithConfirmation = async (data) => {
    deleteWidget(data.widgetId);
    useAutoSave.getState().setStructureModified(true);
  };

  // Use our custom confirmation modal hook
  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(handleDeleteWithConfirmation);

  // Function to open delete confirmation
  const handleDeleteWidgetClick = (widgetId) => {
    if (!page || !page.widgets[widgetId]) return;

    // Get the widget name for the confirmation message
    const widget = page.widgets[widgetId];
    const widgetSchema = widgetSchemas[widget.type] || {};
    const widgetName = widget.settings?.name || widgetSchema.displayName || widget.type;

    openModal({
      title: "Delete Widget",
      message: `Are you sure you want to delete "${widgetName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      data: { widgetId, widgetName },
    });
  };

  // Handle opening the widget selector
  const handleAddWidgetClick = (position) => {
    setInsertPosition(position);
    setIsWidgetSelectorOpen(true);
  };

  // Handle widget settings change
  const handleSettingChange = (widgetId, settingId, value) => {
    updateWidgetSettings(widgetId, settingId, value);
    useAutoSave.getState().markWidgetModified(widgetId);
  };

  // Handle widget reordering
  const handleWidgetsReorder = (newOrder) => {
    reorderWidgets(newOrder);
    useAutoSave.getState().setStructureModified(true);
  };

  // Handle block settings change
  const handleBlockSettingChange = (widgetId, blockId, settingId, value) => {
    updateBlockSettings(widgetId, blockId, settingId, value);
    useAutoSave.getState().markWidgetModified(widgetId);
  };

  // Handle block selection
  const handleBlockSelect = (blockId) => {
    setSelectedBlockId(blockId);
  };

  // Handle widget selection
  const handleWidgetSelect = (widgetId) => {
    setSelectedWidgetId(widgetId);
    // Optionally, clear block selection when selecting a widget directly
    // setSelectedBlockId(null);
  };

  // Get the selected widget and its schema
  const selectedWidget = selectedWidgetId && page?.widgets[selectedWidgetId];
  const selectedWidgetSchema = selectedWidget ? widgetSchemas[selectedWidget.type] || {} : {};
  // Add this handler
  const handleAddBlockClick = (widgetId) => {
    setActiveWidgetId(widgetId);
    setIsBlockSelectorOpen(true);
  };

  if (projectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading project..." />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>No active project selected. Please select a project first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message="Loading page..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>No page selected. Please select a page from the Pages list.</p>
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
        previewMode={previewMode}
        onPreviewModeChange={handlePreviewModeChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <WidgetList
          page={page}
          widgets={page?.widgets || {}}
          widgetSchemas={widgetSchemas}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          onWidgetSelect={handleWidgetSelect}
          onBlockSelect={handleBlockSelect}
          onWidgetsReorder={handleWidgetsReorder}
          onBlocksReorder={reorderBlocks}
          onDuplicateWidget={(id) => {
            duplicateWidget(id);
            useAutoSave.getState().setStructureModified(true);
          }}
          onDeleteWidget={handleDeleteWidgetClick}
          onAddWidgetClick={handleAddWidgetClick}
          onAddBlockClick={handleAddBlockClick}
        />

        <PreviewPanel
          page={page}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          widgets={page?.widgets}
          widgetSchemas={widgetSchemas}
          themeSettings={themeSettings}
          previewMode={previewMode}
        />

        <SettingsPanel
          selectedWidget={selectedWidget}
          selectedWidgetSchema={selectedWidgetSchema}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          onSettingChange={handleSettingChange}
          onBlockSettingChange={handleBlockSettingChange}
          onBackToWidget={() => setSelectedBlockId(null)}
        />
      </div>

      <WidgetSelector
        isOpen={isWidgetSelectorOpen}
        onClose={() => setIsWidgetSelectorOpen(false)}
        widgetSchemas={widgetSchemas}
        onSelectWidget={(type, position) => {
          addWidget(type, position);
          useAutoSave.getState().setStructureModified(true);
        }}
        position={insertPosition}
      />

      <BlockSelector
        isOpen={isBlockSelectorOpen}
        onClose={() => {
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
        }}
        widgetSchema={activeWidgetId ? widgetSchemas[page?.widgets[activeWidgetId]?.type] : null}
        onSelectBlock={(blockType) => {
          if (activeWidgetId) {
            useWidgetStore.getState().addBlock(activeWidgetId, blockType);
            useAutoSave.getState().markWidgetModified(activeWidgetId);
          }
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
        }}
      />

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
      />
    </div>
  );
}
