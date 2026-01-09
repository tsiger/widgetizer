import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function Combobox({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    const selectedOption = options.find((option) => option.value === value);
    if (selectedOption) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(selectedOption.label);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayValue(value || "");
    }
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        const selectedOption = options.find((option) => option.value === value);
        if (selectedOption) {
          setDisplayValue(selectedOption.label);
        } else {
          setDisplayValue(value || "");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [value, options]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    setDisplayValue(text);
    onChange(text);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (option) => {
    onChange(option.value);
    setDisplayValue(option.label);
    setIsOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
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
            setIsOpen(true);
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
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option.value}
                onClick={() => handleOptionClick(option)}
                className="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-900 hover:bg-slate-100"
              >
                <span className="block truncate">{option.label}</span>
              </li>
            ))
          ) : (
            <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-500">
              No matching pages found. Type to add a custom link.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
