import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import PageLayout from "../components/layout/PageLayout";
import LoadingSpinner from "../components/ui/LoadingSpinner";

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

  return (
    <PageLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-sm border border-slate-200">
          <p className="text-xs uppercase font-semibold mb-4">Number of projects</p>
          <h2 className="text-2xl font-semibold tracking-tight">{projectCount}</h2>
          <p>Projects</p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-slate-200">
          <p className="text-xs uppercase font-semibold mb-4">Active project</p>
          <h2 className="text-2xl font-semibold tracking-tight">{activeProject?.name || "No active project"}</h2>
          {activeProject && (
            <Link to="/pages" className="text-pink-600 hover:underline">
              Let's get at it!
            </Link>
          )}
        </div>
        <div className="p-4 rounded-sm bg-slate-900 text-white">
          <p className="text-xs uppercase font-semibold mb-4">It's magic!</p>
          <h2 className="text-2xl font-semibold tracking-tight">Generate a site</h2>
          <p className="text-slate-400">TODO: Description</p>
        </div>
      </div>
    </PageLayout>
  );
}
