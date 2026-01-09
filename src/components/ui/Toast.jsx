import { useEffect, useState } from "react";
import { X } from "lucide-react";

const VARIANTS = {
  success: "bg-green-700 border-green-800 text-green-50",
  error: "bg-red-50 border-red-200 text-red-600",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info: "bg-blue-50 border-blue-200 text-blue-600",
};

export default function Toast({
  message,
  variant = "info",
  onDismiss,
  autoDismiss = false,
  autoDismissTimeout = 5000,
}) {
  const [animationState, setAnimationState] = useState("entering"); // "entering", "visible", "exiting"

  // Handle fade-in animation on mount
  useEffect(() => {
    // Start with entering state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimationState("entering");

    // After a brief delay, transition to visible
    const enterTimer = setTimeout(() => {
      setAnimationState("visible");
    }, 10);

    return () => clearTimeout(enterTimer);
  }, []);

  // Handle auto-dismiss
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        // Start exit animation
        setAnimationState("exiting");

        // Actually dismiss after animation completes
        setTimeout(() => {
          onDismiss();
        }, 300);
      }, autoDismissTimeout);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss, autoDismissTimeout]);

  // Handle manual dismiss
  const handleDismiss = () => {
    // Start exit animation
    setAnimationState("exiting");

    // Actually dismiss after animation completes
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  if (!message) return null;

  // Define animation classes based on state
  const animationClasses = {
    entering: "opacity-0",
    visible: "opacity-100",
    exiting: "translate-x-full",
  };

  return (
    <div
      className={`
				mb-4 p-4 border rounded-sm flex justify-between items-start
				${VARIANTS[variant] || VARIANTS.info}
				transform transition-all duration-300 ease-in-out
				${animationClasses[animationState]}
			`}
    >
      <div>{message}</div>
      {onDismiss && (
        <button className="ml-4 text-slate-400 hover:text-slate-600" onClick={handleDismiss} aria-label="Dismiss">
          <X size={18} />
        </button>
      )}
    </div>
  );
}
