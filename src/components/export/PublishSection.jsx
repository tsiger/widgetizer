import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "../ui/Button";
import { publishProjectAPI, getPublishStatusAPI } from "../../queries/publishManager";
import useToastStore from "../../stores/toastStore";
import { Loader2, ExternalLink, Globe, Rocket, ArrowUpCircle } from "lucide-react";
import { PUBLISHER_URL } from "../../config";

/**
 * Publish section shown at the top of the Export page in hosted mode.
 * Allows users to publish/republish their project to the Publisher platform.
 */
export default function PublishSection({ activeProject }) {
  const { t } = useTranslation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const showToast = useToastStore((state) => state.showToast);

  // Fetch publish status on mount and when project changes
  useEffect(() => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const status = await getPublishStatusAPI(activeProject.id);
        if (!cancelled) {
          setPublishStatus(status);
        }
      } catch (err) {
        if (!cancelled) {
          // Don't show error if the publish endpoint isn't available (open-source)
          console.warn("Could not fetch publish status:", err.message);
          setPublishStatus(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  const handlePublish = async () => {
    if (!activeProject?.id) return;

    setIsPublishing(true);
    setError(null);

    try {
      const result = await publishProjectAPI(activeProject.id);
      if (result.success) {
        showToast(t("publishSite.publishSuccess"), "success");
        setPublishStatus({
          published: true,
          siteId: result.siteId,
          url: result.url,
          publishedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Publish failed:", err);
      if (err.status === 403) {
        setError({ type: "upgrade", message: err.message });
      } else {
        setError({ type: "generic", message: err.message });
        showToast(t("publishSite.publishError", { message: err.message }), "error");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isPublished = publishStatus?.published;

  return (
    <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-medium text-slate-900">{t("publishSite.title")}</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("common.loading", "Loading...")}</span>
        </div>
      ) : (
        <>
          {isPublished && publishStatus.url && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-sm">
              <p className="text-sm text-green-800 font-medium mb-1">{t("publishSite.live")}</p>
              <a
                href={publishStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-mono"
              >
                {publishStatus.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              {publishStatus.publishedAt && (
                <p className="text-xs text-green-600 mt-1">
                  {t("publishSite.lastPublished", { date: formatDate(publishStatus.publishedAt) })}
                </p>
              )}
            </div>
          )}

          {!isPublished && (
            <p className="text-slate-600 mb-4">{t("publishSite.description")}</p>
          )}

          {error?.type === "upgrade" && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-sm">
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{error.message}</p>
                  {PUBLISHER_URL && (
                    <a
                      href={`${PUBLISHER_URL}/pricing`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                    >
                      View plans & upgrade
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {error?.type === "generic" && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          <Button
            onClick={handlePublish}
            disabled={isPublishing || !activeProject}
            variant="primary"
            icon={isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          >
            {isPublishing
              ? t("publishSite.publishing")
              : isPublished
                ? t("publishSite.republishButton")
                : t("publishSite.publishButton")}
          </Button>
        </>
      )}
    </div>
  );
}
