import PageLayout from "../components/layout/PageLayout";
import { UploadCloud, ScrollText } from "lucide-react";

// TODO: Implement generation logic
const handleGenerateClick = () => {
  console.log("Generate Site button clicked");
};

export default function GenerateSite() {
  // Define button props for the PageLayout header
  const buttonProps = {
    children: "Generate Site",
    onClick: handleGenerateClick,
    // We can add an icon later if needed, e.g.:
    // icon: <Sparkles className="h-4 w-4" />
  };

  return (
    <PageLayout
      title="Generate site"
      description="Create a new site by uploading assets or describing your vision."
      buttonProps={buttonProps}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center mb-3">
            <ScrollText className="h-6 w-6 text-slate-500 mr-2" />
            <h3 className="text-lg font-medium text-slate-700">Describe Your Site</h3>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Tell us about the site you envision. What is its purpose? What style are you looking for? Mention any key
            features or content.
          </p>
          <textarea
            className="w-full p-3 border border-slate-300 rounded-md focus:ring focus:border-indigo-500 transition duration-150 ease-in-out text-sm"
            rows="8"
            placeholder="e.g., 'A modern portfolio site for a photographer, minimalist style, with a gallery and contact form...'"
          ></textarea>
          <p className="mt-2 text-xs text-slate-400">(Feature coming soon)</p>
        </div>

        <div className="p-6 border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg hover:border-slate-400 transition-colors duration-200 flex flex-col text-center">
          <div className="flex-grow flex flex-col justify-center items-center cursor-pointer">
            <UploadCloud className="h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-700">Upload Assets</h3>
            <p className="mt-1 text-sm text-slate-500">
              Drag & drop your logo, brand colors, fonts, or other relevant files here.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
