import { Grid, List, Search, Trash2 } from "lucide-react";

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
        <button
          className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-200" : ""}`}
          onClick={() => onViewModeChange("grid")}
          title="Grid View"
        >
          <Grid size={20} />
        </button>
        <button
          className={`p-2 rounded ${viewMode === "list" ? "bg-slate-200" : ""}`}
          onClick={() => onViewModeChange("list")}
          title="List View"
        >
          <List size={20} />
        </button>

        {selectedFiles.length > 0 && (
          <div className="ml-4 flex items-center">
            <span className="text-sm text-slate-600 mr-2">{selectedFiles.length} selected</span>
            <button onClick={onBulkDelete} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete Selected">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search media..."
          className="pl-10 pr-4 py-2 border border-slate-300 rounded-sm"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
