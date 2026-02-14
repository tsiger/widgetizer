import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from "../../config";
import LoadingSpinner from "../ui/LoadingSpinner";
import Button from "../ui/Button";
import { formatSlug } from "../../utils/slugUtils";
import useToastStore from "../../stores/toastStore";
import { getThemePresets, getPresetScreenshotUrl } from "../../queries/themeManager";

export default function ProjectForm({
  initialData = { name: "", description: "", theme: "", siteUrl: "" },
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  onCancel,
  onDirtyChange,
  isDirty: isDirtyProp = false,
}) {
  const { t } = useTranslation();
  const isNew = !initialData.id;
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const showToast = useToastStore((state) => state.showToast);

  // Preset state
  const [presets, setPresets] = useState({ default: null, presets: [] });
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      folderName: initialData.folderName || initialData.id || "",
      description: initialData.description || "",
      theme: initialData.theme || "",
      siteUrl: initialData.siteUrl || "",
      preset: "",
    },
  });

  // Watch name for auto-folder-name generation
  const name = watch("name");

  // Watch theme selection for preset fetching
  const selectedTheme = watch("theme");

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Auto-generate folderName from name for new projects
  useEffect(() => {
    if (isNew && name) {
      setValue("folderName", formatSlug(name));
    }
  }, [name, isNew, setValue]);

  // Reset form when initialData actually changes
  useEffect(() => {
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      reset({
        name: initialData.name || "",
        folderName: initialData.folderName || initialData.id || "",
        description: initialData.description || "",
        theme: initialData.theme || "",
        siteUrl: initialData.siteUrl || "",
        preset: "",
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  });

  // Load themes and auto-select default
  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch presets when theme selection changes
  useEffect(() => {
    if (!isNew || !selectedTheme) {
      setPresets({ default: null, presets: [] });
      setSelectedPreset(null);
      setValue("preset", "");
      return;
    }

    const fetchPresets = async () => {
      setPresetsLoading(true);
      try {
        const data = await getThemePresets(selectedTheme);
        setPresets(data);

        if (data.presets.length > 0) {
          const defaultPresetId = data.default || data.presets[0].id;
          setSelectedPreset(defaultPresetId);
          setValue("preset", defaultPresetId);
        } else {
          setSelectedPreset(null);
          setValue("preset", "");
        }
      } catch {
        setPresets({ default: null, presets: [] });
        setSelectedPreset(null);
      } finally {
        setPresetsLoading(false);
      }
    };

    fetchPresets();
  }, [selectedTheme, isNew, setValue]);

  const loadThemes = async () => {
    try {
      const response = await fetch(API_URL("/api/themes"));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setThemes(data);

      // Auto-select Default theme for new projects
      if (isNew && !initialData.theme) {
        const defaultTheme = data.find((theme) => theme.id === "default" || theme.name.toLowerCase() === "default");
        if (defaultTheme) {
          setValue("theme", defaultTheme.id);
        }
      }
    } catch {
      showToast(t("forms.project.loadThemesError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitHandler = async (data) => {
    try {
      // Normalize siteUrl: trim and convert empty/whitespace to empty string
      const normalizedData = {
        ...data,
        siteUrl: data.siteUrl && data.siteUrl.trim() !== "" ? data.siteUrl.trim() : "",
      };

      const result = await onSubmit(normalizedData);

      // If the parent component signals to reset the form
      if (result === true) {
        reset({
          name: "",
          folderName: "",
          description: "",
          theme: "",
          siteUrl: "",
          preset: "",
        });
        setPresets({ default: null, presets: [] });
        setSelectedPreset(null);
      }
      return result;
    } catch (err) {
      showToast(err.message || t("forms.common.formError"), "error");
      return false;
    }
  };

  if (loading) return <LoadingSpinner message={t("forms.project.loadingThemes")} />;

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      <input type="hidden" {...register("preset")} />
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            {t("forms.project.titleLabel")} <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register("name", {
              required: t("forms.project.titleRequired"),
              validate: (value) => value.trim() !== "" || t("forms.project.nameNotEmpty"),
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
          <p className="form-description">{t("forms.project.titleHelp")}</p>
        </div>

        {/* Theme field - shown for new projects before More Settings */}
        {isNew && (
          <div className="form-field">
            <label htmlFor="theme" className="form-label">
              {t("forms.project.themeLabel")} <span className="text-pink-500">*</span>
            </label>
            <select
              id="theme"
              {...register("theme", {
                required: isNew ? t("forms.project.themeRequired") : false,
              })}
              className="form-select"
            >
              <option value="">{t("forms.project.selectTheme")}</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name} {theme.latestVersion && `(v${theme.latestVersion})`}
                </option>
              ))}
            </select>
            {errors.theme && <p className="form-error">{errors.theme.message}</p>}
            <p className="form-description">{t("forms.project.themeHelp")}</p>
          </div>
        )}

        {/* Preset selection - shown when theme has presets */}
        {isNew && presets.presets.length > 0 && (
          <div className="form-field">
            <label className="form-label">{t("forms.project.presetLabel")}</label>
            {presetsLoading ? (
              <p className="text-sm text-gray-500">{t("forms.project.loadingPresets")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {presets.presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setValue("preset", preset.id, { shouldDirty: true });
                    }}
                    className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${
                      selectedPreset === preset.id
                        ? "border-pink-500 ring-2 ring-pink-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <img
                      src={getPresetScreenshotUrl(selectedTheme, preset.id, preset.hasScreenshot)}
                      alt={preset.name}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{preset.name}</p>
                      {preset.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{preset.description}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="form-description">{t("forms.project.presetHelp")}</p>
          </div>
        )}

        {/* Theme info for existing projects */}
        {!isNew && initialData.theme && (
          <div className="form-field">
            <label className="form-label">{t("forms.project.themeLabel")}</label>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{initialData.themeName || initialData.theme}</span>
              {initialData.themeVersion && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  v{initialData.themeVersion}
                </span>
              )}
            </div>
          </div>
        )}

        {/* More Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowMoreSettings(!showMoreSettings)}
          className="flex items-center gap-1 text-sm text-pink-500 hover:text-pink-700 mt-2 mb-4"
        >
          {showMoreSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {t("forms.project.moreSettings")}
        </button>

        {/* Collapsible Settings */}
        {showMoreSettings && (
          <>
            <div className="form-field">
              <label htmlFor="folderName" className="form-label">
                {t("forms.project.folderNameLabel")} <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                id="folderName"
                {...register("folderName", {
                  required: t("forms.project.folderNameRequired"),
                  validate: (value) => value.trim() !== "" || t("forms.project.folderNameNotEmpty"),
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: t("forms.project.folderNamePattern"),
                  },
                })}
                className="form-input"
              />
              {errors.folderName && <p className="form-error">{errors.folderName.message}</p>}
              <p className="form-description">{t("forms.project.folderNameHelp")}</p>
            </div>

            <div className="form-field">
              <label htmlFor="description" className="form-label-optional">
                {t("forms.project.descriptionLabel")}
              </label>
              <textarea id="description" {...register("description")} rows="4" className="form-textarea" />
              <p className="form-description">{t("forms.project.descriptionHelp")}</p>
            </div>

            <div className="form-field">
              <label htmlFor="siteUrl" className="form-label-optional">
                {t("forms.project.siteUrlLabel")}
              </label>
              <input
                type="url"
                id="siteUrl"
                {...register("siteUrl", {
                  validate: (value) => {
                    // Allow empty values
                    if (!value || value.trim() === "") {
                      return true;
                    }
                    // If a value is provided, validate URL format
                    try {
                      new URL(value.trim());
                      return true;
                    } catch {
                      return t("forms.project.siteUrlInvalid") || "Please enter a valid URL (e.g., https://mysite.com)";
                    }
                  },
                })}
                className="form-input"
                placeholder="https://mysite.com"
              />
              {errors.siteUrl && <p className="form-error">{errors.siteUrl.message}</p>}
              <p className="form-description">{t("forms.project.siteUrlHelp")}</p>
            </div>
          </>
        )}
      </div>

      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("forms.common.saving") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
        {isDirtyProp && onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("forms.common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
