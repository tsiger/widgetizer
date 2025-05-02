import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function WidgetInsertionZone({ position, onAddClick }) {
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
      onClick={() => onAddClick(position)}
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
          className="flex items-center justify-center h-5 w-5 rounded-full bg-pink-600 text-white shadow-sm hover:bg-pink-700 transform transition-all mx-1 flex-shrink-0 z-10"
          aria-label="Add widget"
        >
          <Plus size={14} />
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
