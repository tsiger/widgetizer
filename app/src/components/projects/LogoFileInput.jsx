import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "@widgetizer/editor-ui/components/ui/Button.jsx";
import useAppSettings from "@widgetizer/editor-ui/hooks/useAppSettings";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";
import { showRejectedFiles } from "@widgetizer/editor-ui/utils/uploadFeedback";
import {
  IMAGE_ACCEPT,
  IMAGE_MIME_TYPES,
  createRejectedFile,
  validateFileSizes,
} from "@widgetizer/editor-ui/utils/uploadValidation";

export default function LogoFileInput({ file, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const showToast = useToastStore((state) => state.showToast);
  const { settings } = useAppSettings();
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleFileChange = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;

    if (!IMAGE_MIME_TYPES.includes(picked.type)) {
      showRejectedFiles(showToast, [createRejectedFile(picked.name, t("forms.project.identity.logoInvalidType"))]);
      return;
    }
    const { rejected } = validateFileSizes([picked], { maxSizeMB: settings?.media?.maxFileSizeMB ?? 50 });
    if (rejected.length) {
      showRejectedFiles(showToast, rejected);
      return;
    }
    onChange(picked);
  };

  return (
    <div className="space-y-2">
      {previewUrl && (
        <div className="flex h-32 max-w-56 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2">
          <img src={previewUrl} alt={file.name} className="max-h-full max-w-full object-contain" />
        </div>
      )}
      <input
        ref={inputRef}
        id="identity-logo-file"
        type="file"
        accept={Object.values(IMAGE_ACCEPT).flat().join(",")}
        onChange={handleFileChange}
        className="hidden"
        aria-label={t("forms.project.identity.logoChoose")}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          {t(file ? "forms.project.identity.logoChange" : "forms.project.identity.logoChoose")}
        </Button>
        {file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t("forms.project.identity.removeLogo")}
          </Button>
        )}
      </div>    </div>
  );
}
