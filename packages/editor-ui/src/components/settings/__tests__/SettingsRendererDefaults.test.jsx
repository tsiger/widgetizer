// @vitest-environment jsdom
/**
 * Which default the settings panel shows.
 *
 * A setting whose default is one of the theme's — or the built-in widgets' —
 * own words arrives as `resolvedDefault`, in the language being edited. It has
 * to win over the literal `default` beside it, because that literal is the same
 * word in the author's language: showing it would tell an owner their Greek
 * page starts in English when it does not.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
vi.mock("../../../hooks/useThemeLocale", () => ({
  useThemeLocale: () => ({ tTheme: (key) => key }),
}));

const { default: SettingsRenderer } = await import("../SettingsRenderer.jsx");

afterEach(cleanup);

const renderSetting = (setting, value) =>
  render(<SettingsRenderer setting={setting} value={value} onChange={() => {}} />);

describe("the default a setting shows", () => {
  it("prefers the word resolved in the language being edited", () => {
    renderSetting({ type: "text", id: "label", label: "Label", default: "Your name", resolvedDefault: "Το όνομά σας" });

    expect(screen.getByRole("textbox")).toHaveValue("Το όνομά σας");
  });

  it("falls back to the literal when nothing resolved", () => {
    renderSetting({ type: "text", id: "label", label: "Label", default: "Your name" });

    expect(screen.getByRole("textbox")).toHaveValue("Your name");
  });

  it("shows a resolved word for a setting that has no literal at all", () => {
    renderSetting({ type: "text", id: "submit_label", label: "Submit", resolvedDefault: "Αποστολή μηνύματος" });

    expect(screen.getByRole("textbox")).toHaveValue("Αποστολή μηνύματος");
  });

  it("gives way to what the owner typed", () => {
    renderSetting(
      { type: "text", id: "submit_label", label: "Submit", resolvedDefault: "Αποστολή μηνύματος" },
      "Πάμε",
    );

    expect(screen.getByRole("textbox")).toHaveValue("Πάμε");
  });
});
