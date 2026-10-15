/**
 * Empty state component for displaying when no data is available
 * Provides consistent messaging and call-to-action patterns
 */

export default function EmptyState({ icon, title, description, action, className = "", ...props }) {
  return (
    <div className={`flex flex-col items-center px-6 py-16 text-center ${className}`} {...props}>
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}

      {title && <h3 className="mb-2 text-xl font-semibold text-slate-900">{title}</h3>}

      {description && <p className="mb-6 max-w-xl text-slate-600">{description}</p>}

      {action && action}
    </div>
  );
}
