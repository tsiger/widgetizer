export default function WidgetSection({ children, className = "" }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}
