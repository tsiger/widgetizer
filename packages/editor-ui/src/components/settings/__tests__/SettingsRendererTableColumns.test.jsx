// @vitest-environment jsdom
/**
 * A table setting's column labels are theme strings, like the setting's own
 * label and its options': a theme writes them as `tTheme:` keys, and the editor
 * shows the string, not the key.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const STRINGS = {
  "pricing.fields.rates.label": "Rates",
  "pricing.fields.rates.cols.label": "Service",
  "pricing.fields.rates.cols.price": "Price",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
// As the real tTheme: a `tTheme:` key becomes its string, anything else is returned as written.
vi.mock("../../../hooks/useThemeLocale", () => ({
  useThemeLocale: () => ({
    tTheme: (value) => (typeof value === "string" && value.startsWith("tTheme:") ? (STRINGS[value.slice(7)] ?? value) : value),
  }),
}));

const { default: SettingsRenderer } = await import("../SettingsRenderer.jsx");

afterEach(cleanup);

const renderTable = (columns) =>
  render(
    <SettingsRenderer
      setting={{ type: "table", id: "rates", label: "tTheme:pricing.fields.rates.label", columns }}
      value={[{ label: "Basic", price: "$10", notes: "" }]}
      onChange={() => {}}
    />,
  );

describe("a table setting's column labels", () => {
  it("show the theme's string for a tTheme: key", () => {
    renderTable([
      { id: "label", type: "text", label: "tTheme:pricing.fields.rates.cols.label" },
      { id: "price", type: "text", label: "tTheme:pricing.fields.rates.cols.price" },
    ]);

    expect(screen.getByText("Service")).toBeTruthy();
    expect(screen.getByText("Price")).toBeTruthy();
    expect(screen.queryByText(/tTheme:/)).toBeNull();
  });

  it("show a plain label as written, and the column's id when it has no label", () => {
    renderTable([
      { id: "label", type: "text", label: "Service name" },
      { id: "notes", type: "text" },
    ]);

    expect(screen.getByText("Service name")).toBeTruthy();
    expect(screen.getByText("notes")).toBeTruthy();
  });
});
