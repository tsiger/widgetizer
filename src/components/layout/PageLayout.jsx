export default function PageLayout({ title, description, children, buttonProps }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl tracking-tight font-bold">{title}</h1>
          {description && <p className="text-gray-600">{description}</p>}
        </div>
        {buttonProps && (
          <button
            className="px-4 py-2 bg-pink-600 text-white rounded-sm hover:bg-pink-700 transition-colors inline-flex items-center gap-2"
            {...buttonProps}
          >
            {buttonProps.icon && buttonProps.icon}
            {buttonProps.children}
          </button>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-lg shadow-slate-200 p-4">{children}</div>
    </div>
  );
}
