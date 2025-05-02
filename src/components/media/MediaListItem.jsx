import Tooltip from "../../components/ui/Tooltip";
import { Image, Search, Trash2, Check, Edit2 } from "lucide-react";
import { API_URL } from "../../config";

export default function MediaListItem({ file, isSelected, onSelect, onDelete, onView, onEdit, activeProject }) {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <tr
      className={`border-b border-slate-200 ${
        isSelected ? "bg-pink-50" : ""
      } hover:bg-slate-50 transition-colors duration-150 group`}
    >
      <td className="p-2">
        <button onClick={onSelect} className="p-1">
          {isSelected ? (
            <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
              <Check size={12} />
            </div>
          ) : (
            <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
          )}
        </button>
      </td>
      <td className="p-2">
        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
          {file.thumbnail ? (
            <img
              src={`${API_URL(`/api/media/projects/${activeProject.id}${file.thumbnail}`)}`}
              alt={file.metadata?.alt || file.originalName}
              className="w-full h-full object-contain rounded"
            />
          ) : (
            <Image className="text-slate-400" size={24} />
          )}
        </div>
      </td>
      <td className="p-2 max-w-xs truncate" title={file.filename}>
        {file.filename}
      </td>
      <td className="p-2">{formatFileSize(file.size)}</td>
      <td className="p-2">{file.width && file.height ? `${file.width}×${file.height}` : "-"}</td>
      <td className="p-2">{formatDate(file.uploaded)}</td>
      <td className="p-2">
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Tooltip content="View">
            <button onClick={onView} className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 cursor-pointer">
              <Search size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Edit metadata">
            <button onClick={onEdit} className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 cursor-pointer">
              <Edit2 size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button onClick={onDelete} className="p-2 hover:bg-slate-100 rounded-sm text-red-600 cursor-pointer">
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
