import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import PageLayout from "../components/layout/PageLayout";
import { LoadingSpinner, Card } from "../components/ui";

import { getAllProjects } from "../queries/projectManager";
import useProjectStore from "../stores/projectStore";

export default function Dashboard() {
  const { t } = useTranslation();
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get active project from the store
  const activeProject = useProjectStore((state) => state.activeProject);
  const storeLoading = useProjectStore((state) => state.loading);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const projects = await getAllProjects();
      setProjectCount(projects.length);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state if either projects or store is loading
  if (loading || storeLoading) {
    return (
      <PageLayout title={t("dashboard.title")}>
        <LoadingSpinner message={t("dashboard.loading")} />
      </PageLayout>
    );
  }

  // First-time user experience when no projects exist
  const isFirstTimeUser = projectCount === 0;

  return (
    <PageLayout title={t("dashboard.title")}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="feature">
          <p className="text-lg font-semibold mb-4 text-gray-500">{t("dashboard.projectCount")}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{projectCount}</h2>
          <p className="text-gray-600">{isFirstTimeUser ? t("dashboard.readyToCreate") : t("dashboard.projects")}</p>
        </Card>

        <Card variant="feature">
          <p className="text-lg font-semibold mb-4 text-gray-500">
            {isFirstTimeUser ? t("dashboard.getStarted") : t("dashboard.activeProject")}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isFirstTimeUser
              ? t("dashboard.createFirstProject")
              : activeProject?.name || t("dashboard.noActiveProject")}
          </h2>
          {isFirstTimeUser ? (
            <Link
              to="/projects/add"
              className="inline-flex items-center px-4 py-2 mt-3 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              {t("dashboard.createProjectBtn")}
            </Link>
          ) : activeProject ? (
            <Link to="/pages" className="text-pink-600 hover:text-pink-700 font-medium">
              {t("dashboard.letsGetAtIt")}
            </Link>
          ) : (
            <Link to="/projects/add" className="text-pink-600 hover:text-pink-700 font-medium">
              {t("dashboard.createProjectLink")}
            </Link>
          )}
        </Card>

        <Card variant="featureReverse" className="">
          <p className="text-lg font-semibold mb-4 text-gray-400">{t("dashboard.magic")}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">{t("dashboard.generateSite")}</h2>
          <p className="text-gray-400">{t("dashboard.todoDescription")}</p>
        </Card>
      </div>
    </PageLayout>
  );
}
