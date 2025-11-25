import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProjectStore from "../../stores/projectStore";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import { Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";

function RequireActiveProject() {
  const { t } = useTranslation();
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);

  if (loading) {
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
