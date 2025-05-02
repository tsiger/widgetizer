import { Link } from "react-router-dom";
import useProjectStore from "../../stores/projectStore";

export default function Footer() {
  const activeProject = useProjectStore((state) => state.activeProject);
  const loading = useProjectStore((state) => state.loading);

  return (
    <footer className="bg-white px-4 py-2 flex justify-between items-center text-xs border-t border-slate-200 rounded-bl-lg rounded-br-lg">
      <p>
        Active project:{" "}
        {loading ? (
          "Loading..."
        ) : activeProject ? (
          <Link to="/projects" className="text-pink-600">
            <strong id="active-project-title">{activeProject.name}</strong>
          </Link>
        ) : (
          <Link to="/projects" className="text-pink-600">
            <strong>No active project</strong>
          </Link>
        )}
      </p>
      <p>
        Thank you for creating with <strong>Widgetizer 0.1</strong>
      </p>
    </footer>
  );
}
