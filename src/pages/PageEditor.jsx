import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import WidgetList from "../components/pageEditor/WidgetList";
import PreviewPanel from "../components/pageEditor/PreviewPanel";
import SettingsPanel from "../components/pageEditor/SettingsPanel";
import EditorTopBar from "../components/pageEditor/EditorTopBar";
import WidgetSelector from "../components/pageEditor/WidgetSelector";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import BlockSelector from "../components/pageEditor/blocks/BlockSelector";

import usePageStore from "../stores/pageStore";
import useWidgetStore from "../stores/widgetStore";
import useAutoSave from "../stores/saveStore";
import useThemeStore from "../stores/themeStore";
import useNavigationGuard from "../hooks/useNavigationGuard";

export default function PageEditor() {
  const [searchParams] = useSearchParams();
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState(0);
  const [widgetTriggerRef, setWidgetTriggerRef] = useState(null);
  const [activeWidgetTriggerPosition, setActiveWidgetTriggerPosition] = useState(null);
  const [isBlockSelectorOpen, setIsBlockSelectorOpen] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState(null);
  const [blockTriggerRef, setBlockTriggerRef] = useState(null);
  const [activeBlockTriggerKey, setActiveBlockTriggerKey] = useState(null);
  const [blockInsertPosition, setBlockInsertPosition] = useState(null);
  const [previewMode, setPreviewMode] = useState("desktop");

  const { page, loading, error } = usePageStore();
  const {
    schemas: widgetSchemas,
    selectedWidgetId,
    selectedBlockId,
    selectedGlobalWidgetId,
    setSelectedWidgetId,
    setSelectedBlockId,
    setSelectedGlobalWidgetId,
    addWidget,
    deleteWidget,
    duplicateWidget,
    reorderWidgets,
    updateWidgetSettings,
    updateGlobalWidgetSettings,
    updateBlockSettings,
    reorderBlocks,
  } = useWidgetStore();
  const { hasUnsavedChanges, isSaving, isAutoSaving, lastSaved, save, startAutoSave, stopAutoSave } = useAutoSave();
  const { settings: themeSettings } = useThemeStore();

  // Add navigation guard
  useNavigationGuard();

  // Load initial data
  useEffect(() => {
    const pageId = searchParams.get("pageId");
    if (pageId) {
      usePageStore.getState().loadPage(pageId);
      useWidgetStore.getState().loadSchemas();
      useThemeStore.getState().loadSettings();
    }
  }, [searchParams]);

  // Setup auto-save
  useEffect(() => {
    startAutoSave();
    return () => stopAutoSave();
  }, [startAutoSave, stopAutoSave]);

  // Handle preview mode change
  const handlePreviewModeChange = (mode) => {
    setPreviewMode(mode);
  };

  // Handle widget deletion (immediate, no confirmation)
  const handleDeleteWidgetClick = (widgetId) => {
    if (!page || !page.widgets[widgetId]) return;

    deleteWidget(widgetId);
    useAutoSave.getState().setStructureModified(true);
  };

  // Handle opening the widget selector
  const handleAddWidgetClick = (position, triggerRef) => {
    setInsertPosition(position);
    setWidgetTriggerRef(triggerRef);
    setActiveWidgetTriggerPosition(position);
    setIsWidgetSelectorOpen(true);
  };

  // Handle widget settings change
  const handleSettingChange = (widgetId, settingId, value) => {
    updateWidgetSettings(widgetId, settingId, value);
    useAutoSave.getState().markWidgetModified(widgetId);
  };

  // NEW: Handle global widget settings change
  const handleGlobalWidgetSettingChange = (widgetType, settingId, value) => {
    updateGlobalWidgetSettings(widgetType, settingId, value);
    useAutoSave.getState().markWidgetModified(widgetType);
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
    // Clear block selection when selecting a widget directly
    // setSelectedBlockId(null);
  };

  // NEW: Handle global widget selection
  const handleGlobalWidgetSelect = (widgetType) => {
    setSelectedGlobalWidgetId(widgetType);
  };

  // Get the selected widget and its schema
  const selectedWidget = selectedWidgetId && page?.widgets[selectedWidgetId];
  const selectedWidgetSchema = selectedWidget ? widgetSchemas[selectedWidget.type] || {} : {};

  // Add this handler
  const handleAddBlockClick = (widgetId, triggerRef, position = null) => {
    setActiveWidgetId(widgetId);
    setBlockTriggerRef(triggerRef);
    const triggerKey = position !== null ? `${widgetId}-${position}` : `${widgetId}-add`;

    setActiveBlockTriggerKey(triggerKey);
    setBlockInsertPosition(position);
    setIsBlockSelectorOpen(true);
  };

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
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          onWidgetSelect={handleWidgetSelect}
          onBlockSelect={handleBlockSelect}
          onGlobalWidgetSelect={handleGlobalWidgetSelect}
          onWidgetsReorder={handleWidgetsReorder}
          onBlocksReorder={reorderBlocks}
          onDuplicateWidget={(id) => {
            duplicateWidget(id);
            useAutoSave.getState().setStructureModified(true);
          }}
          onDeleteWidget={handleDeleteWidgetClick}
          onAddWidgetClick={handleAddWidgetClick}
          onAddBlockClick={(widgetId, triggerRef, position) => handleAddBlockClick(widgetId, triggerRef, position)}
          isWidgetSelectorOpen={isWidgetSelectorOpen}
          activeWidgetTriggerPosition={activeWidgetTriggerPosition}
          isBlockSelectorOpen={isBlockSelectorOpen}
          activeWidgetId={activeWidgetId}
          activeBlockTriggerKey={activeBlockTriggerKey}
        />

        <PreviewPanel
          page={page}
          selectedWidgetId={selectedWidgetId}
          selectedBlockId={selectedBlockId}
          selectedGlobalWidgetId={selectedGlobalWidgetId}
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
          selectedGlobalWidgetId={selectedGlobalWidgetId}
          widgetSchemas={widgetSchemas} // NEW: Pass widget schemas for global widget settings
          onSettingChange={handleSettingChange}
          onBlockSettingChange={handleBlockSettingChange}
          onGlobalWidgetSettingChange={handleGlobalWidgetSettingChange}
          onBackToWidget={() => setSelectedBlockId(null)}
        />
      </div>

      <WidgetSelector
        isOpen={isWidgetSelectorOpen}
        onClose={() => {
          setIsWidgetSelectorOpen(false);
          setWidgetTriggerRef(null);
          setActiveWidgetTriggerPosition(null);
        }}
        widgetSchemas={widgetSchemas}
        onSelectWidget={(type, position) => {
          addWidget(type, position);
          useAutoSave.getState().setStructureModified(true);
        }}
        position={insertPosition}
        triggerRef={widgetTriggerRef}
      />

      <BlockSelector
        isOpen={isBlockSelectorOpen}
        onClose={() => {
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
          setBlockTriggerRef(null);
          setActiveBlockTriggerKey(null);
          setBlockInsertPosition(null);
        }}
        widgetSchema={activeWidgetId ? widgetSchemas[page?.widgets[activeWidgetId]?.type] : null}
        onSelectBlock={(blockType) => {
          if (activeWidgetId) {
            const newBlockId = useWidgetStore.getState().addBlock(activeWidgetId, blockType, blockInsertPosition);
            useAutoSave.getState().markWidgetModified(activeWidgetId);

            // Keep the widget selected and select the new block
            setSelectedWidgetId(activeWidgetId);
            setSelectedBlockId(newBlockId);
          }
          setIsBlockSelectorOpen(false);
          setActiveWidgetId(null);
          setBlockInsertPosition(null);
        }}
        triggerRef={blockTriggerRef}
      />
    </div>
  );
}
