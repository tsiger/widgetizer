import { useState, useEffect, useRef } from "react";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";

export default function MenuForm({
  initialData = { name: "", description: "", slug: "" },
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save",
  onCancel,
}) {
  const [formData, setFormData] = useState(initialData);
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
      setFormData(initialData);
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
      showToast("Menu name is required", "error");
      return;
    }

    if (!formData.slug.trim()) {
      showToast("Slug is required", "error");
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

      // Auto-generate slug only when creating new menu and editing the name
      if (isNew && name === "name") {
        updates.slug = formatSlug(value);
      }

      return { ...prev, ...updates };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
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
          placeholder="Enter menu title"
          required
        />
      </div>

      <div>
        <label htmlFor="slug" className="block font-medium mb-1">
          Slug
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-sm"
          placeholder="Enter slug"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-sm"
          placeholder="Enter menu description"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-pink-600 text-white rounded-sm hover:bg-pink-700 disabled:bg-pink-400"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
