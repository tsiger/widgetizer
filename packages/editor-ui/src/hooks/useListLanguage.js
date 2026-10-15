import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDefaultLanguage, useExtraLanguages, useIsMultilang } from "../stores/projectStore";

/**
 * The language tab a content list shows, kept in the URL (`?language=`) so that
 * coming back to the list — the browser's back button, or any back link that
 * names the language — lands on the tab the user left. Component state alone
 * started on the default language every time the list mounted.
 *
 * A URL with no language shows `fallback`, else the default language; a
 * single-language site never has one. Choosing a tab always writes it, the
 * default included, so "no language" can mean "not said" rather than "the
 * default". A code the site does not have (a removed language, a hand-typed URL)
 * is dropped.
 *
 * `fallback` is for the collections screen, which passes the tab it held for the
 * previous collection, since the sidebar's links to a collection carry no
 * language. The URL is then brought in line with it, so a later back still finds
 * it.
 *
 * @param {string} [fallback]
 * @returns {[string, (code: string) => void]}
 */
export default function useListLanguage(fallback) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const extraLanguages = useExtraLanguages();

  const requested = searchParams.get("language");
  const isSiteLanguage = (code) => code === defaultLanguage || extraLanguages.includes(code);
  let active = defaultLanguage;
  if (isMultilang && isSiteLanguage(requested)) active = requested;
  else if (isMultilang && fallback && isSiteLanguage(fallback)) active = fallback;

  const setActive = (code) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("language", code);
        return next;
      },
      { replace: true },
    );
  };

  // The URL says what is on screen: drop a code the site does not have, and write
  // in a fallback tab. Replacing, so neither adds a history entry.
  const stale = requested !== null && requested !== active;
  const unwritten = requested === null && active !== defaultLanguage;
  useEffect(() => {
    if (!stale && !unwritten) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (active === defaultLanguage) next.delete("language");
        else next.set("language", active);
        return next;
      },
      { replace: true },
    );
  }, [stale, unwritten, active, defaultLanguage, setSearchParams]);

  return [active, setActive];
}
