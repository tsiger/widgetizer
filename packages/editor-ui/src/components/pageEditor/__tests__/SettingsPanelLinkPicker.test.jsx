// @vitest-environment jsdom
/**
 * Which settings get the richtext internal-link picker.
 *
 * It was withheld from theme settings while nothing maintained a reference stored
 * there: the picker would have produced links that never resolved, never followed a
 * rename and were never cleared when their target was deleted. Theme settings now go
 * through the same resolution, seeding, duplication and cleanup as widget settings,
 * so the reason is gone and the picker is offered everywhere.
 *
 * SettingsRenderer is stubbed to record the props it is handed — the picker itself
 * lives inside a TipTap toolbar, and what changed here is which settings are told
 * they may show it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const rendererProps = [];

vi.mock("../../settings", () => ({
  SettingsRenderer: (props) => {
    rendererProps.push(props);
    return null;
  },
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (key) => key }) }));
vi.mock("../../../hooks/useCollections", () => ({ default: () => ({ collections: [], loading: false }) }));

const storeStub = (state) => {
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
};

vi.mock("../../../stores/pageStore", () => storeStub({ page: null, updateWidgetSettings: vi.fn() }));
vi.mock("../../../stores/widgetStore", () => storeStub({ schemas: {} }));
vi.mock("../../../stores/saveStore", () => storeStub({ setThemeSettingsModified: vi.fn() }));
vi.mock("../../../stores/toastStore", () => storeStub({ showToast: vi.fn() }));

const { default: SettingsPanel } = await import("../SettingsPanel.jsx");

const THEME_SETTINGS = {
  settings: { global: { general: [{ id: "intro", type: "richtext", label: "Intro" }] } },
};

beforeEach(() => {
  rendererProps.length = 0;
});

describe("the richtext internal-link picker", () => {
  it("is offered for a theme setting", () => {
    render(
      <SettingsPanel
        selectedThemeGroup="general"
        themeSettings={THEME_SETTINGS}
        widgetSchemas={{}}
        onBackToWidget={() => {}}
      />,
    );

    expect(rendererProps.length).toBeGreaterThan(0);
    expect(rendererProps.every((p) => p.allowInternalLinkTargets)).toBe(true);
  });

  it("is still offered for a widget setting", () => {
    // The change must not have swapped one exclusion for another.
    render(
      <SettingsPanel
        selectedWidgetId="w1"
        selectedWidget={{ type: "prose", settings: { body: "" } }}
        selectedWidgetSchema={{ settings: [{ id: "body", type: "richtext", label: "Body" }] }}
        widgetSchemas={{}}
        onBackToWidget={() => {}}
      />,
    );

    expect(rendererProps.length).toBeGreaterThan(0);
    expect(rendererProps.every((p) => p.allowInternalLinkTargets)).toBe(true);
  });
});
