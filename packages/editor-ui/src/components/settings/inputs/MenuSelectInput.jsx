import { useState, useEffect, useMemo } from "react";
import { getAllMenus } from "../../../queries/menuManager";
import { useDefaultLanguage, useIsMultilang } from "../../../stores/projectStore";
import { useEditingLanguage } from "../../../lib/editingLanguage.jsx";

/**
 * MenuSelectInput component
 * Renders a dropdown for selecting from available menus.
 * Stores the menu's stable UUID as the setting value.
 *
 * Unlike the link pickers (§4a), this one does NOT offer every language: menus are
 * a per-language set, seeded together, and a Greek header pointing at the English
 * menu renders English labels rather than reaching a page that exists nowhere else.
 * A value already pointing elsewhere is still listed, so it shows what it is
 * instead of silently reading as "none".
 */
export default function MenuSelectInput({ id, value = "", onChange }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMultilang = useIsMultilang();
  const defaultLanguage = useDefaultLanguage();
  const editingLanguage = useEditingLanguage();

  useEffect(() => {
    const loadMenus = async () => {
      try {
        setLoading(true);
        const menuData = await getAllMenus();
        setMenus(menuData);
      } catch (err) {
        console.error("Failed to load menus:", err);
        setError("Failed to load menus.");
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  const inLanguage = useMemo(
    () => (isMultilang ? menus.filter((m) => (m.language || defaultLanguage) === editingLanguage) : menus),
    [menus, isMultilang, defaultLanguage, editingLanguage],
  );

  // Resolve the current value; handles both UUID and slug-based values.
  const resolvedValue = useMemo(() => {
    if (!value || menus.length === 0) return value || "";

    // If the value matches a menu UUID, it's already correct
    if (menus.some((m) => m.uuid === value)) return value;

    // Legacy fallback: value might be a slug-based ID (e.g., "main-menu"). A
    // bare slug means THIS language's menu of that name, falling back to the
    // root one when the language has none — the same rule `resolveMenuSettings`
    // follows, so the picker never shows one menu while the page renders another.
    const matchBySlug =
      inLanguage.find((m) => m.id === value) ||
      menus.find((m) => m.id === value && (m.language || defaultLanguage) === defaultLanguage);
    if (matchBySlug) return matchBySlug.uuid;

    // No match — could be a deleted menu, return empty
    return "";
  }, [value, menus, inLanguage, defaultLanguage]);

  if (loading) {
    return <div className="form-input text-slate-500">Loading menus...</div>;
  }

  if (error) {
    return <div className="form-input text-red-500">{error}</div>;
  }

  const chosenElsewhere =
    isMultilang && resolvedValue && !inLanguage.some((m) => m.uuid === resolvedValue)
      ? menus.find((m) => m.uuid === resolvedValue)
      : null;

  return (
    <select id={id} value={resolvedValue} onChange={(e) => onChange(e.target.value)} className="form-select">
      <option value="">Select a menu...</option>
      {inLanguage.map((menu) => (
        <option key={menu.uuid} value={menu.uuid}>
          {menu.name}
        </option>
      ))}
      {chosenElsewhere && (
        <option key={chosenElsewhere.uuid} value={chosenElsewhere.uuid}>
          {`${chosenElsewhere.name} (${chosenElsewhere.language})`}
        </option>
      )}
    </select>
  );
}
