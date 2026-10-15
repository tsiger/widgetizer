import { ICON_SYNONYMS } from "./iconSynonyms";

/**
 * Icon-picker search: matching and relevance ranking.
 *
 * Plain substring matching on the icon name is not enough at icon-set scale —
 * "photo" misses `camera`, "delete" misses `trash` — and it has no notion of
 * relevance, so an exact hit can sit below incidental substring matches. This
 * scores each icon against every query term across four sources, in descending
 * confidence:
 *
 *   1. the icon name (exact / prefix / hyphen-token / substring)
 *   2. per-icon `keywords`, if the theme's icons.json supplies them
 *   3. the curated search-term synonyms in iconSynonyms.js
 *   4. the group name, so "weather" surfaces a whole category
 */

// Descending, and evaluated in this order — the first source that matches wins.
//
// Free substring matching sits BELOW the synonyms deliberately. Ranked above
// them it produced nonsense on short queries: "bin" surfaced
// `building-wind-turbine` over `trash`, "ai" surfaced `air-conditioning`, "back"
// surfaced `backpack`. It is kept only as a last resort so partial typing still
// finds something.
const SCORE = Object.freeze({
  EXACT: 100,
  PREFIX: 80,
  TOKEN: 70,
  KEYWORD_EXACT: 65,
  SYNONYM_EXACT: 45,
  SYNONYM_PREFIX: 42,
  SYNONYM_TOKEN: 38,
  KEYWORD_PARTIAL: 32,
  SUBSTRING: 30,
  GROUP: 20,
});

const splitTokens = (name) => name.split(/[-_/\s]+/).filter(Boolean);

// Below this length, expanding partial terms across synonym keys matches too
// many unrelated entries to be useful ("pa" would pull in pay, package, paint…).
const MIN_PARTIAL_TERM = 3;

const fragmentCache = new Map();

/**
 * Fragments for a query term: the exact synonym entry, or — while the user is
 * still typing — the union of every entry whose key starts with the term.
 *
 * Without the prefix pass, search results blink out mid-word: "pay" and
 * "payment" are both keys, but "paym" matched neither, so the grid emptied and
 * refilled as the user kept typing. Results are cached because this is called
 * per icon on every keystroke.
 */
function resolveFragments(term) {
  const cached = fragmentCache.get(term);
  if (cached) return cached;

  let fragments = ICON_SYNONYMS[term];
  if (!fragments) {
    if (term.length < MIN_PARTIAL_TERM) {
      fragments = [];
    } else {
      const collected = new Set();
      for (const [key, values] of Object.entries(ICON_SYNONYMS)) {
        if (key.startsWith(term)) values.forEach((value) => collected.add(value));
      }
      fragments = [...collected];
    }
  }

  fragmentCache.set(term, fragments);
  return fragments;
}

/**
 * Score a synonym fragment against a name — on word boundaries only.
 *
 * Free substring matching is unusable here: the fragments are short and generic,
 * so `at` (for "email") pulled in `bat`, `cat` and `bath`, and `x` (for "delete")
 * ranked `home-x` above `trash`. Requiring the whole name, a `fragment-` prefix,
 * or a full hyphen token keeps `mail-x` and `sun-electricity` while dropping the
 * accidental hits. 0 means no match.
 */
function scoreFragment(fragment, name, tokens) {
  if (name === fragment) return SCORE.SYNONYM_EXACT;
  if (name.startsWith(`${fragment}-`)) return SCORE.SYNONYM_PREFIX;
  if (tokens.includes(fragment)) return SCORE.SYNONYM_TOKEN;
  return 0;
}

/**
 * Best score for a single query term against one icon. 0 means no match.
 */
function scoreTerm(term, name, tokens, keywords, groupName) {
  if (name === term) return SCORE.EXACT;
  // Boundary-aware prefix: "photo" matches `photo-edit`, but "back" must not
  // claim `backpack` ahead of the arrow icons its synonym points at.
  if (name.startsWith(`${term}-`)) return SCORE.PREFIX;
  if (tokens.includes(term)) return SCORE.TOKEN;
  if (keywords.includes(term)) return SCORE.KEYWORD_EXACT;

  const fragments = resolveFragments(term);
  if (fragments.length > 0) {
    let best = 0;
    for (const fragment of fragments) {
      best = Math.max(best, scoreFragment(fragment, name, tokens));
    }
    if (best > 0) return best;
  }

  if (keywords.some((kw) => kw.includes(term))) return SCORE.KEYWORD_PARTIAL;
  if (name.includes(term)) return SCORE.SUBSTRING;
  if (groupName && groupName.toLowerCase().includes(term)) return SCORE.GROUP;

  return 0;
}

/**
 * Score one icon against all query terms. Terms are ANDed — "arrow left" must
 * match both — so multi-word queries narrow instead of widening.
 *
 * @param {{name: string, keywords?: string[]}} icon
 * @param {string[]} terms - lowercased query terms
 * @param {string|null} groupName
 * @returns {number} 0 when any term fails to match
 */
export function scoreIcon(icon, terms, groupName = null) {
  const name = String(icon?.name || "").toLowerCase();
  if (!name) return 0;

  const tokens = splitTokens(name);
  const keywords = Array.isArray(icon.keywords)
    ? icon.keywords.map((kw) => String(kw).toLowerCase())
    : [];

  let total = 0;
  for (const term of terms) {
    const score = scoreTerm(term, name, tokens, keywords, groupName);
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

/**
 * Filter and rank grouped icons for a query. Icons are ordered by score within
 * their group, and groups by their best icon, so the most relevant category
 * floats to the top while the grouped layout is preserved.
 *
 * An empty query returns the input untouched.
 *
 * @param {Array<{name: string|null, icons: Array<object>}>} groups
 * @param {string} query
 * @returns {Array<{name: string|null, icons: Array<object>}>}
 */
export function searchIconGroups(groups, query) {
  const terms = String(query || "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) return groups;

  return groups
    .map((group) => {
      const scored = [];
      for (const icon of group.icons) {
        const score = scoreIcon(icon, terms, group.name);
        if (score > 0) scored.push({ icon, score });
      }
      scored.sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name));
      return {
        group: { ...group, icons: scored.map((entry) => entry.icon) },
        best: scored.length > 0 ? scored[0].score : 0,
      };
    })
    .filter((entry) => entry.group.icons.length > 0)
    .sort((a, b) => b.best - a.best)
    .map((entry) => entry.group);
}
