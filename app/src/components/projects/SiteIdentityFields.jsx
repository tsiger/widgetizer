import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { SITE_IDENTITY_CATEGORIES, PROFILE_NETWORKS, identityReadiness } from "@widgetizer/core/siteIdentity";
import { IconButton } from "@widgetizer/editor-ui/components/ui/Button.jsx";
import ImageInput from "@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx";
import { getThemeSettings } from "@widgetizer/editor-ui/queries/themeManager";
import LogoFileInput from "./LogoFileInput.jsx";
import OpeningHoursEditor from "./OpeningHoursEditor.jsx";
import { formToIdentity, identityErrorAt } from "./siteIdentityForm.js";

const GENERAL_CATEGORIES = ["organization", "person", "local-business"];

function faviconFrom(themeData) {
  for (const items of Object.values(themeData?.settings?.global || {})) {
    if (!Array.isArray(items)) continue;
    const favicon = items.find((item) => item?.id === "favicon");
    if (favicon) return favicon.value || favicon.default || "";
  }
  return "";
}

export default function SiteIdentityFields({
  section,
  register,
  watch,
  setValue,
  identityErrors,
  project,
  siteUrl,
  siteTitle,
  onGoTo,
  logoFile,
  onLogoFileChange,
}) {
  const { t } = useTranslation();
  const values = watch("siteIdentity");

  const errorFor = (path) => {
    const error = identityErrorAt(identityErrors, path);
    return error ? t(`forms.project.identity.errors.${error.code}`) : null;
  };

  const setIdentityValue = (name, value) => setValue(`siteIdentity.${name}`, value, { shouldDirty: true });

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

  if (section === "readiness") {
    return <Readiness values={values} logoFile={logoFile} siteUrl={siteUrl} siteTitle={siteTitle} onGoTo={onGoTo} />;
  }

  if (section === "business") {
    return (
      <>
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
      </>
    );
  }

  return (
    <IdentitySection
      values={values}
      register={register}
      setIdentityValue={setIdentityValue}
      textField={textField}
      errorFor={errorFor}
      identityErrors={identityErrors}
      project={project}
      siteTitle={siteTitle}
      logoFile={logoFile}
      onLogoFileChange={onLogoFileChange}
    />
  );
}

function Readiness({ values, logoFile, siteUrl, siteTitle, onGoTo }) {
  const { t } = useTranslation();
  const missing = identityReadiness(formToIdentity(values).value, { siteUrl, siteTitle }).filter(
    (entry) => !entry.ok && !(entry.item === "logo" && logoFile),
  );
  if (!missing.length) return null;

  return (
    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
      {t("forms.project.identity.readinessLabel")}{" "}
      {missing.map((entry, index) => (
        <span key={entry.item}>
          {index > 0 && ", "}
          <button
            type="button"
            onClick={() => onGoTo(entry.item)}
            className="font-medium text-pink-600 underline hover:text-pink-700"
          >
            {t(`forms.project.identity.readinessItems.${entry.item}`)}
          </button>
        </span>
      ))}
    </p>
  );
}

function IdentitySection({
  values,
  register,
  setIdentityValue,
  textField,
  errorFor,
  identityErrors,
  project,
  siteTitle,
  logoFile,
  onLogoFileChange,
}) {
  const { t } = useTranslation();
  const [fetchedSiteIcon, setFetchedSiteIcon] = useState({ projectId: null, path: "" });
  const [addedNetworks, setAddedNetworks] = useState([]);
  const projectId = project?.id;

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    getThemeSettings(projectId)
      .then((themeData) => {
        if (!cancelled) setFetchedSiteIcon({ projectId, path: faviconFrom(themeData) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const siteIcon = projectId && fetchedSiteIcon.projectId === projectId ? fetchedSiteIcon.path : "";

  const businessCategories = SITE_IDENTITY_CATEGORIES.filter((entry) => !GENERAL_CATEGORIES.includes(entry.id))
    .map((entry) => ({ id: entry.id, label: t(`forms.project.identity.categories.${entry.id}`) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const shownNetworks = PROFILE_NETWORKS.filter(
    (network) =>
      values?.profiles?.[network] ||
      addedNetworks.includes(network) ||
      identityErrorAt(identityErrors, `profiles.${network}`),
  );
  const addableNetworks = PROFILE_NETWORKS.filter((network) => !shownNetworks.includes(network));

  const addNetwork = (network) => {
    if (!network) return;
    setAddedNetworks((current) => [...current, network]);
    setTimeout(() => document.getElementById(`identity-${network}`)?.focus());
  };

  const removeNetwork = (network) => {
    setIdentityValue(`profiles.${network}`, "");
    setAddedNetworks((current) => current.filter((entry) => entry !== network));
  };

  return (
    <>
      <p className="form-description">{t("forms.project.identity.help")}</p>

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
        {projectId ? (
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
          <LogoFileInput file={logoFile} onChange={onLogoFileChange} />
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
      {shownNetworks.map((network) => (
        <div key={network} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {textField(`profiles.${network}`, `forms.project.identity.networks.${network}`, {
              type: "url",
              errorPath: `profiles.${network}`,
              placeholder: "https://",
            })}
          </div>
          <IconButton
            size="sm"
            className="mt-7"
            onClick={() => removeNetwork(network)}
            title={t("forms.project.identity.removeProfile")}
            aria-label={`${t("forms.project.identity.removeProfile")} ${t(`forms.project.identity.networks.${network}`)}`}
          >
            <X size={16} />
          </IconButton>
        </div>
      ))}
      {addableNetworks.length > 0 && (
        <select
          aria-label={t("forms.project.identity.addProfile")}
          value=""
          onChange={(event) => addNetwork(event.target.value)}
          className="form-select w-60"
        >
          <option value="">{t("forms.project.identity.addProfile")}</option>
          {addableNetworks.map((network) => (
            <option key={network} value={network}>
              {t(`forms.project.identity.networks.${network}`)}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
