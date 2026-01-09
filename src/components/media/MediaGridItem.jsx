import { Check, Search, Trash2, Image, Edit2 } from "lucide-react";
import { API_URL } from "../../config";

export default function MediaGridItem({ file, isSelected, onSelect, onDelete, onView, onEdit, activeProject }) {
  return (
    <div
      className={`group relative bg-white border ${
        isSelected ? "border-pink-500 ring-2 ring-pink-500" : "border-slate-200"
      } rounded-lg overflow-hidden`}
    >
      <div className="aspect-square bg-slate-100 flex items-center justify-center">
        {file.type === "image/svg+xml" ? (
          <img
            src={API_URL(`/api/media/projects/${activeProject.id}${file.path}`)}
            alt={file.metadata?.alt || file.originalName}
            className="w-full h-full object-contain p-2"
          />
        ) : file.sizes?.thumb ? (
          <img
            src={API_URL(`/api/media/projects/${activeProject.id}${file.sizes.thumb.path}`)}
            alt={file.metadata?.alt || file.originalName}
            className="w-full h-full object-contain"
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
        {file.usedIn && file.usedIn.length > 0 && (
          <div
            className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold"
            title={`Used in ${file.usedIn.length} page${file.usedIn.length > 1 ? "s" : ""}: ${file.usedIn.join(", ")}`}
          >
            {file.usedIn.length}
          </div>
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
      </div>
    </div>
  );
}
