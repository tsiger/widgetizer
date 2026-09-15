import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SITE_IDENTITY_CATEGORIES,
  PROFILE_NETWORKS,
  identityKind,
  identityReadiness,
} from "@widgetizer/core/siteIdentity";
import ImageInput from "@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import { getThemeSettings } from "@widgetizer/editor-ui/queries/themeManager";
import OpeningHoursEditor from "./OpeningHoursEditor.jsx";
import { formToIdentity, identityErrorAt } from "./siteIdentityForm.js";

const GENERAL_CATEGORIES = ["organization", "person", "local-business"];
const BUSINESS_ERROR_PATHS = ["telephone", "priceRange", "locations"];

const READINESS_TARGETS = {
  name: "identity-publicName",
  logo: "identity-logo",
  address: "identity-streetAddress",
};

function faviconFrom(themeData) {
  for (const items of Object.values(themeData?.settings?.global || {})) {
    if (!Array.isArray(items)) continue;
    const favicon = items.find((item) => item?.id === "favicon");
    if (favicon) return favicon.value || favicon.default || "";
  }
  return "";
}

export default function SiteIdentityFields({ register, watch, setValue, identityErrors, project, siteUrl, siteTitle, onGoToSiteUrl }) {
  const { t } = useTranslation();
  const values = watch("siteIdentity");
  const [fetchedSiteIcon, setFetchedSiteIcon] = useState({ projectId: null, path: "" });

  // Media and theme requests are scoped to the active project on the server, so
  // the logo can only be picked while the edited project is the active one.
  const activeProjectId = useProjectStore((state) => state.activeProject?.id);
  const isActiveProject = !!project?.id && activeProjectId === project.id;

  useEffect(() => {
    if (!isActiveProject) return undefined;
    let cancelled = false;
    getThemeSettings(project.id)
      .then((themeData) => {
        if (!cancelled) setFetchedSiteIcon({ projectId: project.id, path: faviconFrom(themeData) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [project?.id, isActiveProject]);

  const siteIcon = isActiveProject && fetchedSiteIcon.projectId === project.id ? fetchedSiteIcon.path : "";

  const kind = identityKind({ category: values?.category });
  const readiness = identityReadiness(formToIdentity(values).value, { siteUrl, siteTitle });
  const showBusiness =
    kind === "localBusiness" || BUSINESS_ERROR_PATHS.some((path) => identityErrorAt(identityErrors, path));

  const errorFor = (path) => {
    const error = identityErrorAt(identityErrors, path);
    return error ? t(`forms.project.identity.errors.${error.code}`) : null;
  };

  const setIdentityValue = (name, value) => setValue(`siteIdentity.${name}`, value, { shouldDirty: true });

  const goTo = (item) => {
    if (item === "siteUrl") {
      onGoToSiteUrl();
      return;
    }
    const target = document.getElementById(READINESS_TARGETS[item]);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus?.();
  };

  const businessCategories = SITE_IDENTITY_CATEGORIES.filter((entry) => !GENERAL_CATEGORIES.includes(entry.id))
    .map((entry) => ({ id: entry.id, label: t(`forms.project.identity.categories.${entry.id}`) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const textField = (name, labelKey, { helpKey, type = "text", errorPath, placeholder, maxLength } = {}) => {
    const id = `identity-${name.split(".").pop()}`;
    const error = errorFor(errorPath);
    return (
      <div className="form-field">
        <label htmlFor={id} className="form-label-optional">
          {t(labelKey)}
        </label>
        <input
          type={type}
          id={id}
          {...register(`siteIdentity.${name}`)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`form-input${error ? " form-input-error" : ""}`}
        />
        {error && <p className="form-error">{error}</p>}
        {helpKey && <p className="form-description">{t(helpKey)}</p>}
      </div>
    );
  };

  const allReady = readiness.every((entry) => entry.ok);

  return (
    <>
      <div className="max-w-xl form-section">
        <h3 className="form-section-title">{t("forms.project.identity.title")}</h3>
        <p className="form-description">{t("forms.project.identity.help")}</p>

        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
          {allReady ? (
            t("forms.project.identity.readinessAllReady")
          ) : (
            <>
              {t("forms.project.identity.readinessLabel")}{" "}
              {readiness.map((entry, index) => (
                <span key={entry.item}>
                  {index > 0 && ", "}
                  {entry.ok ? (
                    `${t(`forms.project.identity.readinessItems.${entry.item}`)} ✓`
                  ) : (
                    <button
                      type="button"
                      onClick={() => goTo(entry.item)}
                      className="font-medium text-pink-600 underline hover:text-pink-700"
                    >
                      {t(`forms.project.identity.readinessItems.${entry.item}`)} {t("forms.project.identity.readinessMissing")}
                    </button>
                  )}
                </span>
              ))}
            </>
          )}
        </p>

        <div className="form-field">
          <label htmlFor="identity-category" className="form-label-optional">
            {t("forms.project.identity.categoryLabel")}
          </label>
          <select id="identity-category" {...register("siteIdentity.category")} className="form-select">
            <option value="">{t("forms.project.identity.categoryNone")}</option>
            <optgroup label={t("forms.project.identity.categoryGroups.general")}>
              {GENERAL_CATEGORIES.map((id) => (
                <option key={id} value={id}>
                  {t(`forms.project.identity.categories.${id}`)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("forms.project.identity.categoryGroups.business")}>
              {businessCategories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </optgroup>
          </select>
          {errorFor("category") && <p className="form-error">{errorFor("category")}</p>}
          <p className="form-description">{t("forms.project.identity.categoryHelp")}</p>
        </div>

        {textField("publicName", "forms.project.identity.publicNameLabel", {
          helpKey: "forms.project.identity.publicNameHelp",
          errorPath: "text.publicName",
          placeholder: siteTitle,
        })}

        <div className="form-field" id="identity-logo" tabIndex={-1}>
          <label className="form-label-optional">{t("forms.project.identity.logoLabel")}</label>
          {isActiveProject ? (
            <>
              <ImageInput
                id="identity-logo-input"
                value={values?.logo || ""}
                onChange={(value) => setIdentityValue("logo", value)}
                size="narrow"
              />
              {!values?.logo && siteIcon && (
                <button
                  type="button"
                  onClick={() => setIdentityValue("logo", siteIcon)}
                  className="text-sm text-pink-500 hover:text-pink-700"
                >
                  {t("forms.project.identity.useSiteIcon")}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-1 text-sm text-slate-600">
              {values?.logo && (
                <p className="flex flex-wrap items-center gap-2">
                  <span>{t("forms.project.identity.logoCurrent", { file: values.logo.split("/").pop() })}</span>
                  <button
                    type="button"
                    onClick={() => setIdentityValue("logo", "")}
                    className="text-pink-500 hover:text-pink-700"
                  >
                    {t("forms.project.identity.removeLogo")}
                  </button>
                </p>
              )}
              <p>{t("forms.project.identity.logoNeedsActive")}</p>
            </div>
          )}
          {errorFor("logo") && <p className="form-error">{errorFor("logo")}</p>}
          <p className="form-description">{t("forms.project.identity.logoHelp")}</p>
        </div>

        {textField("email", "forms.project.identity.emailLabel", { type: "email", errorPath: "email" })}

        <div className="form-field">
          <label htmlFor="identity-description" className="form-label-optional">
            {t("forms.project.identity.descriptionLabel")}
          </label>
          <textarea
            id="identity-description"
            rows={3}
            {...register("siteIdentity.description")}
            className={`form-textarea${errorFor("text.description") ? " form-textarea-error" : ""}`}
          />
          {errorFor("text.description") && <p className="form-error">{errorFor("text.description")}</p>}
          <p className="form-description">{t("forms.project.identity.descriptionHelp")}</p>
        </div>

        <h4 className="form-section-subtitle pt-2">{t("forms.project.identity.profilesTitle")}</h4>
        <p className="form-description">{t("forms.project.identity.profilesHelp")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROFILE_NETWORKS.map((network) => (
            <div key={network}>
              {textField(`profiles.${network}`, `forms.project.identity.networks.${network}`, {
                type: "url",
                errorPath: `profiles.${network}`,
                placeholder: "https://",
              })}
            </div>
          ))}
        </div>
      </div>

      {showBusiness && (
        <div className="max-w-xl form-section">
          <h3 className="form-section-title">{t("forms.project.business.title")}</h3>
          <p className="form-description">{t("forms.project.business.help")}</p>

          {textField("telephone", "forms.project.business.telephoneLabel", { type: "tel", errorPath: "telephone" })}
          {textField("priceRange", "forms.project.business.priceRangeLabel", {
            helpKey: "forms.project.business.priceRangeHelp",
            errorPath: "priceRange",
          })}
          {textField("location.label", "forms.project.business.locationLabelLabel", {
            helpKey: "forms.project.business.locationLabelHelp",
            errorPath: "locations.0.text.label",
          })}
          {textField("location.streetAddress", "forms.project.business.streetLabel", {
            errorPath: "locations.0.streetAddress",
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("location.addressLocality", "forms.project.business.localityLabel", {
              errorPath: "locations.0.addressLocality",
            })}
            {textField("location.addressRegion", "forms.project.business.regionLabel", {
              errorPath: "locations.0.addressRegion",
            })}
            {textField("location.postalCode", "forms.project.business.postalCodeLabel", {
              errorPath: "locations.0.postalCode",
            })}
            {textField("location.addressCountry", "forms.project.business.countryLabel", {
              helpKey: "forms.project.business.countryHelp",
              errorPath: "locations.0.addressCountry",
              maxLength: 2,
            })}
          </div>

          <h4 className="form-section-subtitle pt-2">{t("forms.project.business.hoursTitle")}</h4>
          <p className="form-description">{t("forms.project.business.hoursHelp")}</p>
          <OpeningHoursEditor
            value={values?.hours}
            onChange={(hours) => setIdentityValue("hours", hours)}
            errorFor={errorFor}
          />
        </div>
      )}
    </>
  );
}
