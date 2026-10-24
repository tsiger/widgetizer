// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let onChange;
let shown = [];

vi.mock("../../settings", () => ({
  SettingsRenderer: (props) => {
    onChange = props.onChange;
    shown.push(props.setting.id);
    return null;
  },
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (key) => key }) }));
vi.mock("../../../hooks/useCollections", () => ({ default: () => ({ schemas: [{ type: "news" }] }) }));
vi.mock("../../../lib/activeProjectId", () => ({ getActiveProjectId: vi.fn(() => "project-a") }));
vi.mock("../../../queries/previewManager", () => ({ getProjectWidgets: vi.fn() }));

const markWidgetModified = vi.fn();
const storeStub = (state) => {
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
};
vi.mock("../../../stores/saveStore", () => storeStub({ markWidgetModified, setThemeSettingsModified: vi.fn() }));
vi.mock("../../../stores/toastStore", () => storeStub({ showToast: vi.fn() }));

const { default: usePageStore } = await import("../../../stores/pageStore");
const { default: SettingsPanel } = await import("../SettingsPanel.jsx");

const SCHEMA = {
  type: "news-grid",
  collection: { type: "news", perPageSetting: "limit" },
  settings: [{ id: "limit", type: "number", default: 3 }],
};

function renderAreaWidget() {
  usePageStore.setState({
    page: { id: "blog", widgets: {}, widgetsOrder: [] },
    sharedAreas: { before_footer: { widgets: { a1: { type: "news-grid", settings: { limit: 3 } } }, widgetsOrder: ["a1"] } },
  });
  render(
    <SettingsPanel
      selectedWidgetId="a1"
      selectedWidget={usePageStore.getState().sharedAreas.before_footer.widgets.a1}
      selectedWidgetSchema={SCHEMA}
      widgetSchemas={{ "news-grid": SCHEMA }}
      onBackToWidget={() => {}}
      selectedArea={{ id: "before_footer", label: "Before footer" }}
    />,
  );
}

beforeEach(() => {
  onChange = null;
  shown = [];
  markWidgetModified.mockClear();
});

describe("a listing widget in a shared area", () => {
  it("offers neither page-only listing role", () => {
    renderAreaWidget();
    expect(shown).toEqual(["limit", "widget_settings_header", "name"]);
  });

  it("says it is shared, and records an edit as the area's", () => {
    renderAreaWidget();
    expect(screen.getByText("pageEditor.sharedAreas.settingsNote")).toBeTruthy();
    onChange("limit", 5);
    expect(usePageStore.getState().sharedAreas.before_footer.widgets.a1.settings.limit).toBe(5);
    expect(markWidgetModified).toHaveBeenCalledWith("area:before_footer");
  });
});
