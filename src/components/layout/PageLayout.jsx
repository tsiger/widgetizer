import Button from "../ui/Button";

export default function PageLayout({ title, description, children, buttonProps }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {description && <p className="text-gray-700 mt-1">{description}</p>}
        </div>
        {buttonProps && (
          <Button variant="primary" icon={buttonProps.icon} {...buttonProps}>
            {buttonProps.children}
          </Button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">{children}</div>
    </div>
  );
}
