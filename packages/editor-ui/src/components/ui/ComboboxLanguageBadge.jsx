import { nativeLanguageName, hreflangCase } from "@widgetizer/core/languages";

/**
 * The selected target's language, shown inside a closed link field. Two pages can
 * share a name across languages ("About" in English and in Greek), and once the
 * list is closed the badge is all that tells them apart. The field decides when
 * to show it (multilingual site, a selected target rather than a typed link) and
 * pads its input to make room; the badge sits just left of the chevron.
 *
 * @param {string} language the selected option's language code
 */
export default function ComboboxLanguageBadge({ language }) {
  return (
    <span
      title={nativeLanguageName(language)}
      className="pointer-events-none absolute inset-y-0 right-9 my-auto h-fit rounded border border-slate-200 bg-white px-1 text-xs text-slate-500"
    >
      {hreflangCase(language)}
    </span>
  );
}
