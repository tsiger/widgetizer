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

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
 * @returns {string}
 */
export function formatDateOnly(value, format = DEFAULT_DATE_FORMAT) {
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
  const monthShort = MONTHS_SHORT[month - 1];
  const monthFull = MONTHS_FULL[month - 1];

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
