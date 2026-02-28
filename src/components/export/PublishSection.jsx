import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { publishProject, getPublishStatus } from "../../queries/publishManager";
import useToastStore from "../../stores/toastStore";
import { Loader2, ExternalLink } from "lucide-react";

export default function PublishSection({ activeProject }) {
  const { t } = useTranslation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    if (!activeProject?.id) return;
    getPublishStatus(activeProject.id)
      .then(setPublishStatus)
      .catch(() => {});
  }, [activeProject?.id]);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handlePublish = async () => {
    if (!activeProject?.id) return;

    setIsPublishing(true);
    try {
      const result = await publishProject(activeProject.id);
      showToast(t("publishSite.publishSuccess"), "success");
      setPublishStatus({
        published: true,
        siteId: result.siteId,
        url: result.url,
        publishedAt: new Date().toISOString(),
      });
    } catch (err) {
      showToast(t("publishSite.publishError", { message: err.message }), "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const isPublished = publishStatus?.published;

  return (
    <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900 mb-4">{t("publishSite.title")}</h2>
      <p className="text-slate-600 mb-4">{t("publishSite.description")}</p>

      <Button
        onClick={handlePublish}
        disabled={isPublishing || !activeProject}
        variant="primary"
        icon={isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      >
        {isPublishing
          ? t("publishSite.publishing")
          : isPublished
            ? t("publishSite.republishButton")
            : t("publishSite.publishButton")}
      </Button>

      {isPublished && publishStatus.url && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-sm">
          <p className="text-sm font-medium text-green-800">{t("publishSite.live")}</p>
          <a
            href={publishStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-sm text-green-700 underline"
          >
            {publishStatus.url}
            <ExternalLink className="h-3 w-3" />
          </a>
          {publishStatus.publishedAt && (
            <p className="mt-1 text-sm text-green-700">
              {t("publishSite.lastPublished", { date: formatDate(publishStatus.publishedAt) })}
            </p>
          )}
        </div>
      )}

      {!isPublished && !isPublishing && (
        <p className="mt-3 text-sm text-slate-500">{t("publishSite.notPublished")}</p>
      )}
    </div>
  );
}
