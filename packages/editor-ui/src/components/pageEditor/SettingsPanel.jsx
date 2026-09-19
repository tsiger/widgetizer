import { ArrowLeft } from "lucide-react";
import { SettingsRenderer } from "../settings";
import usePageStore from "../../stores/pageStore";
import useWidgetStore from "../../stores/widgetStore";
import useAutoSave from "../../stores/saveStore";
import { useTranslation } from "react-i18next";
import { useThemeLocale } from "../../hooks/useThemeLocale";
import useCollections from "../../hooks/useCollections";
import useToastStore from "../../stores/toastStore";

const DEFAULT_ITEMS_PER_PAGE = 12;

export default function SettingsPanel({
  selectedWidget,
  selectedWidgetSchema,
  selectedWidgetId,
  selectedBlockId,
  selectedGlobalWidgetId,
  selectedThemeGroup,
  themeSettings,
  widgetSchemas,
  onBackToWidget,
}) {
  const { t } = useTranslation();
  const { schemas: collectionSchemas } = useCollections();
  const { tTheme } = useThemeLocale();
  const { page, globalWidgets, updateThemeSetting } = usePageStore();
  const { updateWidgetSettings, updateGlobalWidgetSettings, updateBlockSettings } = useWidgetStore();
  const { markWidgetModified, setThemeSettingsModified } = useAutoSave();
  const showToast = useToastStore((state) => state.showToast);

  const isGlobalWidget = !!selectedGlobalWidgetId;
  const isThemeSettings = !!selectedThemeGroup;
  const globalWidget = isGlobalWidget ? globalWidgets[selectedGlobalWidgetId] : null;

  const currentWidget = isGlobalWidget ? globalWidget : selectedWidget;
  const currentWidgetSchema = isGlobalWidget
    ? globalWidget
      ? widgetSchemas?.[globalWidget.type] || {}
      : null
    : selectedWidgetSchema;

  const selectedBlock = selectedBlockId && currentWidget?.blocks?.[selectedBlockId];
  const selectedBlockSchema =
    selectedBlock && currentWidgetSchema?.blocks?.find((block) => block.type === selectedBlock.type);

  const settings = isThemeSettings
    ? themeSettings?.settings?.global?.[selectedThemeGroup] || []
    : selectedBlockId
      ? selectedBlockSchema?.settings
      : currentWidgetSchema?.settings;

  const currentValues = isThemeSettings
    ? (themeSettings?.settings?.global?.[selectedThemeGroup] || []).reduce(
        (acc, s) => ({ ...acc, [s.id]: s.value }),
        {},
      )
    : selectedBlockId
      ? selectedBlock?.settings
      : currentWidget?.settings;

  if (!isThemeSettings && (!currentWidget || (!selectedWidgetId && !selectedGlobalWidgetId))) {
    return (
      <div className="w-58 bg-white border-l border-slate-200">
        <div className="p-4">
          <p className="text-slate-500 text-center mt-8">{t("pageEditor.settingsPanel.emptyState")}</p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (settingId, value) => {
    if (isThemeSettings) {
      updateThemeSetting(selectedThemeGroup, settingId, value);
      setThemeSettingsModified(true);
    } else if (isGlobalWidget && selectedBlockId) {
      updateBlockSettings(selectedGlobalWidgetId, selectedBlockId, settingId, value);
      markWidgetModified(selectedGlobalWidgetId);
    } else if (isGlobalWidget) {
      updateGlobalWidgetSettings(selectedGlobalWidgetId, settingId, value);
      markWidgetModified(selectedGlobalWidgetId);
    } else if (selectedBlockId) {
      updateBlockSettings(selectedWidgetId, selectedBlockId, settingId, value);
      markWidgetModified(selectedWidgetId);
    } else {
      const perPageSetting = currentWidgetSchema?.collection?.perPageSetting;
      if (settingId === "paginate" && value === true) {
        const holder = Object.entries(page?.widgets || {}).find(
          ([id, widget]) => id !== selectedWidgetId && widget?.settings?.paginate === true,
        )?.[1];
        if (holder) {
          const holderName = holder.settings?.name || tTheme(widgetSchemas?.[holder.type]?.displayName) || holder.type;
          showToast(t("pageEditor.paginate.onlyOne", { widget: holderName }), "error");
          return;
        }
        updateWidgetSettings(selectedWidgetId, "listing_anchor", true);
        const perPageDefault = Array.isArray(currentWidgetSchema?.settings)
          ? currentWidgetSchema.settings.find((setting) => setting?.id === perPageSetting)?.default
          : undefined;
        if (perPageSetting && !(Number(currentValues?.[perPageSetting] ?? perPageDefault) >= 1)) {
          updateWidgetSettings(selectedWidgetId, perPageSetting, DEFAULT_ITEMS_PER_PAGE);
        }
      } else if (settingId === "listing_anchor" && value === false && currentValues?.paginate) {
        updateWidgetSettings(selectedWidgetId, "paginate", false);
      } else if (settingId === perPageSetting && currentValues?.paginate && !(Number(value) >= 1)) {
        value = 1;
      }
      updateWidgetSettings(selectedWidgetId, settingId, value);
      markWidgetModified(selectedWidgetId);
    }
  };

  // Calculate display name with priority: custom name > block name > widget schema name > fallback
  const displayName = isThemeSettings
    ? tTheme("tTheme:global." + selectedThemeGroup + ".name")
    : selectedBlockId
      ? tTheme(selectedBlockSchema?.displayName) || t("pageEditor.settingsPanel.blockSettings")
      : currentWidget?.settings?.name || // Use custom name if set
        tTheme(currentWidgetSchema?.displayName) ||
        (isGlobalWidget
          ? selectedGlobalWidgetId === "header"
            ? t("pageEditor.settingsPanel.header")
            : t("pageEditor.settingsPanel.footer")
          : t("pageEditor.settingsPanel.widgetSettings"));

  // Inject "name" setting for widgets (not blocks) - shown at the end under "Widget settings" header
  const widgetNameHeader = {
    id: "widget_settings_header",
    type: "header",
    label: t("pageEditor.widgetName.header"),
  };
  const widgetNameSetting = {
    id: "name",
    type: "text",
    label: t("pageEditor.widgetName.label"),
    description: t("pageEditor.widgetName.description"),
    placeholder: t("pageEditor.widgetName.placeholder"),
  };

  // A listing widget can be marked as its collection's main page, which is what
  // breadcrumbs hang that collection's items under. Injected here rather than
  // declared per widget: it applies to any widget whose schema says what it
  // lists, and no theme should have to repeat it.
  const listedCollectionType = currentWidgetSchema?.collection?.type;
  const listedCollection = (collectionSchemas || []).find((schema) => schema.type === listedCollectionType);
  const anchorSetting = listedCollectionType
    ? {
        id: "listing_anchor",
        type: "checkbox",
        label: t("pageEditor.listingAnchor.label", {
          collection: listedCollection?.displayNamePlural || listedCollection?.displayName || listedCollectionType,
        }),
        description: t("pageEditor.listingAnchor.description"),
        default: false,
      }
    : null;

  const paginateSetting =
    listedCollectionType && currentWidgetSchema?.collection?.perPageSetting
      ? {
          id: "paginate",
          type: "checkbox",
          label: t("pageEditor.paginate.label"),
          description: t("pageEditor.paginate.description"),
          default: false,
        }
      : null;

  // Combine settings with name setting at the end for widgets (not global widgets, blocks, or theme settings)
  const allSettings =
    !isThemeSettings && !selectedBlockId && !isGlobalWidget && settings
      ? [
          ...settings,
          ...(paginateSetting ? [paginateSetting] : []),
          ...(anchorSetting ? [anchorSetting] : []),
          widgetNameHeader,
          widgetNameSetting,
        ]
      : settings;

  return (
    <div className="w-58 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="px-3 pt-4 pb-2 border-b border-slate-100 font-bold">
        {selectedBlockId ? (
          <div className="flex items-center gap-2">
            <button onClick={onBackToWidget} className="p-1 hover:bg-slate-100 rounded-sm text-slate-500">
              <ArrowLeft size={16} />
            </button>
            <span>{displayName}</span>
          </div>
        ) : (
          <span>{displayName}</span>
        )}
      </div>
      <div className="px-3 pb-4 flex-1 overflow-y-auto">
        <div
          key={
            isThemeSettings
              ? `theme-${selectedThemeGroup}`
              : selectedBlockId
                ? `block-${selectedBlockId}`
                : isGlobalWidget
                  ? `global-${selectedGlobalWidgetId}`
                  : `widget-${selectedWidgetId}`
          }
          className="page-editor-settings space-y-4"
        >
          {allSettings?.map((setting, index) => {
            // Create a unique key that includes widget/block/theme context to force React to remount on switch
            const contextKey = isThemeSettings
              ? `theme-${selectedThemeGroup}`
              : selectedBlockId
                ? `block-${selectedBlockId}`
                : isGlobalWidget
                  ? `global-${selectedGlobalWidgetId}`
                  : `widget-${selectedWidgetId}`;
            return (
              <SettingsRenderer
                key={`${contextKey}-${setting.id}`}
                setting={setting}
                value={currentValues?.[setting.id]}
                onChange={handleSettingChange}
                isFirst={index === 0}
                allowExpand
                // The richtext stable-link picker is offered everywhere, theme
                // settings included. It was withheld from them while nothing
                // maintained a reference stored there — the picker would have
                // produced links that never resolved, never followed a rename and
                // were never cleared on deletion. Theme settings now go through the
                // same resolution, seeding, duplication and cleanup as widgets, so
                // the reason no longer holds.
                allowInternalLinkTargets
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
