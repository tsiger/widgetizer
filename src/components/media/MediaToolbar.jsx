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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder={t("components.mediaToolbar.searchPlaceholder")}
          className="form-input pl-10"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
