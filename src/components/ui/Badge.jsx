/**
 * Badge component for status indicators and labels
 * Uses inline Tailwind classes for consistency
 */

export default function Badge({ variant = "neutral", className = "", children, ...props }) {
  const variants = {
    success: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    error: "bg-red-100 text-red-700 border-red-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-pink-100 text-pink-700 border-pink-200",
    pink: "bg-pink-100 text-pink-700 border-pink-200",
  };

  const baseClasses = "text-xs font-medium px-2 py-1 rounded-full border";
  const variantClasses = variants[variant] || variants.neutral;

  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </span>
  );
}
