import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function WidgetInsertionZone({
  position,
  onAddClick,
  isWidgetSelectorOpen,
  activeWidgetTriggerPosition,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hoverTimerRef = useRef(null);
  const triggerRef = useRef(null);

  // Handle hover with delay and selector state
  useEffect(() => {
    // Stay visible if hovered OR if widget selector is open and this is the active trigger
    const shouldBeVisible = isHovered || (isWidgetSelectorOpen && activeWidgetTriggerPosition === position);

    if (shouldBeVisible) {
      hoverTimerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 150);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
    }

    // Cleanup on unmount
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isHovered, isWidgetSelectorOpen, activeWidgetTriggerPosition, position]);

  const handleClick = () => {
    onAddClick(position, triggerRef);
  };

  return (
    <div
      className="py-1.5 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div
        className={`
          flex items-center justify-center h-1
          ${isVisible ? "opacity-100" : "opacity-0"}
          transition-opacity duration-200
        `}
      >
        <div
          className={`h-[1px] bg-slate-300 transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
        <button
          ref={triggerRef}
          className="flex items-center justify-center h-6 w-6 rounded-full bg-white border-2 border-pink-500 text-pink-500 shadow-sm hover:bg-pink-500 hover:text-white transform transition-all mx-2 flex-shrink-0 z-10 hover:scale-110"
          aria-label="Add widget"
        >
          <Plus size={12} />
        </button>
        <div
          className={`h-[1px] bg-slate-300 transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
      </div>
    </div>
  );
}
