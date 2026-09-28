import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { ExternalLink, Check } from "lucide-react";
import { apiFetch } from "@widgetizer/editor-ui/lib/apiFetch";
import LoadingSpinner from "@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";
import { formatSlug } from "@widgetizer/editor-ui/utils/slugUtils";
import { isValidSiteUrl, siteUrlHasQueryOrFragment } from "@widgetizer/core/urlSafety";
import { identityKind } from "@widgetizer/core/siteIdentity";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, nativeLanguageName, hreflangCase } from "@widgetizer/core/languages";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";
import { getThemePresets, getPresetScreenshotUrl } from "@widgetizer/editor-ui/queries/themeManager";
import SiteIdentityFields from "./SiteIdentityFields.jsx";
import LanguagesSection from "./LanguagesSection.jsx";
import { identityToForm, formToIdentity, isBusinessIdentityError } from "./siteIdentityForm.js";

const READINESS_TARGETS = {
  siteUrl: { tab: "site", fieldId: "siteUrl" },
  name: { tab: "identity", fieldId: "identity-publicName" },
  logo: { tab: "identity", fieldId: "identity-logo" },
  address: { tab: "business", fieldId: "identity-streetAddress" },
};

export default function ProjectForm({
  initialData = { name: "", description: "", siteTitle: "", theme: "", siteUrl: "", cleanUrls: false },
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
  const [activeTab, setActiveTab] = useState("general");
  const showToast = useToastStore((state) => state.showToast);
  const [identityErrors, setIdentityErrors] = useState([]);
  // Not a form field: adding or removing a language writes content on the
  // server the moment it is done, so it can neither wait for Save nor be
  // undone by Cancel. Held here only to keep the section and the default
  // language's lock in step with each other.
  const [languages, setLanguages] = useState(initialData.languages || []);
  // A language request in flight will decide whether the default is locked, and
  // it answers about the language the SERVER holds — so the select stays put
  // until it settles, or a change made in the meantime would be locked in.
  const [languageBusy, setLanguageBusy] = useState(false);

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
      siteTitle: initialData.siteTitle || "",
      theme: initialData.theme || "",
      siteUrl: initialData.siteUrl || "",
      cleanUrls: initialData.cleanUrls || false,
      defaultLanguage: initialData.defaultLanguage || DEFAULT_LANGUAGE,
      receiveThemeUpdates: initialData.receiveThemeUpdates || false,
      preset: "",
      siteIdentity: identityToForm(initialData.siteIdentity),
      logoFile: null,
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

  // Detect whether the sticky action bar is currently covering scrollable content.
  // The sentinel sits right after the bar in the DOM, so it is only visible when
  // the form is fully scrolled to the bottom (or short enough not to need scrolling).
  // We must observe against the actual scrolling ancestor (not the viewport), since
  // the page is laid out inside an inner overflow-y-auto container.
  const stickyBarSentinelRef = useRef(null);
  const [isStickyBarStuck, setIsStickyBarStuck] = useState(false);
  useEffect(() => {
    const sentinel = stickyBarSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const findScrollParent = (node) => {
      let current = node?.parentElement || null;
      while (current && current !== document.body) {
        const { overflowY } = window.getComputedStyle(current);
        if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };
    const observer = new IntersectionObserver(([entry]) => setIsStickyBarStuck(!entry.isIntersecting), {
      root: findScrollParent(sentinel),
      threshold: 1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [presets, themes, presetsLoading, activeTab]);

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
        siteTitle: initialData.siteTitle || "",
        theme: initialData.theme || "",
        siteUrl: initialData.siteUrl || "",
        cleanUrls: initialData.cleanUrls || false,
        receiveThemeUpdates: initialData.receiveThemeUpdates || false,
        preset: "",
        siteIdentity: identityToForm(initialData.siteIdentity),
        logoFile: null,
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

        if (data.default && data.presets.some((preset) => preset.id === data.default)) {
          const defaultPresetId = data.default;
          setSelectedPreset(defaultPresetId);
          setValue("preset", defaultPresetId);
        } else {
          setSelectedPreset(null);
          setValue("preset", "");
        }
      } catch {
        setPresets({ default: null, presets: [] });
        setSelectedPreset(null);
        setValue("preset", "");
      } finally {
        setPresetsLoading(false);
      }
    };

    fetchPresets();
  }, [selectedTheme, isNew, setValue]);

  const loadThemes = async () => {
    try {
      const response = await apiFetch("/api/themes");
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

  const identityValues = watch("siteIdentity");
  const showBusinessTab =
    identityKind({ category: identityValues?.category }) === "localBusiness" ||
    identityErrors.some(isBusinessIdentityError);
  const tabs = ["general", "site", "identity", ...(showBusinessTab ? ["business"] : [])];
  const currentTab = tabs.includes(activeTab) ? activeTab : "identity";
  const tabHasErrors = {
    general: !!(errors.name || errors.theme || errors.folderName),
    site: !!errors.siteUrl,
    identity: identityErrors.some((error) => !isBusinessIdentityError(error)),
    business: identityErrors.some(isBusinessIdentityError),
  };

  const goToField = (tab, fieldId) => {
    setActiveTab(tab);
    setTimeout(() => {
      const field = document.getElementById(fieldId);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus();
    });
  };

  const goToReadinessItem = (item) => {
    const target = READINESS_TARGETS[item];
    if (target) goToField(target.tab, target.fieldId);
  };

  const onInvalid = (formErrors) => {
    if (formErrors.name || formErrors.theme || formErrors.folderName) setActiveTab("general");
    else if (formErrors.siteUrl) setActiveTab("site");
  };

  const onSubmitHandler = async (data) => {
    try {
      const { siteIdentity: identityForm, logoFile, ...fields } = data;
      // Normalize siteUrl: trim and convert empty/whitespace to empty string
      const normalizedData = {
        ...fields,
        siteTitle: data.siteTitle && data.siteTitle.trim() !== "" ? data.siteTitle.trim() : "",
        siteUrl: data.siteUrl && data.siteUrl.trim() !== "" ? data.siteUrl.trim() : "",
      };

      const { value, errors: identityProblems } = formToIdentity(identityForm);
      setIdentityErrors(identityProblems);
      if (identityProblems.length) {
        setActiveTab(isBusinessIdentityError(identityProblems[0]) ? "business" : "identity");
        showToast(t("forms.project.identity.errors.fixErrors"), "error");
        return false;
      }
      normalizedData.siteIdentity = value;
      if (isNew && logoFile) normalizedData.logoFile = logoFile;

      const result = await onSubmit(normalizedData);

      // If the parent component signals to reset the form
      if (result === true) {
        reset({
          name: "",
          folderName: "",
          description: "",
          siteTitle: "",
          theme: "",
          siteUrl: "",
          cleanUrls: false,
          defaultLanguage: DEFAULT_LANGUAGE,
          receiveThemeUpdates: false,
          preset: "",
          siteIdentity: identityToForm({}),
          logoFile: null,
        });
        setPresets({ default: null, presets: [] });
        setSelectedPreset(null);
        setActiveTab("general");
      }
      return result;
    } catch (err) {
      showToast(err.message || t("forms.common.formError"), "error");
      return false;
    }
  };

  if (loading) return <LoadingSpinner message={t("forms.project.loadingThemes")} />;

  const nameField = (
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
  );

  const themeInfo = initialData.theme && (
    <div className="form-field">
      <label className="form-label">{t("forms.project.themeLabel")}</label>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">{initialData.themeName || initialData.theme}</span>
        {initialData.themeVersion && (
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">v{initialData.themeVersion}</span>
        )}
      </div>
    </div>
  );

  const folderNameField = () => (
    <div className="form-field">
      <label htmlFor="folderName" className={isNew ? "form-label-optional" : "form-label"}>
        {t("forms.project.folderNameLabel")} {!isNew && <span className="text-pink-500">*</span>}
      </label>
      <input
        type="text"
        id="folderName"
        {...register("folderName", {
          // A new project may leave it empty (e.g. a title with no Latin letters); the server picks one.
          required: !isNew && t("forms.project.folderNameRequired"),
          validate: (value) => isNew || value.trim() !== "" || t("forms.project.folderNameNotEmpty"),
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
  );

  const notesField = () => (
    <div className="form-field">
      <label htmlFor="description" className="form-label-optional">
        {t("forms.project.descriptionLabel")}
      </label>
      <textarea id="description" {...register("description")} rows="4" className="form-textarea" />
      <p className="form-description">{t("forms.project.descriptionHelp")}</p>
    </div>
  );

  const siteTitleField = () => (
    <div className="form-field">
      <label htmlFor="siteTitle" className="form-label-optional">
        {t("forms.project.siteTitleLabel")}
      </label>
      <input type="text" id="siteTitle" {...register("siteTitle")} className="form-input" />
      <p className="form-description">{t("forms.project.siteTitleHelp")}</p>
    </div>
  );

  const siteUrlField = () => (
    <div className="form-field">
      <label htmlFor="siteUrl" className="form-label-optional">
        {t("forms.project.siteUrlLabel")}
      </label>
      <input
        type="text"
        id="siteUrl"
        {...register("siteUrl", {
          validate: (value) =>
            isValidSiteUrl(value) ||
            // A query/fragment is the one rejection worth naming: the
            // address is otherwise fine and the fix is to delete a bit.
            (siteUrlHasQueryOrFragment(value)
              ? t("forms.project.siteUrlNoQueryOrFragment")
              : t("forms.project.siteUrlInvalid")) ||
            "Please enter a valid URL (e.g., https://mysite.com)",
        })}
        className="form-input"
        placeholder="https://mysite.com"
      />
      {errors.siteUrl && <p className="form-error">{errors.siteUrl.message}</p>}
      <p className="form-description">{t("forms.project.siteUrlHelp")}</p>
    </div>
  );

  const isMultilang = languages.length > 0;
  const savedDefaultLanguage = initialData.defaultLanguage || DEFAULT_LANGUAGE;
  // A stored regional code (pt-br) is valid but is not one of the offered base
  // codes, and an option-less select would render blank.
  const languageOptions = SUPPORTED_LANGUAGES.some(({ code }) => code === savedDefaultLanguage)
    ? SUPPORTED_LANGUAGES
    : [{ code: savedDefaultLanguage }, ...SUPPORTED_LANGUAGES];

  const defaultLanguageField = () => (
    <div className="form-field">
      <label htmlFor="defaultLanguage" className="form-label">
        {t("forms.project.languages.defaultLabel")}
      </label>
      <select
        id="defaultLanguage"
        {...register("defaultLanguage")}
        className="form-select"
        disabled={isMultilang || languageBusy}
      >
        {languageOptions.map(({ code }) => (
          <option key={code} value={code}>
            {nativeLanguageName(code)} ({hreflangCase(code)})
          </option>
        ))}
      </select>
    </div>
  );

  const checkboxField = (fieldName, labelKey, helpKey) => (
    <div className="form-field">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          {...register(fieldName)}
          className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
        />
        <span className="form-label !mb-0">{t(labelKey)}</span>
      </label>
      <p className="form-description ml-7">{t(helpKey)}</p>
    </div>
  );

  const identityProps = {
    register,
    watch,
    setValue,
    identityErrors,
    project: initialData,
    siteUrl: watch("siteUrl"),
    siteTitle: watch("siteTitle"),
    onGoTo: goToReadinessItem,
    logoFile: watch("logoFile"),
    onLogoFileChange: (file) => setValue("logoFile", file, { shouldDirty: true }),
  };

  const stickyBar = (
    <>
      <div
        className={`sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t bg-white px-4 py-4 rounded-b-md z-10 transition-shadow duration-200 ${
          isStickyBarStuck
            ? "border-slate-200 shadow-[0_-12px_24px_-4px_rgba(15,23,42,0.18)] after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-10 after:bg-white"
            : "border-transparent"
        }`}
      >
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            {t("forms.common.cancel")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !isDirtyProp} variant={isDirtyProp ? "dark" : "primary"}>
          {isSubmitting ? t("forms.common.saving") : submitLabel}
          {isDirtyProp && <span className="w-2 h-2 bg-pink-500 rounded-full -mt-2" />}
        </Button>
      </div>
      <div ref={stickyBarSentinelRef} aria-hidden="true" className="h-px" />
    </>
  );

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler, onInvalid)} noValidate className="space-y-6">
      {isNew && <input type="hidden" {...register("preset")} />}
      <div
        role="tablist"
        aria-label={t("forms.project.tabs.label")}
        className="flex flex-wrap gap-1 border-b border-slate-200"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`project-tab-${tab}`}
            aria-selected={currentTab === tab}
            aria-controls={`project-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              currentTab === tab
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {t(`forms.project.tabs.${tab}`)}
            {tabHasErrors[tab] && (
              <span className="h-2 w-2 rounded-full bg-pink-500" title={t("forms.project.tabs.hasErrors")} />
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="project-panel-general"
        aria-labelledby="project-tab-general"
        hidden={currentTab !== "general"}
        className="form-section"
      >
        <div className="max-w-xl space-y-4">
          {nameField}

          {!isNew && themeInfo}

          {isNew && (
            <div className="form-field">
              <label htmlFor="theme" className="form-label">
                {t("forms.project.themeLabel")} <span className="text-pink-500">*</span>
              </label>
              <select
                id="theme"
                {...register("theme", {
                  required: t("forms.project.themeRequired"),
                })}
                className="form-select"
              >
                <option value="">{t("forms.project.selectTheme")}</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} {theme.version && `(v${theme.version})`}
                  </option>
                ))}
              </select>
              {errors.theme && <p className="form-error">{errors.theme.message}</p>}
              <p className="form-description">{t("forms.project.themeHelp")}</p>
            </div>
          )}
        </div>

        {isNew && presets.presets.length > 0 && (
          <div className="form-field">
            <label className="form-label">{t("forms.project.presetLabel")}</label>
            {presetsLoading ? (
              <p className="text-sm text-gray-500">{t("forms.project.loadingPresets")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {presets.presets.map((preset) => (
                  <div key={preset.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        const nextPresetId = selectedPreset === preset.id ? null : preset.id;
                        setSelectedPreset(nextPresetId);
                        setValue("preset", nextPresetId || "", { shouldDirty: true });
                      }}
                      className={`group relative w-full rounded-lg overflow-hidden text-left transition-all ${
                        selectedPreset === preset.id
                          ? "border-[3px] border-pink-500 ring-2 ring-pink-500/20"
                          : "border-2 border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-400"
                      }`}
                    >
                      <img
                        src={getPresetScreenshotUrl(selectedTheme, preset.id, preset.hasScreenshot)}
                        alt={preset.name}
                        className="w-full aspect-square object-cover"
                      />
                      {selectedPreset === preset.id ? (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow">
                          <Check size={14} className="text-white" />
                        </div>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors pointer-events-none" />
                          <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold bg-black/50 px-2.5 py-1 rounded pointer-events-none">
                            Select
                          </span>
                        </>
                      )}
                    </button>
                    {preset.description && (
                      <p className="mt-2 text-center text-sm font-semibold leading-tight">{preset.description}</p>
                    )}
                    <p className={`text-center text-xs text-slate-500 ${preset.description ? "" : "mt-2"}`}>
                      {preset.name}
                    </p>
                    {preset.liveDemo && (
                      <a
                        href={preset.liveDemo}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          if (window.electronUpdater?.openExternal) {
                            e.preventDefault();
                            window.electronUpdater.openExternal(preset.liveDemo);
                          }
                        }}
                        className="mt-1 flex items-center justify-center gap-1 text-sm text-pink-600 hover:text-pink-700 hover:underline"
                      >
                        Live demo
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="max-w-xl space-y-4">
          {folderNameField()}
          {notesField()}
          {checkboxField(
            "receiveThemeUpdates",
            "forms.project.receiveThemeUpdatesLabel",
            "forms.project.receiveThemeUpdatesHelp",
          )}
        </div>
      </div>

      <div
        role="tabpanel"
        id="project-panel-site"
        aria-labelledby="project-tab-site"
        hidden={currentTab !== "site"}
        className="max-w-xl form-section"
      >
        {siteTitleField()}
        {siteUrlField()}
        {checkboxField("cleanUrls", "forms.project.cleanUrlsLabel", "forms.project.cleanUrlsHelp")}

        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          {defaultLanguageField()}
          {/* A project has to exist before content can be copied into a new
              language, so the list only appears once it does. */}
          {!isNew && (
            <LanguagesSection
              defaultLanguage={savedDefaultLanguage}
              languages={languages}
              onChange={setLanguages}
              // Adding a language locks the default on the SERVER, which still
              // holds the saved one: acting now would lock a value the form is
              // not showing and make the next Save fail.
              blocked={watch("defaultLanguage") !== savedDefaultLanguage}
              onBusyChange={setLanguageBusy}
            />
          )}
        </div>
      </div>

      <div
        role="tabpanel"
        id="project-panel-identity"
        aria-labelledby="project-tab-identity"
        hidden={currentTab !== "identity"}
        className="max-w-xl form-section"
      >
        <SiteIdentityFields section="readiness" {...identityProps} />
        <SiteIdentityFields section="identity" {...identityProps} />
      </div>

      <div
        role="tabpanel"
        id="project-panel-business"
        aria-labelledby="project-tab-business"
        hidden={currentTab !== "business"}
        className="max-w-xl form-section"
      >
        <SiteIdentityFields section="business" {...identityProps} />
      </div>

      {stickyBar}
    </form>
  );
}
