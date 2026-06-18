/**
 * RichTextInput component
 * A minimal rich text editor with bold, italic, and link formatting
 * Built on Tiptap (ProseMirror)
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useState } from "react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Unlink,
  Code,
  Eye,
  Maximize2,
  X,
  Check,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import ResolvedImage from "./ResolvedImage";
import MediaSelectorDrawer from "../../media/MediaSelectorDrawer";
import useProjectStore from "../../../stores/projectStore";
import { API_URL } from "../../../lib/config";
import "./RichTextInput.css";

// Heading levels exposed when `allowHeadings` is on. To offer more later, add the
// level here and its lucide icon below — H1 is intentionally omitted (reserved for
// the page/article title).
const HEADING_LEVELS = [2, 3, 4];
const HEADING_ICONS = { 2: Heading2, 3: Heading3, 4: Heading4 };

/**
 * Normalize a user-typed link URL. Internal/relative links (`/uploads/files/x.pdf`,
 * `/about.html`), anchors (`#section`), protocol-relative (`//host`), and query-only
 * (`?q=1`) values — plus explicit `http(s)://`/`mailto:`/`tel:` URLs — are kept
 * verbatim; only a bare domain (`example.com`) gets `https://` prepended. Keeping
 * relative paths intact is what lets a copied media URL (`/uploads/files/…`) link
 * correctly; the export pipeline rewrites those to `assets/files/…`.
 */
function normalizeLinkUrl(input) {
  const url = (input || "").trim();
  if (!url) return "";
  if (/^[/#?]/.test(url)) return url; // root-relative, protocol-relative, anchor, or query
  if (/^https?:\/\//i.test(url) || /^(mailto:|tel:)/i.test(url)) return url;
  return `https://${url}`;
}

function MenuBar({
  editor,
  isSourceMode,
  onToggleSource,
  allowSource,
  allowHeadings,
  allowImages,
  onInsertImage,
  onLinkFile,
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const setLink = useCallback(() => {
    const url = normalizeLinkUrl(linkUrl);
    if (!url) {
      // Empty/whitespace input removes the link.
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const openLinkInput = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  // Clicking an existing link opens the edit input prefilled with its href, instead of
  // doing nothing (links don't navigate inside the editor — openOnClick is false).
  // Reading the href off the clicked <a> is robust even when the click lands at a link
  // edge; applying via setLink → extendMarkRange then updates the whole link.
  useEffect(() => {
    const dom = editor?.view?.dom;
    if (!dom) return;
    const handleLinkClick = (event) => {
      const anchor = event.target.closest("a");
      if (!anchor || !dom.contains(anchor)) return;
      // Cancel the browser's default navigation: opening the input steals focus from the
      // editor mid-click, after which the browser would otherwise follow the link/new tab.
      event.preventDefault();
      setLinkUrl(anchor.getAttribute("href") || "");
      setShowLinkInput(true);
    };
    dom.addEventListener("click", handleLinkClick);
    return () => dom.removeEventListener("click", handleLinkClick);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <>
      {/* Link input row - appears above toolbar when active */}
      {showLinkInput && (
        <div className="richtext-link-row">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setLink();
              }
              if (e.key === "Escape") {
                setShowLinkInput(false);
                setLinkUrl("");
              }
            }}
            placeholder="Enter URL..."
            className="richtext-link-input"
            autoFocus
          />
          <button type="button" onClick={setLink} className="richtext-link-icon-button" title="Apply">
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="richtext-link-icon-button richtext-link-cancel"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main toolbar */}
      <div className="richtext-menubar">
        {!isSourceMode && (
          <>
            {allowHeadings && (
              <>
                {HEADING_LEVELS.map((level) => {
                  const Icon = HEADING_ICONS[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                      className={`richtext-menubar-button ${editor.isActive("heading", { level }) ? "is-active" : ""}`}
                      title={`Heading ${level}`}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
                <div className="richtext-menubar-divider" />
              </>
            )}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`richtext-menubar-button ${editor.isActive("bold") ? "is-active" : ""}`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`richtext-menubar-button ${editor.isActive("italic") ? "is-active" : ""}`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <div className="richtext-menubar-divider" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`richtext-menubar-button ${editor.isActive("bulletList") ? "is-active" : ""}`}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`richtext-menubar-button ${editor.isActive("orderedList") ? "is-active" : ""}`}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
            <div className="richtext-menubar-divider" />
            <button
              type="button"
              onClick={openLinkInput}
              className={`richtext-menubar-button ${editor.isActive("link") ? "is-active" : ""}`}
              title="Add Link"
            >
              <LinkIcon size={16} />
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
                className="richtext-menubar-button"
                title="Remove Link"
              >
                <Unlink size={16} />
              </button>
            )}
            <button type="button" onClick={onLinkFile} className="richtext-menubar-button" title="Link to file">
              <Paperclip size={16} />
            </button>
            {allowImages && (
              <>
                <div className="richtext-menubar-divider" />
                <button
                  type="button"
                  onClick={onInsertImage}
                  className="richtext-menubar-button"
                  title="Insert Image"
                >
                  <ImageIcon size={16} />
                </button>
              </>
            )}
          </>
        )}
        {isSourceMode && <span className="richtext-source-label">HTML Source</span>}
        {allowSource && (
          <>
            <div className="richtext-menubar-spacer" />
            <button
              type="button"
              onClick={onToggleSource}
              className={`richtext-menubar-button ${isSourceMode ? "is-active" : ""}`}
              title={isSourceMode ? "Rich Text View" : "HTML Source"}
            >
              {isSourceMode ? <Eye size={16} /> : <Code size={16} />}
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function RichTextInput({
  id,
  value = "",
  onChange,
  placeholder = "",
  allowSource = false,
  allowHeadings = false,
  allowImages = false,
  minHeight,
}) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickerMode, setPickerMode] = useState(null); // null | "image" | "fileLink"
  // Force re-render on selection change so toolbar buttons update
  const [, setSelectionUpdate] = useState(0);

  const activeProject = useProjectStore((state) => state.activeProject);

  // Map a stored portable `/uploads/…` path to a browser-loadable media URL for
  // *display only* (used by the ResolvedImage NodeView). External/absolute URLs
  // pass through untouched. The editor is keyed on the project id below, so this
  // resolver is always current without a ref.
  const resolveSrc = useCallback(
    (src) => {
      if (typeof src === "string" && src.startsWith("/uploads/") && activeProject) {
        return API_URL(`/api/media/projects/${activeProject.id}${src}`);
      }
      return src;
    },
    [activeProject],
  );

  const editor = useEditor({
    // StrictMode/dev remounts the editor (mount → destroy → reconnect). Deferring the
    // first render out of React's render pass keeps that timing stable and avoids
    // operating on a half-torn-down instance.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Enable basic formatting and lists
        heading: allowHeadings ? { levels: HEADING_LEVELS } : false,
        bulletList: true,
        orderedList: true,
        listItem: true,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        // StarterKit v3 bundles its own Link (openOnClick: true, target: _blank), which
        // would window.open() on click and shadow our configured Link below. Disable it
        // so only our openOnClick:false instance applies.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
      ...(allowImages ? [ResolvedImage.configure({ inline: false, allowBase64: false, resolveSrc })] : []),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      setSourceValue(html);
    },
    onSelectionUpdate: () => {
      // Trigger re-render so MenuBar updates active states
      setSelectionUpdate((n) => n + 1);
    },
    editorProps: {
      attributes: {
        class: "richtext-editor-content",
        "data-placeholder": placeholder,
      },
    },
  });

  // Update editor content when value changes externally. Bail if the editor is
  // destroyed: in dev, StrictMode disconnects then reconnects passive effects, so this
  // can re-run against a torn-down editor whose schema is null — calling getHTML() then
  // throws "Cannot read properties of null (reading 'cached')".
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external value to source mode
      setSourceValue(value);
    }
  }, [value, editor]);

  // Sync source changes back to editor when switching modes
  const handleToggleSource = useCallback(() => {
    if (isSourceMode && editor && !editor.isDestroyed) {
      // Switching from source to rich: apply source changes to editor
      editor.commands.setContent(sourceValue, false);
      onChange(sourceValue);
    }
    setIsSourceMode(!isSourceMode);
  }, [isSourceMode, sourceValue, editor, onChange]);

  const handleSourceChange = useCallback((e) => {
    setSourceValue(e.target.value);
  }, []);

  // Apply source changes on blur (when clicking away)
  const handleSourceBlur = useCallback(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(sourceValue, false);
      onChange(sourceValue);
    }
  }, [editor, sourceValue, onChange]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    // Prevent body scroll when expanded
    document.body.style.overflow = "hidden";
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    document.body.style.overflow = "";
    // Apply any pending source changes when collapsing
    if (isSourceMode && editor && !editor.isDestroyed) {
      editor.commands.setContent(sourceValue, false);
      onChange(sourceValue);
    }
  }, [isSourceMode, editor, sourceValue, onChange]);

  // Handle escape key to close expanded mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isExpanded) {
        handleCollapse();
      }
    };
    if (isExpanded) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isExpanded, handleCollapse]);

  // Insert a Media Library image. Stores the portable `/uploads/…` path (export-safe)
  // and prefers the `large` variant so published pages don't load a full-size original.
  const handleInsertImage = useCallback(
    (file) => {
      if (!editor || !file) return;
      const src = file.sizes?.large?.path || file.sizes?.medium?.path || file.path;
      if (!src) return;
      editor
        .chain()
        .focus()
        .setImage({ src, alt: file.metadata?.alt || "" })
        .run();
      setPickerMode(null);
    },
    [editor],
  );

  // Link the current selection to a Media Library file (PDF). Stores the portable
  // `/uploads/files/…` path; the export pipeline rewrites it to `assets/files/…`.
  // With no text selected, inserts the file's name as the linked text.
  const handleLinkFile = useCallback(
    (file) => {
      if (!editor || !file?.path) return;
      const href = file.path;
      const { from, to } = editor.state.selection;
      if (from === to) {
        const text = file.originalName || file.path.split("/").pop();
        editor
          .chain()
          .focus()
          .insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href } }] })
          .run();
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
      setPickerMode(null);
    },
    [editor],
  );

  const renderEditor = (expanded = false) => (
    <>
      <MenuBar
        editor={editor}
        isSourceMode={isSourceMode}
        onToggleSource={handleToggleSource}
        allowSource={allowSource}
        allowHeadings={allowHeadings}
        allowImages={allowImages}
        onInsertImage={() => setPickerMode("image")}
        onLinkFile={() => setPickerMode("fileLink")}
      />
      {isSourceMode ? (
        <textarea
          className="richtext-source-editor"
          value={sourceValue}
          onChange={handleSourceChange}
          onBlur={!expanded ? handleSourceBlur : undefined}
          placeholder={placeholder}
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </>
  );

  return (
    <>
      {/* Inline editor - hidden when expanded */}
      <div
        className={`richtext-editor ${isSourceMode ? "is-source-mode" : ""} ${isExpanded ? "is-hidden" : ""}`}
        id={id}
        style={minHeight ? { "--richtext-min-height": `${minHeight}px` } : undefined}
      >
        {!isExpanded && renderEditor(false)}
      </div>
      <button type="button" className="richtext-expand-button" onClick={handleExpand}>
        <Maximize2 size={14} />
        <span>Expand</span>
      </button>

      {/* Expanded overlay */}
      {isExpanded && (
        <div className="richtext-overlay" onClick={handleCollapse}>
          <div className="richtext-overlay-container" onClick={(e) => e.stopPropagation()}>
            <div className="richtext-overlay-header">
              <span className="richtext-overlay-title">Edit Content</span>
              <button type="button" className="richtext-overlay-close" onClick={handleCollapse} title="Close (Esc)">
                <X size={20} />
              </button>
            </div>
            <div className={`richtext-editor richtext-editor-expanded ${isSourceMode ? "is-source-mode" : ""}`}>
              {renderEditor(true)}
            </div>
            <div className="richtext-overlay-footer">
              <button type="button" className="richtext-done-button" onClick={handleCollapse}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library picker — image insertion or file linking. `elevated` keeps it
          above the expand overlay (z-1000). */}
      {pickerMode && (
        <MediaSelectorDrawer
          visible={!!pickerMode}
          onClose={() => setPickerMode(null)}
          onSelect={pickerMode === "image" ? handleInsertImage : handleLinkFile}
          activeProject={activeProject}
          filterType={pickerMode === "image" ? "image" : "file"}
          elevated
        />
      )}
    </>
  );
}
