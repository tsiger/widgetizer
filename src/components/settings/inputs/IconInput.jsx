import { useState, useEffect, useMemo } from "react";
import useProjectStore from "../../../stores/projectStore";
import useIconsStore from "../../../stores/iconsStore";
import { Search } from "lucide-react";

/**
 * IconInput Component
 *
 * Renders a searchable grid of icons fetched from the project's assets/icons.json.
 * Supports:
 * - Flat icons: { "prefix": "...", "icons": { "icon-name": { "body": "..." } } }
 * - Grouped icons: { "prefix": "...", "groups": { "Category": { "icon-name": { "body": "..." } } } }
 * - Filtering by 'options' (subset) and 'allow_patterns' (wildcards)
 */
export default function IconInput({ id, value, onChange, options, allow_patterns, defaultValue }) {
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

  // Detect if icons are grouped or flat, and normalize to a consistent structure
  const { isGrouped, normalizedIcons, flatIconsMap } = useMemo(() => {
    if (!iconsData) return { isGrouped: false, normalizedIcons: [], flatIconsMap: {} };

    // Check if using grouped format
    if (iconsData.groups && typeof iconsData.groups === "object") {
      const groups = [];
      const flatMap = {};

      Object.entries(iconsData.groups).forEach(([groupName, groupIcons]) => {
        const icons = Object.entries(groupIcons).map(([name, data]) => {
          flatMap[name] = data;
          return { name, ...data };
        });
        groups.push({ name: groupName, icons });
      });

      return { isGrouped: true, normalizedIcons: groups, flatIconsMap: flatMap };
    }

    // Flat format
    if (iconsData.icons && typeof iconsData.icons === "object") {
      const flatMap = iconsData.icons;
      const icons = Object.entries(flatMap).map(([name, data]) => ({ name, ...data }));
      return { isGrouped: false, normalizedIcons: [{ name: null, icons }], flatIconsMap: flatMap };
    }

    return { isGrouped: false, normalizedIcons: [], flatIconsMap: {} };
  }, [iconsData]);

  // Filter icons based on schema settings and search term
  const filteredGroups = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return normalizedIcons
      .map((group) => {
        let filteredIcons = group.icons;

        // 1. Filter by 'options' (Explicit Subset)
        if (options && Array.isArray(options) && options.length > 0) {
          filteredIcons = filteredIcons.filter((icon) => options.includes(icon.name));
        }

        // 2. Filter by 'allow_patterns' (Wildcards)
        if (allow_patterns && Array.isArray(allow_patterns) && allow_patterns.length > 0) {
          filteredIcons = filteredIcons.filter((icon) => {
            return allow_patterns.some((pattern) => {
              if (pattern.endsWith("*")) {
                return icon.name.startsWith(pattern.slice(0, -1));
              }
              return icon.name === pattern;
            });
          });
        }

        // 3. Filter by Search Term
        if (searchTerm) {
          filteredIcons = filteredIcons.filter((icon) => icon.name.toLowerCase().includes(lowerSearch));
        }

        return { ...group, icons: filteredIcons };
      })
      .filter((group) => group.icons.length > 0);
  }, [normalizedIcons, options, allow_patterns, searchTerm]);

  // Handle icon selection (clicking selected icon clears it)
  const handleIconClick = (iconName) => {
    if (value === iconName) {
      onChange(""); // Clear selection
    } else {
      onChange(iconName);
    }
  };

  // Total icons count for empty state
  const totalIconsCount = Object.keys(flatIconsMap).length;
  const hasFilteredIcons = filteredGroups.some((g) => g.icons.length > 0);

  // Loading state
  if (isLoading && totalIconsCount === 0) {
    return <div className="text-sm text-slate-500 py-2">Loading icons...</div>;
  }

  // Error state
  if (fetchError && totalIconsCount === 0) {
    return (
      <div className="text-sm text-red-500 italic p-3 border border-red-200 rounded bg-red-50">
        Failed to load icons: {fetchError}
      </div>
    );
  }

  // No icons available
  if (totalIconsCount === 0) {
    return (
      <div className="text-sm text-slate-500 italic p-3 border border-slate-200 rounded bg-slate-50">
        No icons found. Add an <code>assets/icons.json</code> file to your theme.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search icons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {/* Icon Grid */}
      <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md bg-white">
        {hasFilteredIcons ? (
          filteredGroups.map((group, groupIndex) => (
            <div key={group.name || "ungrouped"}>
              {/* Group Header (only for grouped icons) */}
              {isGrouped && group.name && (
                <div className="sticky top-0 bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  {group.name}
                </div>
              )}

              {/* Icons Grid */}
              <div className="grid grid-cols-5 gap-2 p-2">
                {group.icons.map((icon) => {
                  const isSelected = value === icon.name;

                  return (
                    <button
                      type="button"
                      key={icon.name}
                      onClick={() => handleIconClick(icon.name)}
                      title={icon.name}
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
                        dangerouslySetInnerHTML={{ __html: icon.body }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Separator between groups (not after last) */}
              {isGrouped && groupIndex < filteredGroups.length - 1 && <div className="border-b border-slate-200" />}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-xs text-slate-500">No icons match your search.</div>
        )}
      </div>

      {/* Reset Selection Link (below grid) - only show if value differs from default */}
      {value && value !== defaultValue && (
        <button
          type="button"
          onClick={() => onChange(defaultValue || "")}
          className="text-xs text-slate-500 hover:text-pink-600 hover:underline transition-colors"
        >
          Reset to default
        </button>
      )}
    </div>
  );
}
