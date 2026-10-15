import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translationGroupIdOf } from "@widgetizer/core/contentAddress";
import { nativeLanguageName } from "@widgetizer/core/languages";
import useToastStore from "../stores/toastStore";

/**
 * The translation group of a page or item, and the one control that fills a gap
 * in it. Shared so that group resolution happens once: an untranslated source
 * records no group of its own, and `translationGroupIdOf` falls back to its uuid
 * — which is the id its versions carry.
 *
 * @param {object[]} entries every language's content, as one list
 * @param {string} defaultLanguage the language the root folder belongs to
 * @param {(entry: object, targetLanguage: string) => Promise<object>} createVersion
 * @param {(created: object) => void} onCreated where to go once it exists
 */
export default function useTranslationVersions({
  entries,
  defaultLanguage,
  createVersion,
  onCreated,
  keys = { created: "common.languages.created", error: "common.languages.createError" },
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [pendingKey, setPendingKey] = useState(null);
  const [created, setCreated] = useState([]);

  // Creating a version usually navigates away, but a navigation guard can cancel
  // that and leave the caller's list as it was — which would offer to create the
  // same version again, for a 409. Patch it in until the list itself carries it.
  const known = new Set(entries.map((entry) => entry.uuid).filter(Boolean));
  const byGroup = new Map();
  for (const entry of [...entries, ...created.filter((entry) => !known.has(entry.uuid))]) {
    const groupId = translationGroupIdOf(entry);
    if (!groupId) continue;
    if (!byGroup.has(groupId)) byGroup.set(groupId, new Map());
    byGroup.get(groupId).set(entry.language || defaultLanguage, entry);
  }

  const siblingsOf = (entry) => (entry ? byGroup.get(translationGroupIdOf(entry)) : null) || new Map();

  const createIn = async (entry, targetLanguage) => {
    setPendingKey(`${entry.id}:${targetLanguage}`);
    try {
      const version = await createVersion(entry, targetLanguage);
      setCreated((previous) => [...previous, version]);
      showToast(t(keys.created, { name: nativeLanguageName(targetLanguage) }), "success");
      onCreated(version);
    } catch (error) {
      showToast(error.message || t(keys.error), "error");
    } finally {
      setPendingKey(null);
    }
  };

  return { siblingsOf, createIn, pendingKey };
}
