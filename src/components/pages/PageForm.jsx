import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
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
  const isNew = !initialData.id;
  const [mediaSelectorVisible, setMediaSelectorVisible] = useState(false);
  const showToast = useToastStore((state) => state.showToast);
  const activeProject = useProjectStore((state) => state.activeProject);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      name: initialData.name || "",
      slug: initialData.slug || "",
      seo: {
        description: initialData.seo?.description || "",
        og_title: initialData.seo?.og_title || "",
        og_image: initialData.seo?.og_image || "",
        og_type: initialData.seo?.og_type || "website",
        twitter_card: initialData.seo?.twitter_card || "summary",
        canonical_url: initialData.seo?.canonical_url || "",
        robots: initialData.seo?.robots || "index,follow",
      },
    },
  });

  // Watch fields for auto-slug and media display
  const name = watch("name");
  const ogImage = watch("seo.og_image");

  // Track previous initialData to prevent infinite loops
  const prevInitialDataRef = useRef(JSON.stringify(initialData));

  // Auto-generate slug from name for new pages
  useEffect(() => {
    if (isNew && name) {
      setValue("slug", formatSlug(name));
    }
  }, [name, isNew, setValue]);

  // Reset form when initialData actually changes
  useEffect(() => {
    const currentInitialDataStr = JSON.stringify(initialData);
    if (prevInitialDataRef.current !== currentInitialDataStr) {
      reset({
        name: initialData.name || "",
        slug: initialData.slug || "",
        seo: {
          description: initialData.seo?.description || "",
          og_title: initialData.seo?.og_title || "",
          og_image: initialData.seo?.og_image || "",
          og_type: initialData.seo?.og_type || "website",
          twitter_card: initialData.seo?.twitter_card || "summary",
          canonical_url: initialData.seo?.canonical_url || "",
          robots: initialData.seo?.robots || "index,follow",
        },
      });
      prevInitialDataRef.current = currentInitialDataStr;
    }
  });

  const formatSlug = (value) => {
    return slugify(value, {
      lower: true,
      strict: true,
      trim: true,
    });
  };

  const handleSlugBlur = (e) => {
    const value = e.target.value;
    if (value) {
      setValue("slug", formatSlug(value));
    }
  };

  const handleSelectMedia = (selectedFile) => {
    if (selectedFile && selectedFile.type && selectedFile.type.startsWith("image/")) {
      setValue("seo.og_image", selectedFile.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setMediaSelectorVisible(false);
    } else {
      showToast("Please select an image file.", "error");
    }
  };

  const handleRemoveImage = () => {
    setValue("seo.og_image", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmitHandler = async (data) => {
    try {
      const result = await onSubmit({
        ...data,
        slug: formatSlug(data.slug),
      });

      return result;
    } catch (err) {
      showToast(err.message || "An error occurred while submitting the form", "error");
      return false;
    }
  };

  return (
    <form onSubmit={rhfHandleSubmit(onSubmitHandler)} className="form-container">
      {/* Main Page Data */}
      <div className="form-section">
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Title
          </label>
          <input
            type="text"
            id="name"
            {...register("name", {
              required: "Page name is required",
              validate: (value) => value.trim() !== "" || "Name cannot be empty",
            })}
            className="form-input"
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
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
              {...register("slug", {
                required: "Filename is required",
                validate: (value) => value.trim() !== "" || "Filename cannot be empty",
              })}
              onBlur={handleSlugBlur}
              className="form-input flex-1"
            />
            <span className="text-slate-500 ml-1">.html</span>
          </div>
          {errors.slug && <p className="form-error">{errors.slug.message}</p>}
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
            {...register("seo.description")}
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
            {...register("seo.og_title")}
            className="form-input"
          />
          <p className="form-description">
            Leave blank to use the page title. Used when sharing on Facebook, Twitter, etc.
          </p>
        </div>

        <div className="form-field">
          <label className="form-label-optional">Social Media Image</label>
          {ogImage ? (
            <div className="relative w-full max-w-md bg-slate-100 rounded-md overflow-hidden group">
              <img
                src={API_URL(`/api/media/projects/${activeProject?.id}${ogImage}`)}
                alt="Social media preview"
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  type="button"
                  variant="icon" 
                  size="sm" 
                  onClick={() => setMediaSelectorVisible(true)} 
                  title="Change image"
                >
                  <FolderOpen size={16} />
                </Button>
                <Button 
                  type="button"
                  variant="icon" 
                  size="sm" 
                  onClick={handleRemoveImage} 
                  title="Remove image"
                >
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
            {...register("seo.canonical_url")}
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
            {...register("seo.robots")}
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
