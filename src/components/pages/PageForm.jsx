import { useState, useEffect, useRef } from "react";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";
import Button from "../ui/Button";

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
      twitter_card: data.seo?.twitter_card || "summary_large_image",
      canonical_url: data.seo?.canonical_url || "",
      robots: data.seo?.robots || "index,follow",
    },
  });

  const [formData, setFormData] = useState(initializeFormData(initialData));
  const isNew = !initialData.id;
  const showToast = useToastStore((state) => state.showToast);

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

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Main Page Data */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
            placeholder="Enter page title"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block font-medium mb-1">
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
              className="flex-1 px-3 py-2 border border-slate-300 rounded-sm"
              placeholder="filename"
              required
            />
            <span className="text-slate-500 ml-1">.html</span>
          </div>
        </div>
      </div>

      {/* SEO Fields */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-lg font-medium text-slate-800">SEO Settings</h3>

        <div>
          <label htmlFor="seo-description" className="block font-medium mb-1">
            Meta Description
          </label>
          <textarea
            id="seo-description"
            name="description"
            value={formData.seo.description}
            onChange={handleSeoChange}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
            placeholder="Brief description of this page for search engines and social media"
          />
          <p className="text-sm text-slate-500 mt-1">
            Used for search results and social media previews. Recommended: 150-160 characters.
          </p>
        </div>

        <div>
          <label htmlFor="seo-og-title" className="block font-medium mb-1">
            Social Media Title
          </label>
          <input
            type="text"
            id="seo-og-title"
            name="og_title"
            value={formData.seo.og_title}
            onChange={handleSeoChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
            placeholder="Optional: Custom title for social media sharing"
          />
          <p className="text-sm text-slate-500 mt-1">
            Leave blank to use the page title. Used when sharing on Facebook, Twitter, etc.
          </p>
        </div>

        <div>
          <label htmlFor="seo-og-image" className="block font-medium mb-1">
            Social Media Image
          </label>
          <input
            type="text"
            id="seo-og-image"
            name="og_image"
            value={formData.seo.og_image}
            onChange={handleSeoChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
            placeholder="uploads/images/social-image.jpg"
          />
          <p className="text-sm text-slate-500 mt-1">
            Image path for social media previews. Recommended: 1200x630 pixels.
          </p>
        </div>

        <div>
          <label htmlFor="seo-canonical-url" className="block font-medium mb-1">
            Canonical URL
          </label>
          <input
            type="url"
            id="seo-canonical-url"
            name="canonical_url"
            value={formData.seo.canonical_url}
            onChange={handleSeoChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
            placeholder="https://example.com/canonical-page"
          />
          <p className="text-sm text-slate-500 mt-1">
            Optional: Use if this page content exists at another URL to prevent duplicate content issues.
          </p>
        </div>

        <div>
          <label htmlFor="seo-robots" className="block font-medium mb-1">
            Search Engine Instructions
          </label>
          <select
            id="seo-robots"
            name="robots"
            value={formData.seo.robots}
            onChange={handleSeoChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm"
          >
            <option value="index,follow">Index and Follow (Default)</option>
            <option value="noindex,follow">Don't Index, but Follow Links</option>
            <option value="index,nofollow">Index, but Don't Follow Links</option>
            <option value="noindex,nofollow">Don't Index or Follow Links</option>
          </select>
          <p className="text-sm text-slate-500 mt-1">
            Controls how search engines index this page and follow its links.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
