import { useTranslation } from "react-i18next";
import ImageInput from "./inputs/ImageInput";

/**
 * Shared SEO editor section: the same controls for page SEO and collection
 * item SEO, so item pages are authored exactly like pages. Bound
 * to a react-hook-form `seo` object via the passed-in register/setValue;
 * `ogImage` is the watched `seo.og_image` value for the media picker. Renders
 * the five user-edited fields (meta description, social title, social image,
 * canonical URL, robots); `og_type`/`twitter_card` are non-UI defaults carried
 * in the parent form's defaultValues.
 *
 * @param {object} props
 * @param {Function} props.register - react-hook-form register
 * @param {Function} props.setValue - react-hook-form setValue
 * @param {string} props.ogImage - current seo.og_image value (watched)
 */
export default function SeoFields({ register, setValue, ogImage }) {
  const { t } = useTranslation();

  return (
    <div className="form-section">
      <h3 className="form-section-title">{t("forms.page.seoTitle")}</h3>

      <div className="form-field">
        <label htmlFor="seo-description" className="form-label">
          {t("forms.page.metaDescription")}
        </label>
        <textarea id="seo-description" {...register("seo.description")} rows={3} className="form-textarea" />
        <p className="form-description">{t("forms.page.metaDescriptionHelp")}</p>
      </div>

      <div className="form-field">
        <label htmlFor="seo-og-title" className="form-label-optional">
          {t("forms.page.socialTitle")}
        </label>
        <input type="text" id="seo-og-title" {...register("seo.og_title")} className="form-input" />
        <p className="form-description">{t("forms.page.socialTitleHelp")}</p>
      </div>

      <div className="form-field">
        <label className="form-label-optional">{t("forms.page.socialImage")}</label>
        <ImageInput
          id="seo-og-image"
          value={ogImage}
          layout="row"
          framed
          onChange={(value) =>
            setValue("seo.og_image", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <p className="form-description">{t("forms.page.socialImageHelp")}</p>
      </div>

      <div className="form-field">
        <label htmlFor="seo-canonical-url" className="form-label-optional">
          {t("forms.page.canonicalUrl")}
        </label>
        <input type="url" id="seo-canonical-url" {...register("seo.canonical_url")} className="form-input" />
        <p className="form-description">{t("forms.page.canonicalUrlHelp")}</p>
      </div>

      <div className="form-field">
        <label htmlFor="seo-robots" className="form-label">
          {t("forms.page.robotsLabel")}
        </label>
        <select id="seo-robots" {...register("seo.robots")} className="form-select">
          <option value="index,follow">{t("forms.page.robots.indexFollow")}</option>
          <option value="noindex,follow">{t("forms.page.robots.noindexFollow")}</option>
          <option value="index,nofollow">{t("forms.page.robots.indexNofollow")}</option>
          <option value="noindex,nofollow">{t("forms.page.robots.noindexNofollow")}</option>
        </select>
        <p className="form-description">{t("forms.page.robotsHelp")}</p>
      </div>
    </div>
  );
}
