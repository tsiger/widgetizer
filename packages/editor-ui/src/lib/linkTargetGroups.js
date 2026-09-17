import { nativeLanguageName } from "@widgetizer/core/languages";

/**
 * Group link targets for a native `<select>`, which has no room for the filter row
 * the combobox gets. Every language stays reachable (§4a); the one being edited
 * simply comes first, and a target from elsewhere carries its code.
 *
 * @param {object[]} options   link targets ({ value, label, group, language })
 * @param {boolean} isMultilang
 * @param {string} editingLanguage
 * @returns {{key: string, label: string, items: {value: string, label: string}[]}[]}
 */
export function groupLinkTargets(options, { isMultilang, editingLanguage }) {
  // A stable sort, so each language keeps the order it arrived in.
  const ordered = isMultilang
    ? [...options].sort((a, b) => (a.language === editingLanguage ? 0 : 1) - (b.language === editingLanguage ? 0 : 1))
    : options;

  const groups = [];
  for (const option of ordered) {
    const key = isMultilang && option.language ? `${option.group}|${option.language}` : option.group;
    let group = groups.find((each) => each.key === key);
    if (!group) {
      group = {
        key,
        label:
          isMultilang && option.language
            ? `${option.group} · ${nativeLanguageName(option.language)}`
            : option.group,
        items: [],
      };
      groups.push(group);
    }
    const elsewhere = isMultilang && option.language && option.language !== editingLanguage;
    group.items.push({ value: option.value, label: elsewhere ? `${option.label} (${option.language})` : option.label });
  }
  return groups;
}
