import Tooltip from "../../components/ui/Tooltip";
import { IconButton } from "../ui/Button";
import { Image, Search, Trash2, Check, Edit2 } from "lucide-react";
import { API_URL } from "../../config";
import { formatDate as formatDateUtil } from "../../utils/dateFormatter";
import useAppSettings from "../../hooks/useAppSettings";

export default function MediaListItem({ file, isSelected, onSelect, onDelete, onView, onEdit, activeProject, usageTitleMap = {} }) {
  // Get app settings for date formatting
  const { settings: appSettings } = useAppSettings();

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    const dateFormat = appSettings?.general?.dateFormat || "MM/DD/YYYY";
    return formatDateUtil(dateString, dateFormat);
  };

  const cellClass = `py-3 px-4 ${isSelected ? "bg-pink-50" : ""}`;
  const usageBadgeClass =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800";
  const usageEntries = Array.isArray(file.usedIn) ? file.usedIn : [];
  const isInUse = usageEntries.length > 0;

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
          className="border border-transparent bg-white/80 shadow-sm hover:border-slate-200 hover:bg-white hover:shadow-md"
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
        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
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
        {file.metadata?.title || file.filename}
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
      <td className={cellClass}>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Tooltip content="View">
            <IconButton onClick={onView} variant="neutral" size="sm">
              <Search size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Edit metadata">
            <IconButton onClick={onEdit} variant="neutral" size="sm">
              <Edit2 size={18} />
            </IconButton>
          </Tooltip>
          {!isInUse && (
            <Tooltip content="Delete">
              <IconButton onClick={onDelete} variant="danger" size="sm">
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </td>
    </>
  );
}
