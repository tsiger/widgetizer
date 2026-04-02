import { Check, Search, Trash2, Image, Edit2 } from "lucide-react";
import { API_URL } from "../../config";
import Tooltip from "../ui/Tooltip";

export default function MediaGridItem({
  file,
  isSelected,
  onSelect,
  onDelete,
  onView,
  onEdit,
  activeProject,
  usageTitleMap = {},
}) {
  const usageEntries = Array.isArray(file.usedIn) ? file.usedIn : [];
  const isInUse = usageEntries.length > 0;
  const usageBadgeClass =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800";

  const resolveUsageTitle = (usageEntry) => {
    if (!usageEntry) return null;

    if (typeof usageEntry === "object") {
      return usageEntry.title || usageEntry.name || usageEntry.id || null;
    }

    if (usageTitleMap[usageEntry]) {
      return usageTitleMap[usageEntry];
    }

    if (usageEntry.startsWith("global:")) {
      const globalKey = usageEntry.replace("global:", "");
      return `${globalKey.charAt(0).toUpperCase() + globalKey.slice(1)} (Global)`;
    }

    return usageEntry;
  };

  const usageTitles = usageEntries.map(resolveUsageTitle).filter(Boolean);

  return (
    <div
      className={`group relative bg-white border ${
        isSelected ? "border-pink-500 ring-2 ring-pink-500" : "border-slate-200"
      } rounded-lg`}
    >
      <div className="aspect-square overflow-hidden rounded-t-lg bg-slate-100 flex items-center justify-center">
        {file.type?.startsWith("image/") ? (
          <img
            src={API_URL(
              `/api/media/projects/${activeProject.id}${file.type === "image/svg+xml" ? file.path : file.sizes?.thumb?.path || file.thumbnail || file.path}`,
            )}
            alt={file.metadata?.alt || file.originalName}
            className={`w-full h-full object-contain ${file.type === "image/svg+xml" ? "p-2" : ""}`}
          />
        ) : (
          <Image className="text-slate-400" size={48} />
        )}
      </div>
      <div className="p-2 text-sm truncate" title={file.metadata?.title || file.filename}>
        {file.metadata?.title || file.filename}
      </div>

      <div className="absolute top-2 left-2 z-10 flex items-center space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`p-1 rounded-full ${
            isSelected ? "bg-pink-500 text-white" : "bg-white text-slate-500 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isSelected ? <Check size={16} /> : <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>}
        </button>

        {/* Usage indicator */}
        {isInUse && (
          <Tooltip
            content={
              <div className="min-w-44 max-w-64">
                <div className="mb-1 font-medium">Used in</div>
                <ul className="space-y-1">
                  {usageTitles.map((usageTitle) => (
                    <li key={usageTitle} className="leading-relaxed">
                      {usageTitle}
                    </li>
                  ))}
                </ul>
              </div>
            }
            contentClassName="max-w-64 whitespace-normal text-left"
          >
            <div className={usageBadgeClass}>
              Used in {usageEntries.length} place{usageEntries.length > 1 ? "s" : ""}
            </div>
          </Tooltip>
        )}
      </div>

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
          title="View"
        >
          <Search size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
          title="Edit metadata"
        >
          <Edit2 size={16} className="text-slate-600" />
        </button>
        {!isInUse && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}
