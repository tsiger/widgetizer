import { useState, useEffect, useCallback } from "react";
import { Play, ExternalLink, Settings, Check, X, AlertCircle } from "lucide-react";
import { extractVideoId, validateYouTubeUrl, createYouTubeEmbed, getThumbnailUrl } from "../../../utils/youtubeHelpers";

export default function YouTubeInput({ id, label, description, value = null, onChange, setting = {} }) {
  const [url, setUrl] = useState(value?.url || "");
  const [embedData, setEmbedData] = useState(value);
  const [isValid, setIsValid] = useState(!!value?.videoId);
  const [showOptions, setShowOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Default embed options from setting or fallback
  const defaultOptions = {
    autoplay: false,
    controls: true,
    mute: false,
    loop: false,
    modestbranding: true,
    rel: false,
    showinfo: false,
    fs: true,
    ...setting.embedOptions,
  };

  // Process URL input and create embed data
  const processUrl = useCallback(
    async (inputUrl) => {
      if (!inputUrl.trim()) {
        setEmbedData(null);
        setIsValid(false);
        setError("");
        onChange(null);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        if (!validateYouTubeUrl(inputUrl)) {
          setError("Please enter a valid YouTube URL or video ID");
          setIsValid(false);
          setEmbedData(null);
          onChange(null);
          return;
        }

        const currentOptions = embedData?.options || defaultOptions;
        const newEmbedData = createYouTubeEmbed(inputUrl, currentOptions);

        if (newEmbedData) {
          setEmbedData(newEmbedData);
          setIsValid(true);
          onChange(newEmbedData);
        } else {
          setError("Could not process YouTube URL");
          setIsValid(false);
          setEmbedData(null);
          onChange(null);
        }
      } catch (err) {
        setError("Error processing YouTube URL");
        setIsValid(false);
        setEmbedData(null);
        onChange(null);
      } finally {
        setIsLoading(false);
      }
    },
    [embedData?.options, defaultOptions, onChange],
  );

  // Handle URL input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      processUrl(url);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url, processUrl]);

  // Update embed options
  const updateOptions = useCallback(
    (newOptions) => {
      if (!embedData) return;

      const updatedEmbedData = createYouTubeEmbed(embedData.url, newOptions);
      setEmbedData(updatedEmbedData);
      onChange(updatedEmbedData);
    },
    [embedData, onChange],
  );

  // Handle option toggle
  const handleOptionChange = useCallback(
    (optionKey, value) => {
      const newOptions = {
        ...embedData.options,
        [optionKey]: value,
      };
      updateOptions(newOptions);
    },
    [embedData?.options, updateOptions],
  );

  // Clear video
  const clearVideo = useCallback(() => {
    setUrl("");
    setEmbedData(null);
    setIsValid(false);
    setError("");
    onChange(null);
  }, [onChange]);

  return (
    <div className="youtube-input space-y-3">
      {/* URL Input */}
      <div>
        <label htmlFor={id} className="form-label">
          {label}
        </label>

        <div className="relative">
          <input
            id={id}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL or video ID..."
            className={`form-input pr-10 ${
              error
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : isValid
                  ? "border-green-500 focus:ring-green-500 focus:border-green-500"
                  : ""
            }`}
          />

          {/* Status icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            {!isLoading && isValid && <Check className="w-4 h-4 text-green-500" />}
            {!isLoading && error && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
        </div>

        {/* Error message */}
        {error && <p className="form-error">{error}</p>}

        {/* Description */}
        {description && <p className="form-description">{description}</p>}
      </div>

      {/* Video Preview */}
      {isValid && embedData && (
        <div className="youtube-preview border border-slate-200 rounded-lg overflow-hidden bg-white">
          {/* Thumbnail and video info */}
          <div className="flex items-start gap-3 p-3">
            <div className="relative flex-shrink-0">
              <img
                src={embedData.thumbnail}
                alt="Video thumbnail"
                className="w-24 h-18 object-cover rounded bg-gray-100"
                onError={(e) => {
                  e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='72' viewBox='0 0 96 72' fill='%23f1f5f9'%3E%3Crect width='96' height='72' fill='%23f1f5f9'/%3E%3Cg fill='%2394a3b8'%3E%3Cpath d='M48 32c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z'/%3E%3Cpath d='M38 36l8 4-8 4z'/%3E%3C/g%3E%3C/svg%3E`;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 truncate">YouTube Video</p>
              <p className="text-xs text-slate-500 truncate">ID: {embedData.videoId}</p>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={embedData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on YouTube
                </a>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                title="Embed options"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={clearVideo}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                title="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Embed Options */}
          {showOptions && (
            <div className="border-t border-slate-200 p-3 bg-slate-50">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Embed Options</h4>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "autoplay", label: "Autoplay" },
                  { key: "controls", label: "Show Controls" },
                  { key: "mute", label: "Muted" },
                  { key: "loop", label: "Loop" },
                  { key: "modestbranding", label: "Modest Branding" },
                  { key: "rel", label: "Related Videos" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={embedData.options[key] || false}
                      onChange={(e) => handleOptionChange(key, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">{label}</span>
                  </label>
                ))}
              </div>

              {/* Preview embed URL */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Embed URL:</p>
                <p className="text-xs font-mono text-slate-600 bg-white p-2 rounded border break-all">
                  {embedData.embedUrl}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
