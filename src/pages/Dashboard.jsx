import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import PageLayout from "../components/layout/PageLayout";
import { LoadingSpinner, Card } from "../components/ui";

import { getAllProjects } from "../utils/projectManager";
import useProjectStore from "../stores/projectStore";

export default function Dashboard() {
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
      <PageLayout title="Dashboard">
        <LoadingSpinner message="Loading dashboard data..." />
      </PageLayout>
    );
  }

  // First-time user experience when no projects exist
  const isFirstTimeUser = projectCount === 0;

  return (
    <PageLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="feature">
          <p className="text-xs uppercase font-semibold mb-4 text-gray-500">Number of projects</p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{projectCount}</h2>
          <p className="text-gray-600">{isFirstTimeUser ? "Ready to create your first project!" : "Projects"}</p>
        </Card>

        <Card variant="feature">
          <p className="text-xs uppercase font-semibold mb-4 text-gray-500">
            {isFirstTimeUser ? "Get started" : "Active project"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isFirstTimeUser ? "Create your first project" : activeProject?.name || "No active project"}
          </h2>
          {isFirstTimeUser ? (
            <Link
              to="/projects/add"
              className="inline-flex items-center px-4 py-2 mt-3 text-sm font-medium text-white bg-pink-600 border border-transparent rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              Create Project →
            </Link>
          ) : activeProject ? (
            <Link to="/pages" className="text-pink-600 hover:text-pink-700 font-medium">
              Let's get at it! →
            </Link>
          ) : (
            <Link to="/projects/add" className="text-pink-600 hover:text-pink-700 font-medium">
              Create a project →
            </Link>
          )}
        </Card>

        <Card variant="featureReverse" className="">
          <p className="text-xs uppercase font-semibold mb-4 text-gray-400">It's magic!</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Generate a site</h2>
          <p className="text-gray-400">TODO: Description</p>
        </Card>
      </div>
    </PageLayout>
  );
}
