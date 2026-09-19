/**
 * Shared, timezone-safe date-only formatting.
 *
 * Lives under src/core so it can be imported by both the published-site Liquid
 * filter (server) and the admin UI (browser) without pulling in backend code.
 *
 * A "YYYY-MM-DD" value is formatted by SPLITTING the string — never
 * `new Date("YYYY-MM-DD")`, which parses as UTC midnight and renders the
 * previous day in any timezone behind UTC.
 */

export const DEFAULT_DATE_FORMAT = "MMMM D, YYYY";

/**
 * Month names come from `Intl`, in the language asked for. Only the month moves:
 * the day, year and separators are still assembled here, so the format a site
 * chose is the format it keeps — a locale's own date order never takes over.
 *
 * A DAY IS ASKED FOR ALONGSIDE IT and the month read back out of the parts,
 * because many languages inflect a month differently on its own than inside a
 * date: Russian `март` alone but `4 марта`, Polish `marzec` but `4 marca`,
 * Ukrainian `березень` but `4 березня`, Czech `březen` but `4 března`. Asking
 * for the month by itself is asking for the wrong word in all of them — Greek
 * only looks fine because its two forms happen to coincide here.
 */
const monthFormatters = new Map();

// Day 15 rather than 1: no calendar puts a month boundary there, so the
// formatter cannot land on a neighbouring month whatever it does internally.
const SAFE_DAY = 15;

function formatterFor(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!monthFormatters.has(key)) {
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat(locale, options);
    } catch {
      // An unusable language tag must not take the date down with it.
      formatter = new Intl.DateTimeFormat("en", options);
    }
    monthFormatters.set(key, formatter);
  }
  return monthFormatters.get(key);
}

function monthName(month, style, locale) {
  const when = Date.UTC(2020, month - 1, SAFE_DAY);
  const parts = formatterFor(locale, { day: "numeric", month: style, timeZone: "UTC" }).formatToParts(when);
  const inDate = parts.find((part) => part.type === "month")?.value || "";
  // `MMM`/`MMMM` mean a month's NAME. Some languages write a short date with a
  // number instead (Czech `4. 3.`, Japanese), and a number is not what the
  // format asked for — so fall back to the name on its own there.
  if (inDate && !/^\d+$/.test(inDate)) return inDate;
  return formatterFor(locale, { month: style, timeZone: "UTC" }).format(when);
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The app/dashboard date format setting offers timestamp formats too (with a time
 * component). Map those to their date-only equivalent so a date-only value never
 * renders a spurious "12:00 AM". Date-only tokens pass through unchanged.
 */
const TIME_TO_DATE_ONLY = {
  "MM/DD/YYYY h:mm A": "MM/DD/YYYY",
  "DD/MM/YYYY HH:mm": "DD/MM/YYYY",
  "YYYY-MM-DD HH:mm": "YYYY-MM-DD",
  "MMM D, YYYY h:mm A": "MMM D, YYYY",
  "MMMM D, YYYY h:mm A": "MMMM D, YYYY",
  "D MMM YYYY HH:mm": "D MMM YYYY",
  "D MMMM YYYY HH:mm": "D MMMM YYYY",
};

/** Normalize a format token to its date-only form (strips any time portion). */
export function toDateOnlyFormat(token) {
  return TIME_TO_DATE_ONLY[token] || token;
}

/**
 * Format a date-only "YYYY-MM-DD" string per a date-only format token. Returns ""
 * for anything that isn't a real YYYY-MM-DD calendar date. Timezone-safe.
 *
 * @param {string} value  - "YYYY-MM-DD"
 * @param {string} format - a supported date format token (time tokens are reduced to date-only)
 * @param {string} [locale] - the language the month is read in; English when omitted,
 *   which is what the editor wants — it stays English whatever the site publishes in
 * @returns {string}
 */
export function formatDateOnly(value, format = DEFAULT_DATE_FORMAT, locale = "en") {
  if (typeof value !== "string") return "";
  const m = DATE_ONLY_REGEX.exec(value);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]); // 1-31
  if (month < 1 || month > 12 || day < 1) return "";
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return "";

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const monthShort = monthName(month, "short", locale || "en");
  const monthFull = monthName(month, "long", locale || "en");

  switch (toDateOnlyFormat(format)) {
    case "D MMMM YYYY":
      return `${day} ${monthFull} ${year}`;
    case "MMM D, YYYY":
      return `${monthShort} ${day}, ${year}`;
    case "D MMM YYYY":
      return `${day} ${monthShort} ${year}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${year}`;
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${mm}-${dd}`;
    case "MMMM D, YYYY":
    default:
      return `${monthFull} ${day}, ${year}`;
  }
}
