export default function ThemeGroupItem({ groupName, isSelected, onClick }) {
  return (
    <button
      className={`w-full px-4 py-2 pl-12 text-left text-sm transition-colors ${
        isSelected ? "bg-pink-50 text-pink-600 font-medium" : "text-slate-700 hover:bg-slate-100"
      }`}
      onClick={onClick}
    >
      {groupName}
    </button>
  );
}
