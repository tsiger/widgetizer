import { useState, useEffect, useRef, useMemo, memo } from "react";
import { ChevronDown } from "lucide-react";
import ComboboxOptionList from "../../ui/ComboboxOptionList.jsx";

// Custom Combobox for menu editor with higher z-index and external control
const MenuCombobox = memo(function MenuCombobox({ options, value, onChange, placeholder, isOpen, onOpenChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Use value directly, no separate displayValue state
  const displayValue = useMemo(() => {
    const selectedOption = options.find((option) => option.value === value);
    return selectedOption ? selectedOption.label : value || "";
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [value, options, onOpenChange]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    onChange(text);
    if (!isOpen) {
      onOpenChange(true);
    }
  };

  const handleOptionClick = (option) => {
    onChange(option.value);
    onOpenChange(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    onOpenChange(!isOpen);
    setSearchTerm("");
  };

  const filteredOptions =
    searchTerm === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            onOpenChange(true);
            setSearchTerm("");
          }}
          placeholder={placeholder}
          className="form-input w-full pr-10"
        />
        <button
          type="button"
          onClick={toggleDropdown}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none"
        >
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <ComboboxOptionList
          options={filteredOptions}
          onSelect={handleOptionClick}
          emptyText="No matching results. Type to add a custom link."
          className="!z-[99999]"
        />
      )}
    </div>
  );
});

export default MenuCombobox;
