import { Grid, List, Search, Trash2, RefreshCw } from "lucide-react";
import { IconButton } from "../ui/Button";
import Button from "../ui/Button";
import { useTranslation } from "react-i18next";

export default function MediaToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  selectedFiles,
  onBulkDelete,
  onRefreshUsage,
  filterType,
  onFilterTypeChange,
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex flex-wrap justify-between mb-4 items-center">
      <div className="flex items-center mb-2 sm:mb-0">
        <IconButton
          variant={viewMode === "grid" ? "primary" : "neutral"}
          onClick={() => onViewModeChange("grid")}
          title={t("components.mediaToolbar.gridView")}
        >
          <Grid size={20} />
        </IconButton>
        <IconButton
          variant={viewMode === "list" ? "primary" : "neutral"}
          onClick={() => onViewModeChange("list")}
          title={t("components.mediaToolbar.listView")}
        >
          <List size={20} />
        </IconButton>

        <div className="ml-4 flex items-center space-x-2">
          {selectedFiles.length > 0 && (
            <>
              <span className="text-sm text-slate-600">
                {t("components.mediaToolbar.selected", { count: selectedFiles.length })}
              </span>
              <Button
                onClick={onBulkDelete}
                variant="danger"
                size="sm"
                icon={<Trash2 size={18} />}
                title={t("components.mediaToolbar.deleteSelected")}
              >
                {t("components.mediaToolbar.delete")}
              </Button>
            </>
          )}

          <Button
            onClick={onRefreshUsage}
            variant="neutral"
            size="sm"
            icon={<RefreshCw size={18} />}
            title={t("components.mediaToolbar.refreshUsageTitle")}
          >
            {t("components.mediaToolbar.refreshUsage")}
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder={t("components.mediaToolbar.searchPlaceholder")}
            className="form-input py-1.5 pl-8 text-sm w-48 border-slate-200 rounded-md focus:ring-pink-500 focus:border-pink-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="form-select text-sm py-1.5 pl-3 pr-8 border-slate-200 rounded-md focus:ring-pink-500 focus:border-pink-500 bg-white"
        >
          <option value="all">{t("components.mediaToolbar.all")}</option>
          <option value="image">{t("components.mediaToolbar.images")}</option>
          <option value="video">{t("components.mediaToolbar.videos")}</option>
          <option value="audio">{t("components.mediaToolbar.audio")}</option>
        </select>
      </div>
    </div>
  );
}
