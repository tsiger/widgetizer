import { useEffect, useRef, useState } from "react";
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
  onCopyUrl,
  activeProject,
  usageTitleMap,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Table
      className="[&_th:first-child]:w-12 [&_th:first-child]:!pl-4 [&_th:first-child]:!pr-1 [&_td:first-child]:w-12 [&_td:first-child]:!pl-4 [&_td:first-child]:!pr-1"
      headers={[
        <IconButton
          onClick={onSelectAll}
          variant="neutral"
          size="sm"
          key="select-all"
          className="border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
        >
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
          onDelete={() => onFileDelete(file.id, file.originalName)}
          onView={() => onFileView(file)}
          onEdit={() => onFileEdit(file)}
          onCopyUrl={() => onCopyUrl(file)}
          activeProject={activeProject}
          usageTitleMap={usageTitleMap}
          openMenu={openMenuId === file.id}
          onMenuToggle={() => setOpenMenuId(openMenuId === file.id ? null : file.id)}
          onMenuClose={() => setOpenMenuId(null)}
          menuRef={openMenuId === file.id ? menuRef : null}
        />
      )}
    />
  );
}
