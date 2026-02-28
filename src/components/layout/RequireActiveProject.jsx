import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import useAppInfoStore from "../../stores/appInfoStore";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";

function RequireActiveProject() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);
  const hostedMode = useAppInfoStore((state) => state.hostedMode);
  const dashboardUrl = useAppInfoStore((state) => state.dashboardUrl);
  const appInfoLoaded = useAppInfoStore((state) => state.loaded);

  // In hosted mode, redirect to dashboard if there's no active project.
  // The editor is only reachable via dashboard deep-link.
  useEffect(() => {
    if (appInfoLoaded && !loading && !activeProject && hostedMode && dashboardUrl) {
      window.location.href = dashboardUrl;
    }
  }, [appInfoLoaded, loading, activeProject, hostedMode, dashboardUrl]);

  if (loading || !appInfoLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Hosted mode: redirect is in-flight, show nothing
  if (!activeProject && hostedMode) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <EmptyState
        icon={<Rocket />}
        title={t("layout.requireProject.title")}
        description={t("layout.requireProject.description")}
      >
        <Button asChild>
          <Link to="/projects">{t("layout.requireProject.goToProjects")}</Link>
        </Button>
      </EmptyState>
    );
  }

  return <Outlet />;
}

export default RequireActiveProject;
