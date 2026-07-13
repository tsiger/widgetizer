import { useState, useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import useProjectStore from "../../../stores/projectStore";
import useIconsStore from "../../../stores/iconsStore";
import { Search } from "lucide-react";

// An icon's `body` is raw SVG markup read verbatim from the project's
// assets/icons.json, which is tenant-authored (notably via project ZIP import,
// which copies icons.json without content validation). Injecting it with
// dangerouslySetInnerHTML in the editor origin would allow stored XSS, so we
// sanitize with the SVG profile first — mirroring the SVG-upload sanitization
// in useMediaUpload.js. (Published sites render icons via Liquid `| raw` by
// design; that is the tenant's own cross-origin site, not the editor origin.)
function sanitizeIconBody(body) {
  // `body` is an SVG *inner fragment* (no <svg> root — the <svg> element below
  // supplies it). DOMPurify's svg profile parses its input as a standalone
  // document, so a bare <path>/<g> fragment sanitized on its own is dropped
  // entirely (blank icon). Wrap it in an <svg> so the children parse in SVG
  // context, then return the cleaned inner markup — this preserves legitimate
  // icon shapes while stripping <script>, event handlers, and smuggled HTML
  // (e.g. `</svg><img onerror=…>`).
  const sanitized = DOMPurify.sanitize(`<svg>${body || ""}</svg>`, {
    USE_PROFILES: { svg: true, svgFilters: true },
    RETURN_DOM: true,
  });
  const svg = sanitized.querySelector("svg");
  return svg ? svg.innerHTML : "";
}

/**
 * IconInput Component
 *
 * Renders a searchable grid of icons fetched from the project's assets/icons.json.
 * Supports:
 * - Flat icons: { "prefix": "...", "icons": { "icon-name": { "body": "..." } } }
 * - Grouped icons: { "prefix": "...", "groups": { "Category": { "icon-name": { "body": "..." } } } }
 * - Filtering by 'options' (subset) and 'allow_patterns' (wildcards)
 */
export default function IconInput({ value, onChange, options, allow_patterns, defaultValue }) {
  const activeProject = useProjectStore((state) => state.activeProject);
  const { fetchIcons, getIcons, loading, error } = useIconsStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const popoverRef = useRef(null);
  const scrollRef = useRef(null);

  const columns = 5;
  const rowGap = 8;
  const groupPadding = 8;
  const groupHeaderHeight = 28;
  const groupSeparatorHeight = 1;
  const overscanRows = 2;
  const baseCellSize = 40;
  const minCellSize = 24;

  // Square icon cells sized to the (possibly narrow) container so the grid never
  // scrolls sideways and the buttons stay square. Before the first measure — and
  // in wide contexts (Theme Settings) — this caps at the normal 40px cell; in the
  // ~200px page-editor sidebar it shrinks to fit all `columns` without overflow.
  // rowHeight drives both the rendered cell and the virtual-scroll offset math.
  const cellSize =
    gridWidth > 0
      ? Math.min(
          baseCellSize,
          Math.max(minCellSize, Math.floor((gridWidth - groupPadding * 2 - rowGap * (columns - 1)) / columns)),
        )
      : baseCellSize;
  const rowHeight = cellSize;
  const rowStride = rowHeight + rowGap;

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

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Reopening mounts a fresh scroll container at scrollTop 0, but the `scrollTop`
    // state persists from the previous open. Left stale, the virtualizer renders
    // the rows for the old offset (down inside the spacer) while the viewport sits
    // at the top — so the list looks empty until the first scroll resyncs it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
        setGridWidth(scrollRef.current.clientWidth);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, [isOpen]);

  // Total icons count for empty state
  const totalIconsCount = Object.keys(flatIconsMap).length;
  const hasFilteredIcons = filteredGroups.some((g) => g.icons.length > 0);
  const selectedIcon = value ? flatIconsMap[value] : null;

  const groupMeta = useMemo(() => {
    const result = [];
    let runningOffset = 0;

    for (let index = 0; index < filteredGroups.length; index++) {
      const group = filteredGroups[index];
      const rows = Math.ceil(group.icons.length / columns);
      const contentHeight = rows > 0 ? rows * rowHeight + (rows - 1) * rowGap : 0;
      const headerHeight = isGrouped && group.name ? groupHeaderHeight : 0;
      const separatorHeight = isGrouped && index < filteredGroups.length - 1 ? groupSeparatorHeight : 0;
      const totalHeight = headerHeight + groupPadding * 2 + contentHeight + separatorHeight;

      result.push({
        group,
        rows,
        headerHeight,
        separatorHeight,
        startOffset: runningOffset,
        totalHeight,
      });

      runningOffset += totalHeight;
    }

    return result;
  }, [filteredGroups, isGrouped, columns, rowHeight, rowGap]);

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
    <div className="space-y-2" ref={popoverRef}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="h-10 w-10 rounded-md border border-slate-200 flex items-center justify-center bg-white"
          aria-expanded={isOpen}
          aria-label={selectedIcon ? `Selected icon ${value}` : "Choose icon"}
        >
          {selectedIcon ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-slate-600"
              dangerouslySetInnerHTML={{ __html: sanitizeIconBody(selectedIcon.body) }}
            />
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-slate-400">None</span>
          )}
        </button>
        <div className="flex-1">
          <div className="text-xs font-medium text-slate-700">{value || "No icon selected"}</div>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="text-xs text-slate-500 hover:text-pink-600 hover:underline transition-colors"
          >
            {isOpen ? "Close picker" : "Choose icon"}
          </button>
        </div>
      </div>

      {isOpen && (
        <>
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
          <div
            ref={scrollRef}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            className="max-h-60 overflow-y-auto border border-slate-200 rounded-md bg-white"
          >
            {hasFilteredIcons ? (
              groupMeta.map((meta, groupIndex) => {
                const { group, rows, headerHeight, separatorHeight, startOffset, totalHeight } = meta;
                const viewTop = scrollTop;
                const viewBottom = scrollTop + containerHeight;
                const groupTop = startOffset;
                const groupBottom = startOffset + totalHeight;

                if (
                  groupBottom < viewTop - rowStride * overscanRows ||
                  groupTop > viewBottom + rowStride * overscanRows
                ) {
                  return <div key={group.name || `group-${groupIndex}`} style={{ height: totalHeight }} />;
                }

                const contentTop = groupTop + headerHeight + groupPadding;
                const startRow = Math.max(0, Math.floor((viewTop - contentTop) / rowStride) - overscanRows);
                const endRow = Math.min(rows, Math.ceil((viewBottom - contentTop) / rowStride) + overscanRows);
                const startIndex = startRow * columns;
                const endIndex = endRow * columns;
                const visibleIcons = group.icons.slice(startIndex, endIndex);
                const topSpacer = startRow * rowStride;
                const remainingRows = rows - endRow;
                const bottomSpacer = Math.max(0, remainingRows * rowStride - (remainingRows > 0 ? rowGap : 0));

                return (
                  <div key={group.name || `group-${groupIndex}`} style={{ height: totalHeight }}>
                    {isGrouped && group.name && (
                      <div
                        className="sticky top-0 bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-200"
                        style={{ height: headerHeight }}
                      >
                        {group.name}
                      </div>
                    )}

                    <div style={{ padding: groupPadding }}>
                      {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                          gridAutoRows: `${rowHeight}px`,
                          columnGap: `${rowGap}px`,
                          rowGap: `${rowGap}px`,
                        }}
                      >
                        {visibleIcons.map((icon) => {
                          const isSelected = value === icon.name;

                          return (
                            <button
                              type="button"
                              key={icon.name}
                              onClick={() => handleIconClick(icon.name)}
                              title={icon.name}
                              className={`
                                icon-grid-button flex items-center justify-center rounded-md border transition-all
                                hover:bg-slate-50 hover:border-slate-400
                                ${isSelected ? "bg-pink-50 border-pink-500 ring-1 ring-pink-500" : "border-slate-100"}
                              `}
                              style={{ width: `${rowHeight}px`, height: `${rowHeight}px` }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`w-6 h-6 ${isSelected ? "text-pink-600" : "text-slate-600"}`}
                                dangerouslySetInnerHTML={{ __html: sanitizeIconBody(icon.body) }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
                    </div>

                    {isGrouped && separatorHeight > 0 && (
                      <div className="border-b border-slate-200" style={{ height: separatorHeight }} />
                    )}
                  </div>
                );
              })
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
              Clear selection
            </button>
          )}
        </>
      )}
    </div>
  );
}
