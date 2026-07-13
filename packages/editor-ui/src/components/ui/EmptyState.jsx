/**
 * Empty state component for displaying when no data is available
 * Provides consistent messaging and call-to-action patterns
 */

export default function EmptyState({ icon, title, description, action, className = "", ...props }) {
  return (
    <div className={`empty-state ${className}`} {...props}>
      {icon && <div className="empty-state-icon">{icon}</div>}

      {title && <h3 className="empty-state-title">{title}</h3>}

      {description && <p className="empty-state-description">{description}</p>}

      {action && action}
    </div>
  );
}
