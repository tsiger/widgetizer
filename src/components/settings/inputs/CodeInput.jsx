import { useState, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import "./CodeInput.css";

/**
 * CodeInput component
 * Renders a code editor with syntax highlighting and line numbers
 */
export default function CodeInput({ id, value = "", onChange, language = "html", placeholder = "", rows = 10 }) {
  const [lineCount, setLineCount] = useState(1);
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const editorContainerRef = useRef(null);

  // Calculate line count from value
  useEffect(() => {
    const lines = value.split("\n").length || 1;
    setLineCount(lines);
  }, [value]);

  // Sync scrolling between editor and line numbers
  useEffect(() => {
    const editorContainer = editorContainerRef.current;
    if (!editorContainer) return;

    const handleScroll = (e) => {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = e.target.scrollTop;
      }
    };

    // Find the scrollable element (the pre or textarea inside)
    const scrollableElement = editorContainer.querySelector("pre") || editorContainer.querySelector("textarea");
    if (scrollableElement) {
      scrollableElement.addEventListener("scroll", handleScroll);
      return () => {
        scrollableElement.removeEventListener("scroll", handleScroll);
      };
    }
  }, [value]);

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

  return (
    <div className="code-input-wrapper">
      <div className="code-input-container">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="code-line-numbers"
          style={{ maxHeight: `${rows * 1.5}rem` }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-line-number">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code editor */}
        <div
          ref={editorContainerRef}
          className="code-editor"
          style={{ minHeight: `${rows * 1.5}rem`, maxHeight: `${rows * 1.5}rem` }}
        >
          <Editor
            ref={editorRef}
            value={value}
            onValueChange={onChange}
            highlight={(code) => highlight(code, prismLanguage, language)}
            placeholder={placeholder}
            padding={8}
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
    </div>
  );
}
