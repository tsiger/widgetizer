import { icons, Database } from "lucide-react";

/**
 * Resolve a Lucide icon component from a theme-provided PascalCase name string
 * (e.g. "Briefcase", "Users"). Theme schemas declare icons by name, so this is
 * a runtime lookup rather than a static import.
 *
 * @param {string} name - PascalCase Lucide icon name.
 * @param {React.ComponentType} [fallback=Database] - Component to use when the
 *   name is missing or unknown.
 * @returns {React.ComponentType}
 */
export function resolveLucideIcon(name, fallback = Database) {
  if (typeof name === "string" && name && icons[name]) {
    return icons[name];
  }
  return fallback;
}
