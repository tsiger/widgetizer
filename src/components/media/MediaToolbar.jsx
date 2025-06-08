import { Grid, List, Search, Trash2 } from "lucide-react";
import { IconButton } from "../ui/Button";
import Button from "../ui/Button";

export default function MediaToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  selectedFiles,
  onBulkDelete,
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

        {selectedFiles.length > 0 && (
          <div className="ml-4 flex items-center">
            <span className="text-sm text-slate-600 mr-2">{selectedFiles.length} selected</span>
            <Button
              onClick={onBulkDelete}
              variant="danger"
              size="sm"
              icon={<Trash2 size={18} />}
              title="Delete Selected"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search media..."
          className="pl-10 pr-4 py-2 border border-slate-300 rounded-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
