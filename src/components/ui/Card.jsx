/**
 * Card component system using standard Tailwind classes
 */

export default function Card({ variant = "content", className = "", children, ...props }) {
  const variants = {
    content: "bg-white rounded-lg border border-gray-200 shadow-sm p-6",
    feature: "bg-white rounded-lg border border-gray-200 shadow-sm p-8 shadow-md hover:shadow-lg transition-shadow",
    featureReverse:
      "bg-black rounded-lg border border-gray-200 shadow-sm p-8 shadow-md hover:shadow-lg transition-shadow",
    compact: "bg-white rounded-lg border border-gray-200 shadow-sm p-4",
    base: "bg-white rounded-lg border border-gray-200 shadow-sm",
  };

  const cardClass = [variants[variant] || variants.content, className].filter(Boolean).join(" ");

  return (
    <div className={cardClass} {...props}>
      {children}
    </div>
  );
}

/**
 * Card with explicit header, body, and footer sections
 */
export function StructuredCard({ header, footer, className = "", children, ...props }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
      {header && <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">{header}</div>}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">{footer}</div>}
    </div>
  );
}

/**
 * Simple card header component
 */
export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Simple card body component
 */
export function CardBody({ className = "", children, ...props }) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Simple card footer component
 */
export function CardFooter({ className = "", children, ...props }) {
  return (
    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg ${className}`} {...props}>
      {children}
    </div>
  );
}
