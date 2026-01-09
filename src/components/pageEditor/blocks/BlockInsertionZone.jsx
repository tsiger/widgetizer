import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export default function BlockInsertionZone({
  widgetId,
  position,
  onAddClick,
  isBlockSelectorOpen,
  activeBlockTriggerKey,
}) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hoverTimerRef = useRef(null);
  const triggerRef = useRef(null);

  // Handle hover with delay and selector state
  useEffect(() => {
    // Stay visible if hovered OR if block selector is open and this is the active trigger
    const currentTriggerKey = `${widgetId}-${position}`;
    const shouldBeVisible = isHovered || (isBlockSelectorOpen && activeBlockTriggerKey === currentTriggerKey);

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
  }, [isHovered, isBlockSelectorOpen, activeBlockTriggerKey, widgetId, position]);

  const handleClick = () => {
    onAddClick(widgetId, triggerRef);
  };

  return (
    <div
      className="py-1 group cursor-pointer"
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
          className={`h-[1px] bg-blue-300 transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
        <button
          ref={triggerRef}
          className="flex items-center justify-center h-5 w-5 rounded-full bg-white border-2 border-blue-500 text-blue-500 shadow-sm hover:bg-blue-500 hover:text-white transform transition-all mx-1.5 flex-shrink-0 z-10 hover:scale-110"
          aria-label={t("pageEditor.actions.addBlock")}
        >
          <Plus size={10} />
        </button>
        <div
          className={`h-[1px] bg-blue-300 transition-all duration-300 ease-out ${
            isVisible ? "w-full scale-x-100" : "w-full scale-x-0"
          }`}
        ></div>
      </div>
    </div>
  );
}
