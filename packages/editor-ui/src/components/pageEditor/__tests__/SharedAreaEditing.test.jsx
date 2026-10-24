// @vitest-environment jsdom
// The editor's controls for a shared area, mounted with the real stores: adding a
// widget from the area's own button, a block's buttons, the Delete key, undo, and
// what Save then sends.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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
const { default: useDeleteKeyShortcut } = await import("../../../hooks/useDeleteKeyShortcut");
const { default: WidgetList } = await import("../WidgetList.jsx");
const { savePageContent } = await import("../../../queries/pageManager");
const { saveSharedArea } = await import("../../../queries/sharedAreaManager");

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
  useDeleteKeyShortcut();
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

function seed(area = { widgets: {}, widgetsOrder: [] }) {
  const page = { id: "about", language: "en", widgets: {}, widgetsOrder: [] };
  usePageStore.setState({
    page: structuredClone(page),
    originalPage: structuredClone(page),
    globalWidgets: { header: null, footer: null },
    originalGlobalWidgets: { header: null, footer: null },
    declaredAreas: [{ id: "before_footer", label: "Before footer" }],
    retainedAreas: [{ id: "old_banner", widgetCount: 2 }],
    sharedAreas: { before_footer: structuredClone(area) },
    originalSharedAreas: { before_footer: structuredClone(area) },
    sharedAreasError: null,
    loadedProjectId: "test-project",
  });
  usePageStore.temporal.getState().clear();
  useWidgetStore.setState({ schemas: SCHEMAS, selectedWidgetId: null, selectedBlockId: null, widgetClipboard: null });
}

const areaSection = () => document.querySelector('[data-shared-area-section="before_footer"]');
const area = () => usePageStore.getState().sharedAreas.before_footer;

// jsdom has no scrolling; the list scrolls the selected widget into view.
Element.prototype.scrollTo = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  useAutoSave.getState().reset();
  useAutoSave.setState({ isSaving: false, isAutoSaving: false, runningSave: null, queuedFollowUp: null });
});

describe("a shared area in the widget list", () => {
  it("adds a widget from the empty area's button, never offering a form, and saves only the area", async () => {
    seed();
    render(<Editor />);
    expect(screen.getByText("pageEditor.sharedAreas.emptyHint")).toBeTruthy();
    expect(screen.getByText("pageEditor.sharedAreas.notShown")).toBeTruthy();

    fireEvent.click(within(areaSection()).getByText("pageEditor.actions.addWidget"));
    expect(screen.queryByText("pick-core-form")).toBeNull();
    fireEvent.click(screen.getByText("pick-rich-text"));

    expect(area().widgetsOrder).toHaveLength(1);
    expect(usePageStore.getState().page.widgetsOrder).toEqual([]);

    await useAutoSave.getState().save();
    expect(saveSharedArea).toHaveBeenCalledTimes(1);
    expect(savePageContent).not.toHaveBeenCalled();
  });

  it("records a block's delete button as the area's change, and undo leaves nothing to save", () => {
    seed({
      widgets: {
        a1: { type: "rich-text", settings: {}, blocks: { b1: { type: "item", settings: {} } }, blocksOrder: ["b1"] },
      },
      widgetsOrder: ["a1"],
    });
    useWidgetStore.getState().setSelectedWidgetId("a1");
    render(<Editor />);

    fireEvent.click(within(areaSection()).getByTitle("pageEditor.actions.deleteBlock"));
    expect(area().widgets.a1.blocksOrder).toEqual([]);
    expect(useAutoSave.getState().modifiedWidgets.has("area:before_footer")).toBe(true);
    expect(useAutoSave.getState().modifiedWidgets.has("a1")).toBe(false);

    usePageStore.temporal.getState().undo();
    useAutoSave.getState().reconcileModifiedWidgets();
    expect(area().widgets.a1.blocksOrder).toEqual(["b1"]);
    expect(useAutoSave.getState().hasUnsavedChanges()).toBe(false);
  });

  it("deletes a selected area widget with the Delete key", () => {
    seed({ widgets: { a1: { type: "rich-text", settings: {}, blocks: {}, blocksOrder: [] } }, widgetsOrder: ["a1"] });
    render(<Editor />);
    useWidgetStore.getState().setSelectedWidgetId("a1");

    fireEvent.keyDown(window, { key: "Delete" });
    expect(area().widgetsOrder).toEqual([]);
    expect(useAutoSave.getState().modifiedWidgets.has("area:before_footer")).toBe(true);
  });
});
