import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { WEEKDAYS } from "@widgetizer/core/siteIdentity";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";

const MAX_RANGES = 4;
const DEFAULT_RANGE = { opens: "09:00", closes: "17:00" };

export default function OpeningHoursEditor({ value, onChange, errorFor }) {
  const { t } = useTranslation();

  const updateDay = (day, next) => onChange({ ...value, [day]: next });

  return (
    <div className="space-y-3">
      {WEEKDAYS.map((day) => {
        const entry = value?.[day] || { mode: "unset", ranges: [] };
        const dayLabel = t(`forms.project.business.days.${day}`);
        const dayError = errorFor(`locations.0.openingHours.${day}`);

        const setMode = (mode) =>
          updateDay(day, { mode, ranges: mode === "open" && entry.ranges.length === 0 ? [{ ...DEFAULT_RANGE }] : entry.ranges });

        const setRange = (index, field, time) =>
          updateDay(day, {
            ...entry,
            ranges: entry.ranges.map((range, current) => (current === index ? { ...range, [field]: time } : range)),
          });

        const removeRange = (index) => {
          const ranges = entry.ranges.filter((_, current) => current !== index);
          updateDay(day, { mode: ranges.length ? "open" : "unset", ranges });
        };

        return (
          <div key={day} className="flex flex-wrap items-start gap-x-3 gap-y-2" data-day={day}>
            <span className="w-24 pt-2 text-sm font-medium text-slate-700">{dayLabel}</span>
            <select
              aria-label={dayLabel}
              value={entry.mode}
              onChange={(event) => setMode(event.target.value)}
              className="form-select w-36"
            >
              {["unset", "closed", "open"].map((mode) => (
                <option key={mode} value={mode}>
                  {t(`forms.project.business.dayModes.${mode}`)}
                </option>
              ))}
            </select>

            {entry.mode === "open" && (
              <div className="min-w-[15rem] flex-1 space-y-2">
                {entry.ranges.map((range, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${dayLabel} ${t("forms.project.business.opens")}`}
                      value={range.opens}
                      onChange={(event) => setRange(index, "opens", event.target.value)}
                      className="form-input w-32"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="time"
                      aria-label={`${dayLabel} ${t("forms.project.business.closes")}`}
                      value={range.closes}
                      onChange={(event) => setRange(index, "closes", event.target.value)}
                      className="form-input w-32"
                    />
                    <Button
                      type="button"
                      variant="icon"
                      size="sm"
                      onClick={() => removeRange(index)}
                      title={t("forms.project.business.removeRange")}
                      aria-label={t("forms.project.business.removeRange")}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
                {entry.ranges.length < MAX_RANGES && (
                  <button
                    type="button"
                    onClick={() => updateDay(day, { ...entry, ranges: [...entry.ranges, { opens: "", closes: "" }] })}
                    className="text-sm text-pink-500 hover:text-pink-700"
                  >
                    {t("forms.project.business.addRange")}
                  </button>
                )}
              </div>
            )}

            {dayError && <p className="form-error w-full">{dayError}</p>}
          </div>
        );
      })}
    </div>
  );
}
