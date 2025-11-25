import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import el from "./locales/el.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import de from "./locales/de.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    de: { translation: de },
    el: { translation: el },
  },
  lng: "en", // Default language, will be updated by LanguageInitializer
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
