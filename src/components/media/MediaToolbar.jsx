import { Grid, List, Search, Trash2, RefreshCw } from "lucide-react";
import { IconButton } from "../ui/Button";
import Button from "../ui/Button";

export default function MediaToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  selectedFiles,
  onBulkDelete,
  onRefreshUsage,
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-between mb-4 items-center">
      <div className="flex items-center mb-2 sm:mb-0">
        <IconButton
          variant={viewMode === "grid" ? "primary" : "neutral"}
          onClick={() => onViewModeChange("grid")}
          title="Grid View"
        >
          <Grid size={20} />
        </IconButton>
        <IconButton
          variant={viewMode === "list" ? "primary" : "neutral"}
          onClick={() => onViewModeChange("list")}
          title="List View"
        >
          <List size={20} />
        </IconButton>

        <div className="ml-4 flex items-center space-x-2">
          {selectedFiles.length > 0 && (
            <>
              <span className="text-sm text-slate-600">{selectedFiles.length} selected</span>
              <Button
                onClick={onBulkDelete}
                variant="danger"
                size="sm"
                icon={<Trash2 size={18} />}
                title="Delete Selected"
              >
                Delete
              </Button>
            </>
          )}

          <Button
            onClick={onRefreshUsage}
            variant="neutral"
            size="sm"
            icon={<RefreshCw size={18} />}
            title="Refresh Usage Tracking"
          >
            Refresh Usage
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search media..."
          className="form-input pl-10"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
