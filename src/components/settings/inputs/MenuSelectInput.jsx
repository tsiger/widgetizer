import { useState, useEffect } from "react";
import { getAllMenus } from "../../../utils/menuManager";
import SettingsField from "../SettingsField";

/**
 * MenuSelectInput component
 * Renders a dropdown for selecting from available menus
 */
export default function MenuSelectInput({ id, label, value = "", onChange, description, error }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenus = async () => {
      try {
        const menuData = await getAllMenus();
        setMenus(menuData);
      } catch (err) {
        console.error("Failed to load menus:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  return (
    <SettingsField id={id} label={label} description={description} error={error}>
      <div className="relative">
        <select
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[30px] px-3 border border-slate-300 rounded-sm text-sm appearance-none bg-white bg-no-repeat bg-[right_8px_center] bg-[length:16px_16px] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%23475565%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          <option value="">Select a menu...</option>
          {menus.map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="mt-1 text-xs text-slate-500">Loading menus...</p>}
    </SettingsField>
  );
}
