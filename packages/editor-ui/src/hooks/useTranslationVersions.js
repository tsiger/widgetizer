import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
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
 * @param {(created: object) => void} onCreated where to go once it exists; skipped when
 *   the user has left the screen or navigated anywhere since the click
 * @param {(created: object) => void} [afterCreate] what must happen once it exists
 *   wherever the user is now, such as dropping caches that would miss it
 */
export default function useTranslationVersions({
  entries,
  defaultLanguage,
  createVersion,
  onCreated,
  afterCreate,
  keys = { created: "common.languages.created", error: "common.languages.createError" },
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [pendingKey, setPendingKey] = useState(null);
  const [created, setCreated] = useState([]);

  // Where the user is, read when a creation finishes. Leaving a screen unmounts
  // it, but another collection's list or another page in the editor reuses the
  // same one with a new address, so any navigation since the click counts as
  // leaving, a language tab included.
  const location = useLocation();
  const here = useRef({ mounted: true, key: location.key });
  useEffect(() => {
    here.current.key = location.key;
  }, [location.key]);
  useEffect(() => {
    const current = here.current;
    current.mounted = true;
    return () => {
      current.mounted = false;
    };
  }, []);

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
    const startedOn = here.current.key;
    let version;
    try {
      version = await createVersion(entry, targetLanguage);
    } catch (error) {
      showToast(error.message || t(keys.error), "error");
      setPendingKey(null);
      return;
    }
    // Recorded even for a user who moved on: one still on this list (another
    // language tab) must not be offered the same version again.
    setCreated((previous) => [...previous, version]);
    setPendingKey(null);
    showToast(t(keys.created, { name: nativeLanguageName(targetLanguage) }), "success");
    afterCreate?.(version);
    // The version exists either way; only a user still where they asked is taken to it.
    if (!here.current.mounted || here.current.key !== startedOn) return;
    onCreated(version);
  };

  return { siblingsOf, createIn, pendingKey };
}
