// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key, fallback) => fallback ?? key }) }));
vi.mock("../../../hooks/useThemeLocale", () => ({ useThemeLocale: () => ({ tTheme: (value) => value }) }));
vi.mock("../../../lib/config", () => ({ API_URL: (path) => path }));
vi.mock("../../../lib/activeProjectId", () => ({ getActiveProjectId: () => "p1" }));

import WidgetSelector from "../WidgetSelector.jsx";

const schemas = {
  accordion: { type: "accordion", displayName: "Accordion", hasPreview: true },
  banner: { type: "banner", displayName: "Banner", hasPreview: true },
};

function renderSelector() {
  render(
    <WidgetSelector
      isOpen
      onClose={() => {}}
      widgetSchemas={schemas}
      onSelectWidget={() => {}}
      triggerRef={{ current: null }}
    />,
  );
}

const hover = (name) => fireEvent.mouseEnter(screen.getByRole("option", { name: new RegExp(name) }));

describe("WidgetSelector preview picture", () => {
  it("shows the placeholder when the picture can't load, and the picture if the same element loads it again", () => {
    // An embedding app may reload a failed picture itself, e.g. after refreshing its sign-in.
    renderSelector();
    hover("Accordion");
    const img = screen.getByRole("img", { name: "Accordion" });
    expect(img).toHaveAttribute("src", "/api/preview/assets/p1/widgets/accordion/preview.png");

    fireEvent.error(img);
    expect(screen.getByText("No preview yet")).toBeInTheDocument();
    expect(img).toHaveAttribute("hidden");
    expect(img.isConnected).toBe(true);

    fireEvent.load(img);
    expect(screen.queryByText("No preview yet")).toBeNull();
    expect(screen.getByRole("img", { name: "Accordion" })).toBe(img);
  });

  it("tries the next widget's picture after one failed", () => {
    renderSelector();
    hover("Accordion");
    fireEvent.error(screen.getByRole("img", { name: "Accordion" }));

    hover("Banner");
    expect(screen.getByRole("img", { name: "Banner" })).toHaveAttribute(
      "src",
      "/api/preview/assets/p1/widgets/banner/preview.png",
    );
    expect(screen.queryByText("No preview yet")).toBeNull();
  });
});
