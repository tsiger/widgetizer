import { Puzzle } from "lucide-react";

import PageLayout from "../components/layout/PageLayout";

export default function Plugins() {
  return (
    <PageLayout title="Plugins">
      <div className="p-8 text-center">
        <Puzzle className="mx-auto mb-4 text-slate-400" size={48} />
        <h2 className="text-xl font-semibold mb-2">No plugins installed</h2>
        <p className="text-slate-600 mb-4">
          Get started by installing your first plugin from the store or uploading a custom plugin.
        </p>
      </div>
    </PageLayout>
  );
}
