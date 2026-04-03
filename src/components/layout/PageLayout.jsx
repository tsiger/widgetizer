import Button from "../ui/Button";

export default function PageLayout({ title, description, children, buttonProps, additionalButtons }) {
  const hasHeader = title || description || buttonProps || additionalButtons;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {hasHeader && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>}
            {description && <p className="mt-1 text-gray-700">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {additionalButtons}
            {buttonProps && (
              <Button variant="primary" icon={buttonProps.icon} {...buttonProps}>
                {buttonProps.children}
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-4">{children}</div>
    </div>
  );
}
