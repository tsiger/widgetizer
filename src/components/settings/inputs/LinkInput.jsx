import { useMemo, useCallback } from "react";

import useLinkTargets from "../../../hooks/useLinkTargets";
import { resolveStoredLink } from "../../../utils/linkValueResolver";
import TextInput from "./TextInput";
import CheckboxInput from "./CheckboxInput";
import SettingsField from "../SettingsField";
import Combobox from "../../ui/Combobox";

export default function LinkInput({ id, value = {}, onChange, setting }) {
  // Pages + collection item pages, grouped, loaded once per project.
  const { options, loading } = useLinkTargets();

  // value (uuid) -> option, for resolving the current selection.
  const optionsByUuid = useMemo(() => {
    const map = new Map();
    options.forEach((o) => map.set(o.value, o));
    return map;
  }, [options]);

  // slug -> page option, to recognize legacy hrefs that match a page.
  const pageOptionBySlug = useMemo(() => {
    const map = new Map();
    options.forEach((o) => {
      if (o.isPage) map.set(o.slug, o);
    });
    return map;
  }, [options]);

  // Resolve the stored value to a display-ready shape (pure helper, unit-tested):
  // stable refs get a live href from the target's current slug, and a ref that is
  // absent from the (possibly stale/partial) options is preserved — never
  // inferred-deleted — so editing text/target can't drop a still-valid ref.
  const resolvedValue = useMemo(
    () => resolveStoredLink(value, optionsByUuid, pageOptionBySlug, loading),
    [value, optionsByUuid, pageOptionBySlug, loading],
  );

  // On select: store the matching stable ref, always clearing the other two.
  const handleLinkChange = useCallback(
    (selectedValue) => {
      const opt = optionsByUuid.get(selectedValue);
      if (opt?.isPage) {
        onChange({
          ...resolvedValue,
          pageUuid: opt.value,
          collectionType: undefined,
          collectionItemUuid: undefined,
          href: `${opt.slug}.html`,
        });
      } else if (opt?.isCollectionItem) {
        onChange({
          ...resolvedValue,
          pageUuid: undefined,
          collectionType: opt.collectionType,
          collectionItemUuid: opt.value,
          href: `${opt.slugPrefix}/${opt.slug}.html`,
        });
      } else {
        // Custom URL — drop any stable refs.
        const rest = { ...resolvedValue };
        delete rest.pageUuid;
        delete rest.collectionItemUuid;
        delete rest.collectionType;
        onChange({ ...rest, href: selectedValue });
      }
    },
    [optionsByUuid, resolvedValue, onChange],
  );

  const handleFieldChange = useCallback(
    (field, fieldValue) => {
      onChange({ ...resolvedValue, [field]: fieldValue });
    },
    [resolvedValue, onChange],
  );

  const { href = "", text = "", target = "_self", pageUuid, collectionItemUuid } = resolvedValue;
  const openInNewTab = target === "_blank";
  const hideText = Boolean(setting?.hide_text);

  // Drive the combobox by the ref's uuid only when its option is loaded (so the
  // label resolves); otherwise fall back to the stored href, so a transient stale
  // cache shows a path rather than a raw uuid — and never drops the underlying ref.
  const selectedRefUuid = pageUuid || collectionItemUuid;
  const comboboxValue = selectedRefUuid && optionsByUuid.has(selectedRefUuid) ? selectedRefUuid : href;

  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      {/* Href Input with Combobox */}
      <SettingsField
        id={`${id}-href`}
        label="Link URL"
        description="Select a page or collection item, or enter a custom URL."
      >
        <Combobox
          options={options}
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
