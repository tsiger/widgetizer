// @vitest-environment jsdom
// The widget list shows the selected widget open (its blocks listed) unless it
// was closed by hand with its arrow; a widget closed by hand opens again when it
// is selected later, from the list or from outside it (a click in the preview).
import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, fireEvent, within } from "@testing-library/react";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (key) => key }) }));
vi.mock("../../../queries/pageManager", () => ({ getPage: vi.fn(), savePageContent: vi.fn().mockResolvedValue({}) }));
vi.mock("../../../queries/previewManager", () => ({
  getGlobalWidgets: vi.fn(),
  saveGlobalWidget: vi.fn().mockResolvedValue({}),
  getProjectWidgets: vi.fn(),
  scrollElementIntoView: vi.fn(),
}));
vi.mock("../../../queries/sharedAreaManager", () => ({
  getSharedAreas: vi.fn(),
  saveSharedArea: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../../lib/activeProjectId", () => ({ getActiveProjectId: vi.fn(() => "test-project") }));
const themeState = {
  settings: null,
  hasUnsavedThemeChanges: () => false,
  saveSettings: vi.fn(),
  discardDraft: vi.fn(),
};
vi.mock("../../../stores/themeStore", () => ({ default: { getState: () => themeState } }));
vi.mock("../../../stores/projectStore", () => {
  const state = { activeProject: { id: "test-project", languages: [] } };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
// The picker is replaced by one button per widget type it would offer.
vi.mock("../WidgetSelector", () => ({
  default: ({ isOpen, widgetSchemas, excludeTypes = [], onSelectWidget, position }) =>
    isOpen ? (
      <div data-testid="picker">
        {Object.keys(widgetSchemas)
          .filter((type) => !excludeTypes.includes(type))
          .map((type) => (
            <button key={type} onClick={() => onSelectWidget(type, position)}>
              pick-{type}
            </button>
          ))}
      </div>
    ) : null,
}));

const { default: usePageStore } = await import("../../../stores/pageStore");
const { default: useWidgetStore } = await import("../../../stores/widgetStore");
const { default: useAutoSave } = await import("../../../stores/saveStore");
const { default: WidgetList } = await import("../WidgetList.jsx");

const SCHEMAS = {
  "rich-text": {
    type: "rich-text",
    displayName: "Rich text",
    settings: [],
    blocks: [
      { type: "item", settings: [] },
      { type: "other", settings: [] },
    ],
  },
  "core-form": { type: "core-form", displayName: "Form", settings: [], blocks: [] },
};

function Editor() {
  const page = usePageStore((state) => state.page);
  const { selectedWidgetId, selectedBlockId } = useWidgetStore();
  const modifiedWidgets = useAutoSave((state) => state.modifiedWidgets);
  return (
    <WidgetList
      page={page}
      widgets={page.widgets}
      widgetSchemas={SCHEMAS}
      selectedWidgetId={selectedWidgetId}
      selectedBlockId={selectedBlockId}
      modifiedWidgets={modifiedWidgets}
      onWidgetSelect={(id) => useWidgetStore.getState().setSelectedWidgetId(id)}
      onBlockSelect={(id) => useWidgetStore.getState().setSelectedBlockId(id)}
      onGlobalWidgetSelect={() => {}}
    />
  );
}

function seed() {
  const widget = () => ({
    type: "rich-text",
    settings: {},
    blocks: { b1: { type: "item", settings: {} }, b2: { type: "other", settings: {} } },
    blocksOrder: ["b1", "b2"],
  });
  const page = { id: "about", language: "en", widgets: { w1: widget(), w2: widget() }, widgetsOrder: ["w1", "w2"] };
  usePageStore.setState({
    page: structuredClone(page),
    originalPage: structuredClone(page),
    globalWidgets: { header: null, footer: null },
    originalGlobalWidgets: { header: null, footer: null },
    declaredAreas: [],
    retainedAreas: [],
    sharedAreas: {},
    originalSharedAreas: {},
    sharedAreasError: null,
    loadedProjectId: "test-project",
  });
  usePageStore.temporal.getState().clear();
  useWidgetStore.setState({ schemas: SCHEMAS, selectedWidgetId: null, selectedBlockId: null, widgetClipboard: null });
}

// jsdom has no scrolling; the list scrolls the selected widget into view.
Element.prototype.scrollTo = () => {};

const row = (id) => document.getElementById(`sidebar-widget-${id}`);
const arrow = (id) => within(row(id)).getByTitle(/^(Collapse|Expand) widget$/);
// Open means its blocks are listed, and its arrow offers to close it.
const isOpen = (id) => {
  const listed = within(row(id)).queryAllByText("item").length > 0;
  expect(arrow(id).title === "Collapse widget").toBe(listed);
  return listed;
};
// Selecting through the store is what a click on the widget in the preview does.
const selectFromOutside = (id) => act(() => useWidgetStore.getState().setSelectedWidgetId(id));

beforeEach(() => {
  vi.clearAllMocks();
  useAutoSave.getState().reset();
  seed();
});

describe("the widget list's open and closed widgets", () => {
  it("shows only the selected widget open", () => {
    render(<Editor />);
    expect(isOpen("w1")).toBe(false);
    selectFromOutside("w1");
    expect(isOpen("w1")).toBe(true);
    expect(isOpen("w2")).toBe(false);
  });

  it("keeps a widget closed by hand closed while it stays selected", () => {
    render(<Editor />);
    selectFromOutside("w1");
    fireEvent.click(arrow("w1"));
    expect(isOpen("w1")).toBe(false);
    selectFromOutside("w1");
    expect(isOpen("w1")).toBe(false);
  });

  it("opens a widget closed by hand again when it is selected from outside the list later", () => {
    render(<Editor />);
    selectFromOutside("w1");
    fireEvent.click(arrow("w1"));
    selectFromOutside("w2");
    expect(isOpen("w2")).toBe(true);
    selectFromOutside("w1");
    expect(isOpen("w1")).toBe(true);
  });

  it("opens a widget closed by hand again when its arrow is used to select it", () => {
    render(<Editor />);
    selectFromOutside("w1");
    fireEvent.click(arrow("w1"));
    selectFromOutside("w2");
    fireEvent.click(arrow("w1"));
    expect(useWidgetStore.getState().selectedWidgetId).toBe("w1");
    expect(isOpen("w1")).toBe(true);
  });

  it("shows a widget selected before the list appears open", () => {
    useWidgetStore.getState().setSelectedWidgetId("w2");
    render(<Editor />);
    expect(isOpen("w2")).toBe(true);
    expect(isOpen("w1")).toBe(false);
  });

  it("behaves the same under StrictMode", () => {
    render(
      <StrictMode>
        <Editor />
      </StrictMode>,
    );
    selectFromOutside("w1");
    fireEvent.click(arrow("w1"));
    expect(isOpen("w1")).toBe(false);
    selectFromOutside("w2");
    selectFromOutside("w1");
    expect(isOpen("w1")).toBe(true);
  });
});
