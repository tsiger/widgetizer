import { createContext, useContext } from "react";
import { useDefaultLanguage } from "../stores/projectStore";

const EditingLanguageContext = createContext(null);

/**
 * The language of the content currently being edited — a page, a collection item,
 * a menu. Pickers are nested deep inside their forms and have no other way to know
 * it, and reading it from a store would be wrong the moment two kinds of content
 * share one input.
 */
export function EditingLanguageProvider({ language, children }) {
  return <EditingLanguageContext.Provider value={language || null}>{children}</EditingLanguageContext.Provider>;
}

export function useEditingLanguage() {
  const provided = useContext(EditingLanguageContext);
  const defaultLanguage = useDefaultLanguage();
  return provided || defaultLanguage;
}
