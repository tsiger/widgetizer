import MediaGridItem from "./MediaGridItem";
import { Image } from "lucide-react";

export default function MediaGrid({
  files,
  selectedFiles,
  onFileSelect,
  onFileDelete,
  onFileView,
  onFileEdit,
  activeProject,
}) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-sm">
        <Image className="mx-auto mb-4 text-slate-400" size={48} />
        <h3 className="font-medium mb-1">No media files found</h3>
        <p className="text-slate-500">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {files.map((file) => (
        <MediaGridItem
          key={file.id}
          file={file}
          isSelected={selectedFiles.includes(file.id)}
          onSelect={() => onFileSelect(file.id)}
          onDelete={() => onFileDelete(file.id, file.originalName)}
          onView={() => onFileView(file)}
          onEdit={() => onFileEdit(file)}
          activeProject={activeProject}
        />
      ))}
    </div>
  );
}
