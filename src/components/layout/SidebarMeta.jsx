export default function SidebarMeta() {
  const docsUrl = "https://docs.widgetizer.org";
  const changelogUrl = "https://docs.widgetizer.org/changelog";

  return (
    <div className="mt-4 hidden pt-2 md:block">
      <p className="text-sm font-semibold text-white">
        Widgetizer <span className="text-white/85">{__APP_VERSION__}</span>
      </p>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <a href={docsUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
          Documentation
        </a>
        <span className="text-slate-600">&bull;</span>
        <a href={changelogUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
          Changelog
        </a>
      </div>
    </div>
  );
}
