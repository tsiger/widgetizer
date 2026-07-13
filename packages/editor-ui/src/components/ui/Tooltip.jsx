import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({
  children,
  content,
  contentClassName = "",
  wrapperClassName = "",
  triggerClassName = "",
  portal = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  // Portal mode positions against the trigger's viewport rect (measured on hover) and renders
  // at <body>, so the tooltip escapes any scroll container that would otherwise clip it — e.g.
  // the media picker's overflow-y-auto grid, where the top row's tooltip was cropped.
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const show = () => {
    if (portal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setIsVisible(true);
  };
  const hide = () => setIsVisible(false);

  const bubble = (
    <>
      <div className={`min-w-24 rounded bg-black/75 px-2 py-1 text-xs text-white ${contentClassName}`}>{content}</div>
      {/* Triangle pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0
        border-l-[6px] border-l-transparent
        border-r-[6px] border-r-transparent
        border-t-[6px] border-t-black/75"
      />
    </>
  );

  return (
    <div className={`relative inline-block ${wrapperClassName}`}>
      <div ref={triggerRef} className={triggerClassName} onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </div>

      {portal ? (
        createPortal(
          <div
            className={`fixed z-[1200] -translate-x-1/2 -translate-y-full pb-2 transition-opacity duration-150 ${
              isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ top: coords.top, left: coords.left }}
          >
            {bubble}
          </div>,
          document.body,
        )
      ) : (
        <div
          className={`
          absolute bottom-full left-1/2 z-50 -translate-x-1/2 mb-2
          transition-all duration-150
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}
        `}
        >
          {bubble}
        </div>
      )}
    </div>
  );
}
