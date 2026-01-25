import SettingsRenderer from "./SettingsRenderer";

/**
 * SettingsGroup component
 * Renders a group of settings with an optional title
 */
export default function SettingsGroup({ title, settings = [], values = {}, onChange, errors = {} }) {
  return (
    <div className="space-y-6">
      {title && <h3 className="text-lg font-medium text-slate-800">{title}</h3>}
      {settings.map((setting) => (
        <SettingsRenderer
          key={setting.id}
          setting={setting}
          value={values[setting.id]}
          onChange={onChange}
          error={errors[setting.id]}
        />
      ))}
    </div>
  );
}
