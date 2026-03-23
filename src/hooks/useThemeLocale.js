import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/apiFetch";
import useProjectStore from "../stores/projectStore";

// Module-level cache: lang → { data, timestamp }
const localeCache = {};
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Developer mode flag — when true, cache is always considered stale
let devModeEnabled = false;
let devModeChecked = false;

function checkDevMode() {
  if (devModeChecked) return;
  devModeChecked = true;
  apiFetch("/api/settings")
    .then((res) => (res.ok ? res.json() : {}))
    .then((settings) => {
      devModeEnabled = !!settings?.developer?.enabled;
    })
    .catch(() => {});
}

// Module-level in-flight tracking — shared across ALL hook instances
let inflightPromise = null;
let inflightLang = null;

// Subscribers for useSyncExternalStore
const listeners = new Set();
function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const cb of listeners) cb();
}

// Snapshot: returns the locale data for a given lang (or null).
// Returns stale data while a re-fetch is in progress to avoid
// a flash of raw keys when the cache expires.
function getSnapshot(lang) {
  const cached = localeCache[lang];
  if (!cached) return null;
  return cached.data;
}

function isStale(lang) {
  if (devModeEnabled) return true;
  const cached = localeCache[lang];
  return !cached || Date.now() - cached.timestamp >= STALE_TIME;
}

/**
 * Pure resolver for tTheme:-prefixed strings.
 * Exported separately so it can be unit-tested without React.
 */
export function resolveThemeKey(str, locale) {
  if (!str) return str;
  if (!str.startsWith("tTheme:")) return str;
  const key = str.slice(7); // "tTheme:".length === 7
  if (!locale) return key;
  const segments = key.split(".");
  let val = locale;
  for (const seg of segments) {
    if (val == null || typeof val !== "object") return key;
    val = val[seg];
  }
  return typeof val === "string" ? val : key;
}

export function useThemeLocale() {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const activeProject = useProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id;

  // Check developer mode once on first use
  checkDevMode();

  // Subscribe to locale cache changes — re-renders when notify() is called
  const locale = useSyncExternalStore(subscribe, () => getSnapshot(lang));

  // Fetch when cache is empty/stale (keeps serving stale data until refresh completes)
  useEffect(() => {
    if (!projectId) return;
    if (!isStale(lang)) return;

    // Another instance is already fetching this lang
    if (inflightLang === lang && inflightPromise) return;

    inflightLang = lang;
    inflightPromise = apiFetch(`/api/themes/project/${projectId}/locales/${lang}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        localeCache[lang] = { data, timestamp: Date.now() };
        notify();
      })
      .catch(() => {
        // don't cache errors
      })
      .finally(() => {
        inflightPromise = null;
        inflightLang = null;
      });
  }, [lang, projectId]);

  const tTheme = useCallback(
    (str) => resolveThemeKey(str, locale),
    [locale],
  );

  return { tTheme };
}
