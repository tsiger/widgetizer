import { useState, useEffect, useMemo } from "react";
import { getAllMenus } from "../../../queries/menuManager";

/**
 * MenuSelectInput component
 * Renders a dropdown for selecting from available menus.
 * Stores the menu's stable UUID as the setting value.
 */
export default function MenuSelectInput({ id, value = "", onChange }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Resolve the current value — handles both UUID and legacy slug-based values
  const resolvedValue = useMemo(() => {
    if (!value || menus.length === 0) return value || "";

    // If the value matches a menu UUID, it's already correct
    if (menus.some((m) => m.uuid === value)) return value;

    // Legacy fallback: value might be a slug-based ID (e.g., "main-menu")
    const matchBySlug = menus.find((m) => m.id === value);
    if (matchBySlug) return matchBySlug.uuid;

    // No match — could be a deleted menu, return empty
    return "";
  }, [value, menus]);

  if (loading) {
    return <div className="form-input text-slate-500">Loading menus...</div>;
  }

  if (error) {
    return <div className="form-input text-red-500">{error}</div>;
  }

  return (
    <select id={id} value={resolvedValue} onChange={(e) => onChange(e.target.value)} className="form-select">
      <option value="">Select a menu...</option>
      {menus.map((menu) => (
        <option key={menu.uuid} value={menu.uuid}>
          {menu.name}
        </option>
      ))}
    </select>
  );
}
