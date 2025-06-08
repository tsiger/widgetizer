import { useState, useEffect, useRef } from "react";
import slugify from "slugify";
import useToastStore from "../../stores/toastStore";
import Button from "../ui/Button";

export default function MenuForm({
  initialData = { name: "", description: "" },
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

  const generateId = (name) => {
    return slugify(name, {
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

    try {
      const result = await onSubmit({
        ...formData,
        id: generateId(formData.name),
      });

      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
