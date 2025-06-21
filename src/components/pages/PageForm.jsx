import { useState, useEffect, useRef } from "react";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";
import useProjectStore from "../../stores/projectStore";
import Button from "../ui/Button";
import MediaSelectorDrawer from "../media/MediaSelectorDrawer";
import { X, FolderOpen } from "lucide-react";
import { API_URL } from "../../config";

export default function PageForm({
  initialData = { name: "", slug: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
}) {
  // Initialize form data with SEO defaults
  const initializeFormData = (data) => ({
    name: data.name || "",
    slug: data.slug || "",
    seo: {
      description: data.seo?.description || "",
      og_title: data.seo?.og_title || "",
      og_image: data.seo?.og_image || "",
      og_type: data.seo?.og_type || "website",
      twitter_card: data.seo?.twitter_card || "summary",
      canonical_url: data.seo?.canonical_url || "",
      robots: data.seo?.robots || "index,follow",
    },
  });

  const [formData, setFormData] = useState(initializeFormData(initialData));
  const [mediaSelectorVisible, setMediaSelectorVisible] = useState(false);
  const isNew = !initialData.id;
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  // Use a ref to track if this is the first render
  const initialRender = useRef(true);

  // Store the previous initialData for comparison
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Reset form data when initialData changes (for example, after successful submission)
  useEffect(() => {
    // Skip the first render since we already set state from initialData
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    // Compare with previous initialData, not with current formData
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      setFormData(initializeFormData(initialData));
      prevInitialDataRef.current = currentInitialDataStr;
    }
  }, [initialData]);

  const formatSlug = (value) => {
    return slugify(value, {
      lower: true,
      strict: true,
      trim: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Page name is required", "error");
      return;
    }

    if (!formData.slug.trim()) {
      showToast("Filename is required", "error");
      return;
    }

    try {
      const result = await onSubmit({
        ...formData,
        slug: formatSlug(formData.slug),
      });

      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updates = { [name]: value };

      // Auto-generate slug only when creating new page and editing the name
      if (isNew && name === "name") {
        updates.slug = formatSlug(value);
      }

      return { ...prev, ...updates };
    });
  };

  const handleSeoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [name]: value,
      },
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === "slug") {
      setFormData((prev) => ({
        ...prev,
        slug: formatSlug(value),
      }));
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("image/")) {
      setFormData((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          og_image: selectedFile.path,
        },
      }));
      setMediaSelectorVisible(false);
    } else {
      showToast("Please select an image file.", "error");
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        og_image: "",
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {/* Main Page Data */}
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="slug" className="form-label">
            Filename
          </label>
          <div className="flex items-center">
            <span className="text-slate-500 mr-1">/</span>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              onBlur={handleBlur}
              className="form-input flex-1"
              required
            />
            <span className="text-slate-500 ml-1">.html</span>
          </div>
        </div>
      </div>

      {/* SEO Fields */}
      <div className="form-section">
        <h3 className="form-section-title">SEO Settings</h3>

        <div className="form-field">
          <label htmlFor="seo-description" className="form-label">
            Meta Description
          </label>
          <textarea
            id="seo-description"
            name="description"
            value={formData.seo.description}
            onChange={handleSeoChange}
            rows={3}
            className="form-textarea"
          />
          <p className="form-description">
            Used for search results and social media previews. Recommended: 150-160 characters.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-og-title" className="form-label-optional">
            Social Media Title
          </label>
          <input
            type="text"
            id="seo-og-title"
            name="og_title"
            value={formData.seo.og_title}
            onChange={handleSeoChange}
            className="form-input"
          />
          <p className="form-description">
            Leave blank to use the page title. Used when sharing on Facebook, Twitter, etc.
          </p>
        </div>

        <div className="form-field">
          <label className="form-label-optional">Social Media Image</label>
          {formData.seo.og_image ? (
            <div className="relative w-full max-w-md bg-slate-100 rounded-md overflow-hidden group">
              <img
                src={API_URL(`/api/media/projects/${activeProject?.id}${formData.seo.og_image}`)}
                alt="Social media preview"
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="icon" size="sm" onClick={() => setMediaSelectorVisible(true)} title="Change image">
                  <FolderOpen size={16} />
                </Button>
                <Button variant="icon" size="sm" onClick={handleRemoveImage} title="Remove image">
                  <X size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setMediaSelectorVisible(true)}
              className="w-full max-w-md h-32 bg-slate-50 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-colors"
            >
              <FolderOpen size={32} />
              <p className="mt-2 text-sm font-semibold">Click to select image</p>
              <p className="text-xs">Recommended: 1200x630 pixels</p>
            </div>
          )}
          <p className="form-description">Image for social media previews when sharing this page.</p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-canonical-url" className="form-label-optional">
            Canonical URL
          </label>
          <input
            type="url"
            id="seo-canonical-url"
            name="canonical_url"
            value={formData.seo.canonical_url}
            onChange={handleSeoChange}
            className="form-input"
          />
          <p className="form-description">
            Optional: Use if this page content exists at another URL to prevent duplicate content issues.
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="seo-robots" className="form-label">
            Search Engine Instructions
          </label>
          <select
            id="seo-robots"
            name="robots"
            value={formData.seo.robots}
            onChange={handleSeoChange}
            className="form-select"
          >
            <option value="index,follow">Index and Follow (Default)</option>
            <option value="noindex,follow">Don't Index, but Follow Links</option>
            <option value="index,nofollow">Index, but Don't Follow Links</option>
            <option value="noindex,nofollow">Don't Index or Follow Links</option>
          </select>
          <p className="form-description">Controls how search engines index this page and follow its links.</p>
        </div>
      </div>

      <div className="form-actions-separated">
        <Button type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
      </div>

      {mediaSelectorVisible && activeProject && (
        <MediaSelectorDrawer
          visible={mediaSelectorVisible}
          onClose={() => setMediaSelectorVisible(false)}
          onSelect={handleSelectMedia}
          activeProject={activeProject}
          filterType="image"
        />
      )}
    </form>
  );
}
