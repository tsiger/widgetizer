import { useState, useEffect, useRef } from "react";
import { API_URL } from "../../config";
import LoadingSpinner from "../ui/LoadingSpinner";
import Button from "../ui/Button";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";

export default function ProjectForm({
  initialData = { name: "", description: "", theme: "" },
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  onCancel,
}) {
  const [formData, setFormData] = useState(initialData);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isNew = !initialData.id;
  const showToast = useToastStore((state) => state.showToast);

  // Use a ref to track if this is the first render
  const initialRender = useRef(true);

  // Store the previous initialData for comparison
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  useEffect(() => {
    loadThemes();
  }, []);

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

  const loadThemes = async () => {
    try {
      const response = await fetch(API_URL("/api/themes"));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setThemes(data);
    } catch (err) {
      showToast("Failed to load themes", "error");
    } finally {
      setLoading(false);
    }
  };

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
      showToast("Project name is required", "error");
      return;
    }

    if (isNew && !formData.theme) {
      showToast("Theme is required", "error");
      return;
    }

    try {
      const result = await onSubmit({
        ...formData,
        slug: formatSlug(formData.name),
      });

      // If the parent component signals to reset the form
      if (result === true) {
        setFormData({ name: "", description: "", theme: "" });
      }
      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) return <LoadingSpinner message="Un momento por favor..." />;

  return (
    <form onSubmit={handleSubmit} className="form-container">
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
          <label htmlFor="description" className="form-label-optional">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="form-textarea"
          />
        </div>

        <div className="form-field">
          <label htmlFor="theme" className="form-label">
            Theme
          </label>
          <select
            id="theme"
            name="theme"
            value={formData.theme}
            onChange={handleChange}
            className={`form-select ${!isNew ? "bg-slate-100 cursor-not-allowed" : ""}`}
            required={isNew}
            disabled={!isNew}
          >
            <option value="">Select a theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
          {!isNew && (
            <p className="form-description">
              Theme can only be selected when creating a new project. To change the theme, please create a new project.
            </p>
          )}
        </div>
      </div>

      <div className="form-actions">
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
