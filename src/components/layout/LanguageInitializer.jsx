import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getAppSettings } from "../../queries/appSettingsManager";

export default function LanguageInitializer() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const initLanguage = async () => {
      try {
        const settings = await getAppSettings();
        const language = settings.general?.language || "en";
        if (i18n.language !== language) {
          i18n.changeLanguage(language);
        }
      } catch (error) {
        console.error("Failed to initialize language:", error);
      }
    };

    initLanguage();
  }, [i18n]);

  return null;
}
