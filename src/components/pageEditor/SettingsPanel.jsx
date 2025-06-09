import { ArrowLeft } from "lucide-react";
import { SettingsRenderer } from "../settings";

export default function SettingsPanel({
  selectedWidget,
  selectedWidgetSchema,
  selectedWidgetId,
  selectedBlockId,
  onSettingChange,
  onBlockSettingChange,
  onBackToWidget,
}) {
  // Get the selected block if any
  const selectedBlock = selectedBlockId && selectedWidget?.blocks?.[selectedBlockId];
  const selectedBlockSchema =
    selectedBlock && selectedWidgetSchema?.blocks?.find((block) => block.type === selectedBlock.type);

  // Use block settings if a block is selected, otherwise use widget settings
  const settings = selectedBlockId ? selectedBlockSchema?.settings : selectedWidgetSchema?.settings;
  const currentValues = selectedBlockId ? selectedBlock?.settings : selectedWidget?.settings;

  if (!selectedWidget || !selectedWidgetId) {
    return (
      <div className="w-72 bg-white border-l border-slate-200">
        <div className="p-4">
          <p className="text-slate-500 text-center mt-8">Select a widget to edit its settings</p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (settingId, value) => {
    if (selectedBlockId) {
      onBlockSettingChange(selectedWidgetId, selectedBlockId, settingId, value);
    } else {
      onSettingChange(selectedWidgetId, settingId, value);
    }
  };

  return (
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col h-full">
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="font-bold mb-4 sticky top-0 bg-white pb-2 border-b border-slate-100 z-10">
          {selectedBlockId ? (
            <div className="flex items-center gap-2">
              <button onClick={onBackToWidget} className="p-1 hover:bg-slate-100 rounded-sm text-slate-500">
                <ArrowLeft size={16} />
              </button>
              <span>{selectedBlockSchema?.displayName || "Block Settings"}</span>
            </div>
          ) : (
            selectedWidgetSchema.displayName
          )}
        </div>

        <div className="space-y-6">
          {settings?.map((setting) => (
            <SettingsRenderer
              key={setting.id}
              setting={setting}
              value={currentValues?.[setting.id]}
              onChange={handleSettingChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
