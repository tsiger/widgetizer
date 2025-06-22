/**
 * Data Table component system
 * A smart component that handles structured data with headers, rows, and empty states
 */

export default function Table({
  headers = [],
  data = [],
  renderRow,
  emptyMessage = "No data available",
  className = "",
  ...props
}) {
  return (
    <table className={`w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden ${className}`} {...props}>
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {headers.map((header, index) => (
            <th
              key={index}
              className={`text-left py-3 px-4 font-medium text-slate-700 ${
                index === headers.length - 1 ? "text-right" : ""
              }`}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&_td]:text-xs [&_td_*]:text-xs">
        {data.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="text-center py-8 text-slate-500">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((item, index) => (
            <tr
              key={item.id || index}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors duration-150 group"
            >
              {renderRow(item)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// Keep the building block components for manual table construction if needed
export function TableHead({ className = "", children, ...props }) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody className={`[&_td]:text-xs [&_td_*]:text-xs ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", children, ...props }) {
  return (
    <tr className={`group ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHeader({ className = "", children, ...props }) {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td className={`text-xs ${className}`} {...props}>
      {children}
    </td>
  );
}

/**
 * Special table cell for action buttons that appear on hover
 */
export function TableActions({ className = "", children, ...props }) {
  return (
    <td className={`text-end text-xs ${className}`} {...props}>
      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {children}
      </div>
    </td>
  );
}
