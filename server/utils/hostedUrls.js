export function normalizeDashboardUrl(rawUrl) {
  if (!rawUrl || rawUrl === "/") {
    return "/";
  }

  const normalized = rawUrl.replace(/\/+$/, "");

  if (normalized === "/dashboard") {
    return "/";
  }

  if (normalized.endsWith("/dashboard")) {
    return normalized.slice(0, -"/dashboard".length) || "/";
  }

  return normalized;
}
