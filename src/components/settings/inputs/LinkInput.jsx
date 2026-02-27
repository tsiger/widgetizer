import { useState, useEffect, useMemo, useCallback } from "react";

import { getAllPages } from "../../../queries/pageManager";
import TextInput from "./TextInput";
import CheckboxInput from "./CheckboxInput";
import SettingsField from "../SettingsField";
import Combobox from "../../ui/Combobox";

export default function LinkInput({ id, value = {}, onChange, setting }) {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPages() {
      try {
        const allPages = await getAllPages();
        setPages(allPages);
      } catch (error) {
        console.error("Failed to load pages:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPages();
  }, []);

  // Build combobox options using uuid as value
  const pageOptions = useMemo(() => {
    return pages.map((p) => ({ value: p.uuid, label: p.name }));
  }, [pages]);

  // Create lookup maps for uuid -> page and slug -> page
  const pagesByUuid = useMemo(() => {
    const map = new Map();
    pages.forEach((p) => map.set(p.uuid, p));
    return map;
  }, [pages]);

  const pagesBySlug = useMemo(() => {
    const map = new Map();
    pages.forEach((p) => map.set(p.slug, p));
    return map;
  }, [pages]);

  // Resolve the current value - if pageUuid exists, check if page still exists
  // Also try to match by slug for legacy links without pageUuid
  const resolvedValue = useMemo(() => {
    if (isLoading) {
      return value; // Don't resolve while loading
    }

    const { pageUuid, href = "", text = "", target = "_self" } = value;

    // If we have a pageUuid, look up the page
    if (pageUuid) {
      const page = pagesByUuid.get(pageUuid);
      if (page) {
        // Page exists - derive href from current slug
        return {
          pageUuid,
          href: `${page.slug}.html`,
          text,
          target,
        };
      } else {
        // Page was deleted - clear the link
        return {
          href: "",
          text: "",
          target: "_self",
        };
      }
    }

    // No pageUuid - try to match by slug (for legacy links or initial load)
    // Extract slug from href if it looks like an internal page link
    if (href && href.endsWith(".html") && !href.includes("://") && !href.startsWith("#")) {
      const slug = href.replace(".html", "");
      const page = pagesBySlug.get(slug);
      if (page) {
        // Found a matching page - return with pageUuid so combobox shows page name
        return {
          pageUuid: page.uuid,
          href,
          text,
          target,
        };
      }
    }

    // Custom URL or no match - pass through as-is
    return { href, text, target };
  }, [value, pagesByUuid, pagesBySlug, isLoading]);

  // Handle combobox selection - could be a uuid or custom text
  const handleLinkChange = useCallback(
    (selectedValue) => {
      // Check if the selected value matches a page uuid
      const page = pagesByUuid.get(selectedValue);

      if (page) {
        // User selected an internal page
        onChange({
          ...resolvedValue,
          pageUuid: page.uuid,
          href: `${page.slug}.html`,
        });
      } else {
        // User typed a custom URL - remove pageUuid if present
         
        const { pageUuid: _pageUuid, ...rest } = resolvedValue;
        onChange({
          ...rest,
          href: selectedValue,
        });
      }
    },
    [pagesByUuid, resolvedValue, onChange],
  );

  const handleFieldChange = useCallback(
    (field, fieldValue) => {
      onChange({ ...resolvedValue, [field]: fieldValue });
    },
    [resolvedValue, onChange],
  );

  const { href = "", text = "", target = "_self", pageUuid } = resolvedValue;
  const openInNewTab = target === "_blank";
  const hideText = Boolean(setting?.hide_text);

  // Determine combobox value: use pageUuid if we have one (for internal pages), otherwise href
  const comboboxValue = pageUuid || href;

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      {/* Href Input with Combobox */}
      <SettingsField id={`${id}-href`} label="Link URL" description="Select a page or enter a custom URL.">
        <Combobox
          options={pageOptions}
          value={comboboxValue}
          onChange={handleLinkChange}
          placeholder="Select a page or type a URL..."
        />
      </SettingsField>

      {!hideText && (
        <SettingsField id={`${id}-text`} label="Link Text">
          <TextInput
            id={`${id}-text-input`}
            placeholder="e.g., Learn More"
            value={text}
            onChange={(val) => handleFieldChange("text", val)}
          />
        </SettingsField>
      )}

      {/* Target Checkbox */}
      <SettingsField id={`${id}-target`} label="Open in new tab">
        <CheckboxInput
          id={`${id}-target-input`}
          value={openInNewTab}
          onChange={(val) => handleFieldChange("target", val ? "_blank" : "_self")}
        />
      </SettingsField>
    </div>
  );
}
