import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { editorFetchJson } from "@widgetizer/editor-ui/lib/apiFetch";
import { invalidateProjectsListCache } from "@widgetizer/editor-ui/queries/projectManager";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";
import ConfirmationModal from "@widgetizer/editor-ui/components/ui/ConfirmationModal.jsx";
import useConfirmationModal from "@widgetizer/editor-ui/hooks/useConfirmationModal";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";
import { SUPPORTED_LANGUAGES, nativeLanguageName } from "@widgetizer/core/languages";

/**
 * The site's languages.
 *
 * Adding and removing are immediate actions, not form fields: each one copies or
 * deletes content on the server, so they cannot wait for Save and cannot be
 * undone by Cancel. The default language IS a form field, owned by the form
 * above, and is passed in only so this section can show which one it is — and
 * `blocked` while an unsaved change to it would make the server's answer differ
 * from what the form shows. `onBusyChange` reports the reverse case: while a
 * request is in flight the form must hold the default still, or a change made
 * in the meantime would be locked in by the response.
 */
export default function LanguagesSection({
  defaultLanguage,
  languages,
  onChange,
  blocked = false,
  onBusyChange,
}) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const nameOf = (code) => nativeLanguageName(code) || code;

  // The project row just changed on the server: the projects list caches it for
  // half a minute, and the store's copy drives `isMultilang` everywhere else.
  const recordProject = (project) => {
    invalidateProjectsListCache();
    const active = useProjectStore.getState().activeProject;
    if (project?.id && active?.id === project.id) setActiveProject(project);
    onChange(project?.languages || []);
  };

  const available = SUPPORTED_LANGUAGES.filter(
    ({ code }) => code !== defaultLanguage && !languages.includes(code),
  );

  const { modalState, openModal, closeModal, handleConfirm } = useConfirmationModal(async ({ code }) => {
    setBusy(true);
    try {
      const updated = await editorFetchJson(
        `/languages/${code}`,
        { method: "DELETE" },
        { fallbackMessage: t("forms.project.languages.removeError") },
      );
      recordProject(updated);
      showToast(t("forms.project.languages.removeSuccess", { name: nameOf(code) }), "success");
    } catch (error) {
      showToast(error.message || t("forms.project.languages.removeError"), "error");
    } finally {
      setBusy(false);
    }
  });

  const addLanguage = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const updated = await editorFetchJson(
        "/languages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: pending }),
        },
        { fallbackMessage: t("forms.project.languages.addError") },
      );
      recordProject(updated);
      setPending("");
      showToast(t("forms.project.languages.addSuccess", { name: nameOf(pending) }), "success");
    } catch (error) {
      showToast(error.message || t("forms.project.languages.addError"), "error");
    } finally {
      setBusy(false);
    }
  };

  // What the language holds is read before asking, so the confirmation can say
  // exactly what is about to be deleted rather than warning in the abstract.
  const confirmRemove = async (code, trigger) => {
    setBusy(true);
    try {
      const counts = await editorFetchJson(
        `/languages/${code}/summary`,
        {},
        { fallbackMessage: t("forms.project.languages.summaryError") },
      );
      const name = nameOf(code);
      const parts = [
        t("forms.project.languages.removePages", { count: counts.pages }),
        t("forms.project.languages.removeItems", { count: counts.items }),
        t("forms.project.languages.removeMenus", { count: counts.menus }),
        t("forms.project.languages.removeGlobals"),
      ];
      openModal({
        title: t("forms.project.languages.removeTitle", { name }),
        message: [
          `${t("forms.project.languages.removeIntro", { name })} ${parts.join(", ")}.`,
          t("forms.project.languages.removeShared"),
          t("forms.project.languages.removeUndone"),
        ].join(" "),
        confirmText: t("forms.project.languages.removeConfirm"),
        cancelText: t("forms.common.cancel"),
        variant: "danger",
        data: { code },
        returnFocusTo: trigger,
      });
    } catch (error) {
      showToast(error.message || t("forms.project.languages.summaryError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-field mt-6">
      <span className="form-label">{t("forms.project.languages.listLabel")}</span>

      {languages.length === 0 ? (
        <p className="form-description mb-3">
          {t("forms.project.languages.none", { name: nameOf(defaultLanguage) })}
        </p>
      ) : (
        <ul className="mb-3 divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {languages.map((code) => (
            <li key={code} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {nameOf(code)} <span className="text-gray-400">({code})</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || blocked}
                onClick={(event) => confirmRemove(code, event.currentTarget)}
                aria-label={`${t("forms.project.languages.remove")} ${nameOf(code)}`}
              >
                <Trash2 className="h-4 w-4" />
                {t("forms.project.languages.remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="addLanguage" className="form-label-optional">
            {t("forms.project.languages.addLabel")}
          </label>
          <select
            id="addLanguage"
            className="form-select"
            value={pending}
            disabled={busy || blocked || available.length === 0}
            onChange={(event) => setPending(event.target.value)}
          >
            <option value="">{t("forms.project.languages.addPlaceholder")}</option>
            {available.map(({ code }) => (
              <option key={code} value={code}>
                {nativeLanguageName(code)} ({code})
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="primary" onClick={addLanguage} disabled={busy || blocked || !pending}>
          <Plus className="h-4 w-4" />
          {busy ? t("forms.project.languages.adding") : t("forms.project.languages.addButton")}
        </Button>
      </div>

      {blocked && (
        <p className="form-description text-pink-600 dark:text-pink-400">
          {t("forms.project.languages.saveDefaultFirst")}
        </p>
      )}
      <p className="form-description">{t("forms.project.languages.immediateNote")}</p>

      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        variant={modalState.variant}
        returnFocusTo={modalState.returnFocusTo}
      />
    </div>
  );
}
