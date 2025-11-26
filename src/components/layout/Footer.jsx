import Breadcrumb from "./Breadcrumb";

export default function Footer() {
  return (
    <footer className="bg-white px-4 py-2 flex justify-between items-center text-xs border-t border-slate-200 rounded-bl-lg rounded-br-lg">
      <Breadcrumb />
      <p>
        Thank you for creating with <strong>Widgetizer {__APP_VERSION__}</strong>
      </p>
    </footer>
  );
}
