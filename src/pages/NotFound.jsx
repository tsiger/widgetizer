import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h2>
        <p className="mt-2 text-slate-600">The page you are looking for does not exist.</p>
        <Link to="/" className="inline-block mt-6">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
