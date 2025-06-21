import MediaListItem from "./MediaListItem";
import { IconButton } from "../ui/Button";
import { Check, Image } from "lucide-react";
import Table from "../ui/Table";

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
    <Table
      headers={[
        <IconButton onClick={onSelectAll} variant="neutral" size="sm" key="select-all">
          {selectedFiles.length === files.length && files.length > 0 ? (
            <div className="w-4 h-4 bg-pink-500 text-white flex items-center justify-center rounded-sm">
              <Check size={12} />
            </div>
          ) : (
            <div className="w-4 h-4 border border-slate-400 rounded-sm"></div>
          )}
        </IconButton>,
        "Preview",
        "Filename",
        "Size",
        "Dimensions",
        "Uploaded",
        "Usage",
        "Actions",
      ]}
      data={files}
      emptyMessage={
        <div className="text-center py-4">
          <Image className="mx-auto mb-2 text-slate-400" size={32} />
          <div className="font-medium">No media files</div>
          <div className="text-sm text-slate-500">Upload some files to get started.</div>
        </div>
      }
      renderRow={(file) => (
        <MediaListItem
          file={file}
          isSelected={selectedFiles.includes(file.id)}
          onSelect={() => onFileSelect(file.id)}
          onDelete={() => onFileDelete(file.id, file.filename)}
          onView={() => onFileView(file)}
          onEdit={() => onFileEdit(file)}
          activeProject={activeProject}
        />
      )}
    />
  );
}
