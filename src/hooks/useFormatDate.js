import { useCallback } from "react";
import useAppSettings from "./useAppSettings";
import { DEFAULT_DATE_FORMAT, formatDate as formatDateUtil } from "../utils/dateFormatter";

/**
 * Format dates using the current app-level date format setting.
 *
 * @returns {{
 *   dateFormat: string,
 *   formatDate: (date: Date|string|number) => string
 * }}
 */
export default function useFormatDate() {
  const { settings } = useAppSettings();
  const dateFormat = settings?.general?.dateFormat || DEFAULT_DATE_FORMAT;

  const formatDate = useCallback(
    (date) => {
      return formatDateUtil(date, dateFormat);
    },
    [dateFormat],
  );

  return { dateFormat, formatDate };
}
