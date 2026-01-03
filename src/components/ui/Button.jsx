import { forwardRef } from "react";

/**
 * Button component with multiple variants and sizes
 * Uses standard Tailwind classes for v4.1 compatibility
 */
const Button = forwardRef(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      loading = false,
      disabled = false,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    // Base button classes - made text bolder with font-semibold
    const baseClass =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    // Variant classes - added hard shadow on hover
    const variantClasses = {
      primary:
        "bg-pink-600 text-white shadow-sm hover:bg-pink-700 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-pink-500 active:bg-pink-800",
      secondary:
        "border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-pink-500 active:bg-gray-100",
      ghost:
        "text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-pink-500 active:bg-gray-200",
      danger:
        "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-red-500 active:bg-red-800",
      dark:
        "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-slate-500 active:bg-slate-950",
    };

    // Size classes
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    // Build final className
    const buttonClass = [
      baseClass,
      variantClasses[variant] || variantClasses.primary,
      sizeClasses[size] || sizeClasses.md,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Loading spinner component
    const LoadingSpinner = () => (
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button ref={ref} className={buttonClass} disabled={disabled || loading} {...props}>
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === "left" && icon}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </button>
    );
  },
);

Button.displayName = "Button";

/**
 * Icon-only button component
 */
export const IconButton = forwardRef(
  ({ variant = "neutral", size = "md", className = "", children, ...props }, ref) => {
    const variantClasses = {
      primary: "text-pink-600 hover:bg-pink-50 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-pink-500",
      neutral: "text-gray-600 hover:bg-gray-100 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-pink-500",
      danger: "text-red-600 hover:bg-red-50 hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] focus:ring-red-500",
    };

    const sizeClasses = {
      sm: "p-1.5",
      md: "p-2",
      lg: "p-3",
    };

    const buttonClass = [
      "rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
      variantClasses[variant] || variantClasses.neutral,
      sizeClasses[size] || sizeClasses.md,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={buttonClass} {...props}>
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default Button;
