import LoadingSpinner from "../ui/LoadingSpinner";

// Sandbox applied to standalone-runtime preview iframes (page + collection item).
export const STANDALONE_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation allow-top-navigation-by-user-activation";

/**
 * Shared preview iframe stage — the canonical look used by the standalone site
 * preview (page + collection item): a centered, full-height iframe capped at
 * `max-width` (24rem in mobile, 100% desktop) with a `shadow-2xl` in mobile and a
 * `bg-white`↔`bg-slate-200` background swap. No device "bezel" chrome.
 *
 * @param {Object} props
 * @param {string|null} props.src - Render URL for the iframe (nothing renders until set).
 * @param {boolean} props.loading - Show the loading overlay.
 * @param {boolean} [props.notFound] - Show a not-found message instead of the iframe.
 * @param {boolean} props.isMobile - Mobile viewport (narrow + shadow).
 * @param {string} props.title - iframe title.
 * @param {string} [props.sandbox] - iframe sandbox (omit for none).
 * @param {string} [props.loadingMessage] - Optional loading text.
 * @param {string} [props.notFoundMessage] - Optional not-found text.
 */
export default function PreviewStage({
  src,
  loading,
  notFound = false,
  isMobile,
  title,
  sandbox,
  loadingMessage,
  notFoundMessage,
}) {
  return (
    <div className={`relative min-h-0 flex-1 transition-colors duration-300 ${isMobile ? "bg-slate-200" : "bg-white"}`}>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
          <LoadingSpinner message={loadingMessage} />
        </div>
      )}
      {!loading && notFound && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-yellow-600">{notFoundMessage}</p>
        </div>
      )}
      {src && !notFound && (
        <iframe
          key={src}
          src={src}
          title={title}
          sandbox={sandbox}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className={`mx-auto h-full w-full border-0 transition-all duration-300 ease-in-out ${
            isMobile ? "shadow-2xl" : ""
          }`}
          style={{ maxWidth: isMobile ? "24rem" : "100%" }}
        />
      )}
    </div>
  );
}
