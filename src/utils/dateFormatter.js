/**
 * Date formatting utility with support for multiple date formats
 */

/**
 * Available date format options
 */
export const DATE_FORMATS = {
  "MM/DD/YYYY": {
    label: "MM/DD/YYYY (US)",
    example: "12/31/2024",
  },
  "DD/MM/YYYY": {
    label: "DD/MM/YYYY (EU)",
    example: "31/12/2024",
  },
  "YYYY-MM-DD": {
    label: "YYYY-MM-DD (ISO)",
    example: "2024-12-31",
  },
  "MMM D, YYYY": {
    label: "Month Day, Year",
    example: "Dec 31, 2024",
  },
  "MMMM D, YYYY": {
    label: "Full Month Day, Year",
    example: "December 31, 2024",
  },
  "D MMM YYYY": {
    label: "Day Month Year",
    example: "31 Dec 2024",
  },
  "D MMMM YYYY": {
    label: "Day Full Month Year",
    example: "31 December 2024",
  },
  "MM/DD/YYYY h:mm A": {
    label: "MM/DD/YYYY with 12-hour time",
    example: "12/31/2024 2:15 PM",
  },
  "DD/MM/YYYY HH:mm": {
    label: "DD/MM/YYYY with 24-hour time",
    example: "31/12/2024 14:15",
  },
  "YYYY-MM-DD HH:mm": {
    label: "YYYY-MM-DD with 24-hour time",
    example: "2024-12-31 14:15",
  },
  "MMM D, YYYY h:mm A": {
    label: "Month Day, Year with 12-hour time",
    example: "Dec 31, 2024 2:15 PM",
  },
  "MMMM D, YYYY h:mm A": {
    label: "Full Month Day, Year with 12-hour time",
    example: "December 31, 2024 2:15 PM",
  },
  "D MMM YYYY HH:mm": {
    label: "Day Month Year with 24-hour time",
    example: "31 Dec 2024 14:15",
  },
};

/**
 * Month names for formatting
 */
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

/**
 * Format a date according to the specified format
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format string (one of DATE_FORMATS keys)
 * @returns {string} The formatted date string
 */
export function formatDate(date, format = "MM/DD/YYYY") {
  if (!date) return "";

  const dateObj = new Date(date);

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return "";
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const monthShort = MONTHS_SHORT[dateObj.getMonth()];
  const monthFull = MONTHS_FULL[dateObj.getMonth()];

  // Time components
  const hours24 = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const ampm = hours24 < 12 ? "AM" : "PM";

  // Pad single digits with zero
  const mm = month.toString().padStart(2, "0");
  const dd = day.toString().padStart(2, "0");
  const hh24 = hours24.toString().padStart(2, "0");
  const hh12 = hours12.toString();
  const min = minutes.toString().padStart(2, "0");

  switch (format) {
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${year}`;
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${mm}-${dd}`;
    case "MMM D, YYYY":
      return `${monthShort} ${day}, ${year}`;
    case "MMMM D, YYYY":
      return `${monthFull} ${day}, ${year}`;
    case "D MMM YYYY":
      return `${day} ${monthShort} ${year}`;
    case "D MMMM YYYY":
      return `${day} ${monthFull} ${year}`;
    case "MM/DD/YYYY h:mm A":
      return `${mm}/${dd}/${year} ${hh12}:${min} ${ampm}`;
    case "DD/MM/YYYY HH:mm":
      return `${dd}/${mm}/${year} ${hh24}:${min}`;
    case "YYYY-MM-DD HH:mm":
      return `${year}-${mm}-${dd} ${hh24}:${min}`;
    case "MMM D, YYYY h:mm A":
      return `${monthShort} ${day}, ${year} ${hh12}:${min} ${ampm}`;
    case "MMMM D, YYYY h:mm A":
      return `${monthFull} ${day}, ${year} ${hh12}:${min} ${ampm}`;
    case "D MMM YYYY HH:mm":
      return `${day} ${monthShort} ${year} ${hh24}:${min}`;
    default:
      return `${mm}/${dd}/${year}`;
  }
}

/**
 * Get the current date formatted according to the specified format
 * @param {string} format - The format string (one of DATE_FORMATS keys)
 * @returns {string} The formatted current date string
 */
export function formatCurrentDate(format = "MM/DD/YYYY") {
  return formatDate(new Date(), format);
}

/**
 * Get all available date formats with their labels and examples
 * @returns {Object} Object containing all date formats
 */
export function getAvailableDateFormats() {
  return DATE_FORMATS;
}

/**
 * Validate if a format string is supported
 * @param {string} format - The format string to validate
 * @returns {boolean} True if the format is supported
 */
export function isValidDateFormat(format) {
  return Object.keys(DATE_FORMATS).includes(format);
}
