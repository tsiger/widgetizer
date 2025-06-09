import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function BlockInsertionZone({ widgetId, position, onAddClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hoverTimerRef = useRef(null);

  // Handle hover with delay
  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 200);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      setIsVisible(false);
    }

    // Cleanup on unmount
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isHovered]);

  return (
    <div
      className="py-1 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onAddClick(widgetId, position)}
    >
      <div
        className={`
          flex items-center justify-center h-1
          ${isVisible ? "opacity-100" : "opacity-0"}
          transition-opacity duration-150
        `}
      >
        <div
          className={`h-[2px] bg-slate-300 origin-right transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
        <button
          className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transform transition-all mx-1 flex-shrink-0 z-10"
          aria-label="Add block"
        >
          <Plus size={10} />
        </button>
        <div
          className={`h-[2px] bg-slate-300 origin-left transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
      </div>
    </div>
  );
}
