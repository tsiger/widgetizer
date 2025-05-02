import SettingsRenderer from "./SettingsRenderer";

/**
 * SettingsGroup component
 * Renders a group of settings with an optional title
 */
export default function SettingsGroup({ title, settings = [], values = {}, onChange, errors = {} }) {
  return (
    <div className="mb-6">
      {title && <h3 className="text-lg font-medium text-slate-800 mb-4">{title}</h3>}
      <SettingsRenderer settings={settings} values={values} onChange={onChange} errors={errors} />
    </div>
  );
}
