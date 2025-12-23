import { useState, useEffect, useMemo } from "react";
import useProjectStore from "../../../stores/projectStore";
import useIconsStore from "../../../stores/iconsStore";
import { Search, X } from "lucide-react";

/**
 * IconInput Component
 *
 * Renders a searchable grid of icons fetched from the project's assets/icons.json.
 * Supports filtering by 'options' (subset) and 'allow_patterns' (wildcards).
 * Uses Zustand for caching icons across component mounts.
 */
export default function IconInput({ id, value, onChange, options, allow_patterns }) {
  const activeProject = useProjectStore((state) => state.activeProject);
  const { fetchIcons, getIcons, loading, error } = useIconsStore();
  const [searchTerm, setSearchTerm] = useState("");

  const projectId = activeProject?.id;
  const iconsData = getIcons(projectId);
  const isLoading = loading[projectId];
  const fetchError = error[projectId];

  // Fetch icons on mount (uses cache if available)
  useEffect(() => {
    if (projectId) {
      fetchIcons(projectId);
    }
  }, [projectId, fetchIcons]);

  // Filter icons based on schema settings and search term
  const filteredIcons = useMemo(() => {
    if (!iconsData?.icons) return [];

    let keys = Object.keys(iconsData.icons);

    // 1. Filter by 'options' (Explicit Subset)
    if (options && Array.isArray(options) && options.length > 0) {
      keys = keys.filter((key) => options.includes(key));
    }

    // 2. Filter by 'allow_patterns' (Wildcards)
    if (allow_patterns && Array.isArray(allow_patterns) && allow_patterns.length > 0) {
      keys = keys.filter((key) => {
        return allow_patterns.some((pattern) => {
          if (pattern.endsWith("*")) {
            return key.startsWith(pattern.slice(0, -1));
          }
          return key === pattern;
        });
      });
    }

    // 3. Filter by Search Term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      keys = keys.filter((key) => key.toLowerCase().includes(lowerSearch));
    }

    return keys;
  }, [iconsData, options, allow_patterns, searchTerm]);

  // Handle icon selection (clicking selected icon clears it)
  const handleIconClick = (iconName) => {
    if (value === iconName) {
      onChange(""); // Clear selection
    } else {
      onChange(iconName);
    }
  };

  // Loading state
  if (isLoading && !iconsData?.icons) {
    return <div className="text-sm text-slate-500 py-2">Loading icons...</div>;
  }

  // Error state
  if (fetchError && !iconsData?.icons) {
    return (
      <div className="text-sm text-red-500 italic p-3 border border-red-200 rounded bg-red-50">
        Failed to load icons: {fetchError}
      </div>
    );
  }

  const hasIcons = Object.keys(iconsData.icons || {}).length > 0;

  // No icons available
  if (!hasIcons) {
    return (
      <div className="text-sm text-slate-500 italic p-3 border border-slate-200 rounded bg-slate-50">
        No icons found. Add an <code>assets/icons.json</code> file to your theme.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Input with Clear Button */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-2 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1 border border-slate-200 rounded-md bg-white">
        {filteredIcons.map((iconName) => {
          const iconDef = iconsData.icons[iconName];
          const isSelected = value === iconName;

          return (
            <button
              type="button"
              key={iconName}
              onClick={() => handleIconClick(iconName)}
              title={iconName}
              className={`
                aspect-square flex items-center justify-center rounded-md border transition-all
                hover:bg-slate-50 hover:border-slate-400
                ${isSelected ? "bg-pink-50 border-pink-500 ring-1 ring-pink-500" : "border-slate-100"}
              `}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-6 h-6 ${isSelected ? "text-pink-600" : "text-slate-600"}`}
                dangerouslySetInnerHTML={{ __html: iconDef.body }}
              />
            </button>
          );
        })}

        {filteredIcons.length === 0 && (
          <div className="col-span-5 text-center py-4 text-xs text-slate-500">No icons match your search.</div>
        )}
      </div>
    </div>
  );
}
