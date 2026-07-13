import { useState } from "react";

export default function Tooltip({ children, content, contentClassName = "", wrapperClassName = "", triggerClassName = "" }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${wrapperClassName}`}>
      <div className={triggerClassName} onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {children}
      </div>

      <div
        className={`
        absolute bottom-full left-1/2 z-50 -translate-x-1/2 mb-2
        transition-all duration-150
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
      `}
      >
        <div className={`min-w-24 rounded bg-black/75 px-2 py-1 text-xs text-white ${contentClassName}`}>{content}</div>
        {/* Triangle pointer - made bigger and more visible */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[6px] border-l-transparent
          border-r-[6px] border-r-transparent
          border-t-[6px] border-t-black/75"
        />
      </div>
    </div>
  );
}
