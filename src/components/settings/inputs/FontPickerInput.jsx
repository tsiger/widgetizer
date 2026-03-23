import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Check, ChevronsUpDown } from "lucide-react";
import fontDefinitions from "../../../core/config/fonts.json" with { type: "json" };

const FONT_WEIGHT_NAMES = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Normal",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

const SYSTEM_FONTS = fontDefinitions.system;
const GOOGLE_FONTS = fontDefinitions.google;
const ALL_FONTS_LIST = [...SYSTEM_FONTS, ...GOOGLE_FONTS];
const DEFAULT_FONT_OBJECT = SYSTEM_FONTS[0];

// Tracks which fonts have been loaded into the document
const loadedFonts = new Set();

function loadFontForPreview(font) {
  if (!font?.isGoogleFont || loadedFonts.has(font.name)) return;
  loadedFonts.add(font.name);

  const weight = font.defaultWeight || 400;
  const url = `https://fonts.bunny.net/css?family=${encodeURIComponent(font.name)}:wght@${weight}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

// Shared across all instances for the selected font preview
const FONT_PREVIEW_LINK_ID = "font-picker-preview-fonts";
const FONT_PREVIEW_CACHE_KEY = "__fontPickerPreviewFonts";

function loadFontPreview(fontName, weight) {
  if (!fontName || !weight || typeof document === "undefined") return;

  const cache = window[FONT_PREVIEW_CACHE_KEY] || {};
  const weights = new Set(cache[fontName] || []);
  weights.add(weight);
  cache[fontName] = Array.from(weights);
  window[FONT_PREVIEW_CACHE_KEY] = cache;

  const families = Object.entries(cache)
    .map(([name, fontWeights]) => {
      const sorted = [...fontWeights].sort((a, b) => a - b);
      return `${encodeURIComponent(name)}:wght@${sorted.join(";")}`;
    })
    .join("|");

  if (!families) return;

  const url = `https://fonts.bunny.net/css?family=${families}&display=swap`;
  let link = document.getElementById(FONT_PREVIEW_LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_PREVIEW_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = url;
}

function FontListItem({ font, isSelected, onClick, observerRef }) {
  const itemRef = useRef(null);

  useEffect(() => {
    const el = itemRef.current;
    const obs = observerRef.current;
    if (!el || !obs) return;
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [observerRef]);

  return (
    <button
      ref={itemRef}
      type="button"
      data-font-name={font.isGoogleFont ? font.name : null}
      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
        isSelected
          ? "bg-pink-50 text-pink-700"
          : "text-slate-700 hover:bg-slate-50"
      }`}
      onClick={() => onClick(font)}
    >
      <span
        className="truncate"
        style={{
          fontFamily: font.stack,
          fontWeight: font.defaultWeight || 400,
        }}
      >
        {font.name}
      </span>
      {isSelected && <Check className="w-4 h-4 shrink-0 text-pink-600" />}
    </button>
  );
}

export default function FontPickerInput({
  id,
  value = { stack: DEFAULT_FONT_OBJECT.stack, weight: DEFAULT_FONT_OBJECT.defaultWeight },
  onChange,
}) {
  const currentVal =
    typeof value === "object" && value !== null && value.stack
      ? value
      : { stack: DEFAULT_FONT_OBJECT.stack, weight: DEFAULT_FONT_OBJECT.defaultWeight };

  const [selectedStack, setSelectedStack] = useState(currentVal.stack);
  const selectedFontObject = ALL_FONTS_LIST.find((f) => f.stack === selectedStack) || DEFAULT_FONT_OBJECT;
  const [selectedWeight, setSelectedWeight] = useState(currentVal.weight ?? selectedFontObject.defaultWeight);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef(null);
  const listRef = useRef(null);
  const searchInputRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    setSelectedStack(currentVal.stack);
    const newFontObject = ALL_FONTS_LIST.find((f) => f.stack === currentVal.stack) || DEFAULT_FONT_OBJECT;
    setSelectedWeight(currentVal.weight ?? newFontObject.defaultWeight);
  }, [currentVal.stack, currentVal.weight]);

  useEffect(() => {
    if (!selectedFontObject?.isGoogleFont) return;
    const weight = selectedWeight ?? selectedFontObject.defaultWeight;
    if (!weight) return;
    loadFontPreview(selectedFontObject.name, weight);
  }, [selectedFontObject, selectedWeight]);

  // IntersectionObserver to lazy-load fonts as they scroll into view
  useEffect(() => {
    if (!isOpen) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = entry.target.dataset.fontName;
          if (!name) continue;
          const font = GOOGLE_FONTS.find((f) => f.name === name);
          if (font) loadFontForPreview(font);
          obs.unobserve(entry.target);
        }
      },
      { root: listRef.current, rootMargin: "100px" },
    );

    observerRef.current = obs;
    return () => obs.disconnect();
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  const filteredFonts = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return ALL_FONTS_LIST.filter((f) => f.name.toLowerCase().includes(q));
  }, [search]);

  const handleFontSelect = useCallback(
    (font) => {
      const canKeepWeight = font.availableWeights?.includes(selectedWeight);
      const newWeight = canKeepWeight ? selectedWeight : font.defaultWeight;
      setSelectedStack(font.stack);
      setSelectedWeight(newWeight);
      onChange({ stack: font.stack, weight: newWeight });
      setIsOpen(false);
    },
    [onChange, selectedWeight],
  );

  const handleWeightChange = useCallback(
    (e) => {
      const newWeight = parseInt(e.target.value, 10);
      setSelectedWeight(newWeight);
      onChange({ stack: selectedStack, weight: newWeight });
    },
    [onChange, selectedStack],
  );

  const renderList = () => {
    if (filteredFonts) {
      if (filteredFonts.length === 0) {
        return <div className="px-3 py-4 text-sm text-slate-400 text-center">No fonts found</div>;
      }
      return filteredFonts.map((font) => (
        <FontListItem
          key={font.stack}
          font={font}
          isSelected={font.stack === selectedStack}
          onClick={handleFontSelect}
          observerRef={observerRef}
        />
      ));
    }

    return (
      <>
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">System</div>
        {SYSTEM_FONTS.map((font) => (
          <FontListItem
            key={font.stack}
            font={font}
            isSelected={font.stack === selectedStack}
            onClick={handleFontSelect}
            observerRef={observerRef}
          />
        ))}
        <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-t border-slate-100">
          Google Fonts
        </div>
        {GOOGLE_FONTS.map((font) => (
          <FontListItem
            key={font.stack}
            font={font}
            isSelected={font.stack === selectedStack}
            onClick={handleFontSelect}
            observerRef={observerRef}
          />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-2" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        className="form-input w-full text-left flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className="truncate"
          style={{
            fontFamily: selectedStack,
            fontWeight: selectedWeight ?? selectedFontObject?.defaultWeight ?? 400,
          }}
        >
          {selectedFontObject?.name || "Select font"}
        </span>
        <ChevronsUpDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="border border-slate-200 rounded-md bg-white shadow-lg overflow-hidden">
          {/* Search */}
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full pl-9 pr-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Font list */}
          <div ref={listRef} className="max-h-60 overflow-y-auto" role="listbox">
            {renderList()}
          </div>
        </div>
      )}

      {/* Weight selector */}
      {selectedFontObject?.availableWeights?.length > 0 && (
        <select
          id={`${id}-weight`}
          value={selectedWeight}
          onChange={handleWeightChange}
          className="form-select w-full"
          aria-label="Font weight"
        >
          {selectedFontObject.availableWeights.map((weight) => (
            <option key={weight} value={weight}>
              {FONT_WEIGHT_NAMES[weight] || weight}
            </option>
          ))}
        </select>
      )}

      {/* Preview */}
      <div
        className="text-lg"
        style={{
          fontFamily: selectedStack,
          fontWeight: selectedWeight ?? selectedFontObject?.defaultWeight ?? "normal",
        }}
      >
        The quick brown fox jumps over the lazy dog.
      </div>
    </div>
  );
}
