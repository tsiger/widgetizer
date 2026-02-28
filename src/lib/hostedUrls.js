export function joinDashboardUrl(baseUrl, itemPath) {
  if (!baseUrl) return itemPath;

  if (baseUrl === "/") {
    return itemPath;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  if (itemPath === "/") {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}${itemPath}`;
}
