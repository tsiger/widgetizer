import { useState, useEffect } from "react";

import { getAllPages } from "../../../queries/pageManager";
import TextInput from "./TextInput";
import CheckboxInput from "./CheckboxInput";
import SettingsField from "../SettingsField";
import Combobox from "../../ui/Combobox";

export default function LinkInput({ id, value = {}, onChange }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    async function fetchPages() {
      try {
        const allPages = await getAllPages();
        setPages(allPages.map((p) => ({ value: `/pages/${p.slug}`, label: p.name })));
      } catch (error) {
        console.error("Failed to load pages:", error);
      }
    }
    fetchPages();
  }, []);

  const handleChange = (field, fieldValue) => {
    const updatedValue = { ...value, [field]: fieldValue };
    onChange(updatedValue);
  };

  const { href = "", text = "", target = "_self" } = value;
  const openInNewTab = target === "_blank";

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      {/* Href Input with Combobox */}
      <SettingsField id={`${id}-href`} label="Link URL" description="Select a page or enter a custom URL.">
        <Combobox
          options={pages}
          value={href}
          onChange={(val) => handleChange("href", val)}
          placeholder="Select a page or type a URL..."
        />
      </SettingsField>

      {/* Text Input */}
      <SettingsField id={`${id}-text`} label="Link Text">
        <TextInput
          id={`${id}-text-input`}
          placeholder="e.g., Learn More"
          value={text}
          onChange={(val) => handleChange("text", val)}
        />
      </SettingsField>

      {/* Target Checkbox */}
      <SettingsField id={`${id}-target`} label="Open in new tab">
        <CheckboxInput
          id={`${id}-target-input`}
          value={openInNewTab}
          onChange={(val) => handleChange("target", val ? "_blank" : "_self")}
        />
      </SettingsField>
    </div>
  );
}
