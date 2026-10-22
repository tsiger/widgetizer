// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

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

const storeStub = (state) => {
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
};
vi.mock("../../../stores/saveStore", () => storeStub({ markWidgetModified: vi.fn(), setThemeSettingsModified: vi.fn() }));
vi.mock("../../../stores/toastStore", () => storeStub({ showToast: vi.fn() }));

const { default: usePageStore } = await import("../../../stores/pageStore");
const { default: SettingsPanel } = await import("../SettingsPanel.jsx");

const SCHEMA = {
  type: "news-grid",
  collection: { type: "news", perPageSetting: "limit" },
  settings: [
    { id: "layout", type: "select" },
    { id: "limit", type: "number", default: 0 },
    { id: "sort", type: "select" },
  ],
};

const temporal = () => usePageStore.temporal.getState();
const widget = () => usePageStore.getState().page.widgets.w1;

function renderPanel(settings) {
  usePageStore.setState({ page: { id: "blog", widgets: { w1: { type: "news-grid", settings } }, widgetsOrder: ["w1"] } });
  temporal().clear();
  render(
    <SettingsPanel
      selectedWidgetId="w1"
      selectedWidget={widget()}
      selectedWidgetSchema={SCHEMA}
      widgetSchemas={{ "news-grid": SCHEMA }}
      onBackToWidget={() => {}}
    />,
  );
}

beforeEach(() => {
  onChange = null;
  shown = [];
});

describe("where the listing settings sit", () => {
  it("puts Split into pages before the item count, and the main page in its own section", () => {
    renderPanel({ limit: 6 });
    expect(shown).toEqual([
      "layout",
      "paginate",
      "limit",
      "sort",
      "listing_anchor_header",
      "listing_anchor",
      "widget_settings_header",
      "name",
    ]);
  });
});

describe("Split into pages", () => {
  it("leaves the main page setting alone", () => {
    renderPanel({ limit: 6, listing_anchor: false });
    onChange("paginate", true);
    expect(widget().settings).toEqual({ limit: 6, listing_anchor: false, paginate: true });
  });

  it("fills an empty item count in the same undo step", () => {
    renderPanel({ limit: 0 });
    onChange("paginate", true);
    expect(widget().settings).toEqual({ limit: 12, paginate: true });
    expect(temporal().pastStates).toHaveLength(1);

    temporal().undo();
    expect(widget().settings).toEqual({ limit: 0 });
  });

  it("stays on when the main page setting is turned off", () => {
    renderPanel({ limit: 6, paginate: true, listing_anchor: true });
    onChange("listing_anchor", false);
    expect(widget().settings).toEqual({ limit: 6, paginate: true, listing_anchor: false });
  });
});
