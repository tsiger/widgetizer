import Button from "../ui/Button";

export default function PageLayout({ title, description, children, buttonProps, additionalButtons }) {
  const hasHeader = title || description || buttonProps || additionalButtons;

  return (
    <div className="mx-auto w-full max-w-7xl">
      {hasHeader && (
        <div className="mb-6 flex items-center justify-between">
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
      <div className="bg-white rounded-md border border-gray-200 p-4">{children}</div>
    </div>
  );
}
