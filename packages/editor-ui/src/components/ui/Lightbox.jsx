import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

export default function Lightbox({ isOpen, onClose, imageUrl, imageAlt, onPrevious, onNext, hasPrevious, hasNext }) {
  const { t } = useTranslation();
  // The address that failed to load; moving to another image clears it by no longer matching.
  const [failedUrl, setFailedUrl] = useState(null);
  // Closing forgets a failure, so reopening the same image (its file restored) tries again.
  const close = () => {
    setFailedUrl(null);
    onClose();
  };
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setFailedUrl(null);
        onClose();
      }
    };

    const handleArrowKeys = (e) => {
      if (e.key === "ArrowLeft" && hasPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleArrowKeys);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleArrowKeys);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white/10"
          aria-label="Close lightbox"
        >
          <X size={24} />
        </button>

        {/* Previous button */}
        {hasPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute left-4 p-3 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white/10"
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {/* Image, or a notice when it can't load (its file is missing or unreadable) */}
        {failedUrl === imageUrl && (
          <div
            role="alert"
            className="flex max-w-md flex-col items-center gap-3 rounded-md bg-white/10 px-8 py-10 text-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageOff size={40} aria-hidden="true" />
            <p className="text-sm">{t("components.lightbox.loadError")}</p>
          </div>
        )}
        {/* Kept (hidden) while the notice shows: an embedding app may load the same
            element again (say, after refreshing its sign-in), and a load clears the notice. */}
        <img
          src={imageUrl}
          alt={imageAlt || "Preview"}
          className="max-w-full max-h-[90vh] object-contain"
          hidden={failedUrl === imageUrl}
          onClick={(e) => e.stopPropagation()}
          onError={() => setFailedUrl(imageUrl)}
          onLoad={() => setFailedUrl((failed) => (failed === imageUrl ? null : failed))}
        />

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 p-3 text-white hover:text-gray-300 transition-colors rounded-full hover:bg-white/10"
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
}
