/**
 * RichTextInput component
 * A minimal rich text editor with bold, italic, and link formatting
 * Built on Tiptap (ProseMirror)
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useState } from "react";
import { Bold, Italic, Link as LinkIcon, Unlink, Code, Eye, Maximize2, X, Check } from "lucide-react";
import "./RichTextInput.css";

function MenuBar({ editor, isSourceMode, onToggleSource, allowSource }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkInput(false);
      return;
    }

    // Add https:// if no protocol is provided
    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const openLinkInput = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="richtext-menubar">
      {!isSourceMode && (
        <>
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
          {showLinkInput ? (
            <>
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
                placeholder="URL..."
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
            </>
          ) : (
            <>
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
                  onClick={() => editor.chain().focus().unsetLink().run()}
                  className="richtext-menubar-button"
                  title="Remove Link"
                >
                  <Unlink size={16} />
                </button>
              )}
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
  );
}

export default function RichTextInput({ id, value = "", onChange, placeholder = "", allowSource = false }) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  // Force re-render on selection change so toolbar buttons update
  const [, setSelectionUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Only enable bold and italic from StarterKit
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
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

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external value to source mode
      setSourceValue(value);
    }
  }, [value, editor]);

  // Sync source changes back to editor when switching modes
  const handleToggleSource = useCallback(() => {
    if (isSourceMode && editor) {
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
    if (editor) {
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
    if (isSourceMode && editor) {
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

  const renderEditor = (expanded = false) => (
    <>
      <MenuBar
        editor={editor}
        isSourceMode={isSourceMode}
        onToggleSource={handleToggleSource}
        allowSource={allowSource}
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
    </>
  );
}
