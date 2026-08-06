import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import { Maximize2, X } from "lucide-react";
import "./CodeInput.css";

/**
 * CodeInput component
 * Renders a code editor with syntax highlighting and line numbers
 */
export default function CodeInput({
  value = "",
  onChange,
  language = "html",
  placeholder = "",
  rows = 10,
  allowExpand = false,
  resizable = false,
}) {
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const editorContainerRef = useRef(null);
  const expandedLineNumbersRef = useRef(null);
  const expandedEditorContainerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate line count from value (derived state)
  const lineCount = useMemo(() => {
    return value.split("\n").length || 1;
  }, [value]);

  // Keep the gutter aligned with the code. The scrolling element is the editor
  // container itself (it owns `overflow: auto`) — the inner <pre> and <textarea>
  // are laid out at full content height and never scroll, so listening on them
  // silently did nothing.
  useEffect(() => {
    const editorContainer = editorContainerRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (!editorContainer || !lineNumbers) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = editorContainer.scrollTop;
    };

    editorContainer.addEventListener("scroll", handleScroll);
    return () => editorContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync scrolling for expanded editor
  useEffect(() => {
    if (!isExpanded) return;
    const editorContainer = expandedEditorContainerRef.current;
    const lineNumbers = expandedLineNumbersRef.current;
    if (!editorContainer || !lineNumbers) return;

    const handleScroll = () => {
      lineNumbers.scrollTop = editorContainer.scrollTop;
    };

    editorContainer.addEventListener("scroll", handleScroll);
    return () => editorContainer.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

  // Get the appropriate Prism language
  const getPrismLanguage = () => {
    switch (language.toLowerCase()) {
      case "css":
        return languages.css;
      case "javascript":
      case "js":
        return languages.javascript;
      case "html":
      default:
        return languages.markup;
    }
  };

  const prismLanguage = getPrismLanguage();

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    document.body.style.overflow = "hidden";
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    document.body.style.overflow = "";
  }, []);

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

  const languageLabel = language === "css" ? "CSS" : language === "javascript" || language === "js" ? "JavaScript" : "HTML";

  // The container owns the visible height and both columns stretch to fill it.
  // Sizing the gutter from its own content instead lets it outgrow the code box
  // as soon as the code is taller than the visible area — the gutter would run
  // on to line 24 beside an editor still showing 12 and scrolling internally.
  // Putting the height here also survives a drag-resize, which a static cap on
  // the gutter could not.
  const renderEditor = (expanded = false) => (
    <div
      className={`code-input-container ${expanded ? "code-input-container-expanded" : ""}${
        !expanded && resizable ? " code-input-container-resizable" : ""
      }`}
      style={expanded ? undefined : { height: `${rows * 1.5}rem` }}
    >
      {/* Line numbers */}
      <div ref={expanded ? expandedLineNumbersRef : lineNumbersRef} className="code-line-numbers">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="code-line-number">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code editor */}
      <div ref={expanded ? expandedEditorContainerRef : editorContainerRef} className="code-editor">
        <Editor
          ref={expanded ? undefined : editorRef}
          value={value}
          onValueChange={onChange}
          highlight={(code) => highlight(code, prismLanguage, language)}
          placeholder={placeholder}
          padding={0}
          style={{
            fontFamily: '"Fira Code", "Fira Mono", "Consolas", "Monaco", "Courier New", monospace',
            fontSize: "13px",
            lineHeight: "1.5rem",
            outline: "none",
            minHeight: "100%",
            overflow: "auto",
          }}
          textareaClassName="code-textarea"
          preClassName="code-pre"
        />
      </div>
    </div>
  );

  return (
    <>
      <div className={`code-input-wrapper ${isExpanded ? "code-input-hidden" : ""}`}>
        {renderEditor(false)}
      </div>

      {allowExpand && (
        <button type="button" className="code-expand-button" onClick={handleExpand}>
          <Maximize2 size={14} />
          <span>Expand</span>
        </button>
      )}

      {/* Expanded overlay */}
      {isExpanded && (
        <div className="code-overlay" onClick={handleCollapse}>
          <div className="code-overlay-container" onClick={(e) => e.stopPropagation()}>
            <div className="code-overlay-header">
              <span className="code-overlay-title">{languageLabel}</span>
              <button type="button" className="code-overlay-close" onClick={handleCollapse} title="Close (Esc)">
                <X size={20} />
              </button>
            </div>
            <div className="code-input-wrapper code-input-wrapper-expanded">
              {renderEditor(true)}
            </div>
            <div className="code-overlay-footer">
              <button type="button" className="code-done-button" onClick={handleCollapse}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
