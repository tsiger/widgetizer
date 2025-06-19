import MediaListItem from "./MediaListItem";
import { IconButton } from "../ui/Button";
import { Check } from "lucide-react";

export default function MediaList({
  files,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onFileDelete,
  onFileView,
  onFileEdit,
  activeProject,
}) {
  return (
    <div className="border border-slate-200 rounded-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2 text-left">
              <IconButton onClick={onSelectAll} variant="neutral" size="sm">
                {selectedFiles.length === files.length && files.length > 0 ? (
                  <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
                    <Check size={12} />
                  </div>
                ) : (
                  <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
                )}
              </IconButton>
            </th>
            <th className="p-2 text-left">Preview</th>
            <th className="p-2 text-left">Filename</th>
            <th className="p-2 text-left">Size</th>
            <th className="p-2 text-left">Dimensions</th>
            <th className="p-2 text-left">Uploaded</th>
            <th className="p-2 text-left">Usage</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <MediaListItem
              key={file.id}
              file={file}
              isSelected={selectedFiles.includes(file.id)}
              onSelect={() => onFileSelect(file.id)}
              onDelete={() => onFileDelete(file.id, file.filename)}
              onView={() => onFileView(file)}
              onEdit={() => onFileEdit(file)}
              activeProject={activeProject}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
