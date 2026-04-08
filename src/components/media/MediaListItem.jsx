import Tooltip from "../../components/ui/Tooltip";
import { IconButton } from "../ui/Button";
import { Image, Search, Trash2, Check, Edit2, MoreVertical } from "lucide-react";
import { API_URL } from "../../config";
import useFormatDate from "../../hooks/useFormatDate";

export default function MediaListItem({
  file,
  isSelected,
  onSelect,
  onDelete,
  onView,
  onEdit,
  activeProject,
  usageTitleMap = {},
  openMenu = false,
  onMenuToggle,
  onMenuClose,
  menuRef,
}) {
  const { formatDate } = useFormatDate();

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const cellClass = `py-3 px-4 ${isSelected ? "bg-pink-50" : ""}`;
  const usageBadgeClass =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800";
  const usageEntries = Array.isArray(file.usedIn) ? file.usedIn : [];
  const isInUse = usageEntries.length > 0;
  const menuButtonClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors";

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
    <>
      <td className={cellClass}>
        <IconButton
          onClick={onSelect}
          variant="neutral"
          size="sm"
          className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
        >
          {isSelected ? (
            <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
              <Check size={12} />
            </div>
          ) : (
            <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
          )}
        </IconButton>
      </td>
      <td className={cellClass}>
        <div
          className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center cursor-pointer"
          onClick={onView}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onView()}
        >
          {file.type?.startsWith("image/") ? (
            <img
              src={API_URL(
                `/api/media/projects/${activeProject.id}${file.type === "image/svg+xml" ? file.path : file.sizes?.thumb?.path || file.thumbnail || file.path}`,
              )}
              alt={file.metadata?.alt || file.originalName}
              className={`w-full h-full object-contain rounded ${file.type === "image/svg+xml" ? "p-1" : ""}`}
            />
          ) : (
            <Image className="text-slate-400" size={24} />
          )}
        </div>
      </td>
      <td className={`${cellClass} max-w-xs truncate`} title={file.metadata?.title || file.filename}>
        <button type="button" onClick={onEdit} className="truncate text-left hover:text-pink-600 transition-colors">
          {file.metadata?.title || file.filename}
        </button>
      </td>
      <td className={cellClass}>{formatFileSize(file.size)}</td>
      <td className={cellClass}>{file.width && file.height ? `${file.width}×${file.height}` : "-"}</td>
      <td className={cellClass}>{formatDate(file.uploaded)}</td>
      <td className={cellClass}>
        {isInUse ? (
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
        ) : (
          <span className="text-slate-400 text-xs">Unused</span>
        )}
      </td>
      <td className={`${cellClass} text-right`}>
        <div className="relative inline-flex items-center justify-end" ref={menuRef}>
          <IconButton
            onClick={onMenuToggle}
            variant="neutral"
            size="sm"
            className={`border transition-all ${
              openMenu
                ? "border-pink-200 bg-pink-50 text-pink-600"
                : "border-transparent bg-white/80 hover:border-slate-200 hover:bg-white hover:text-slate-900"
            }`}
            aria-label="Media actions"
            aria-haspopup="menu"
            aria-expanded={openMenu}
          >
            <MoreVertical size={18} />
          </IconButton>

          {openMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              <button type="button" onClick={() => { onMenuClose(); onView(); }} className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}>
                <Search size={14} />
                View
              </button>
              <button type="button" onClick={() => { onMenuClose(); onEdit(); }} className={`${menuButtonClass} text-slate-700 hover:bg-slate-50`}>
                <Edit2 size={14} />
                Edit metadata
              </button>
              {!isInUse && (
                <>
                  <div className="my-1 border-t border-slate-200" />
                  <button type="button" onClick={() => { onMenuClose(); onDelete(); }} className={`${menuButtonClass} text-red-600 hover:bg-red-50`}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </td>
    </>
  );
}
