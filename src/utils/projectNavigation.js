const WORKSPACE_ROUTE_MAP = [
  ["/pages", "/pages"],
  ["/menus", "/menus"],
  ["/media", "/media"],
  ["/settings", "/settings"],
  ["/themes", "/themes"],
  ["/export-site", "/export-site"],
];

export function resolveWorkspaceDestination(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return "/pages";
  }

  const normalizedPath = rawPath.trim();

  for (const [prefix, destination] of WORKSPACE_ROUTE_MAP) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`) || normalizedPath.startsWith(`${prefix}?`)) {
      return destination;
    }
  }

  return "/pages";
}
