import { useState, useEffect } from "react";
import { getAllMenus } from "../../../queries/menuManager";

/**
 * MenuSelectInput component
 * Renders a dropdown for selecting from available menus
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

  if (loading) {
    return <div className="form-input text-slate-500">Loading menus...</div>;
  }

  if (error) {
    return <div className="form-input text-red-500">{error}</div>;
  }

  return (
    <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)} className="form-select">
      <option value="">Select a menu...</option>
      {menus.map((menu) => (
        <option key={menu.id} value={menu.id}>
          {menu.name}
        </option>
      ))}
    </select>
  );
}
