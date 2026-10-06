// @vitest-environment jsdom
/**
 * A content list's language tab lives in the URL, so coming back to the list
 * (the browser's back button, or a back link naming the language) shows the tab
 * the user left instead of the default language's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";

let extraLanguages = [];
vi.mock("../../stores/projectStore", () => ({
  useDefaultLanguage: () => "en",
  useExtraLanguages: () => extraLanguages,
  useIsMultilang: () => extraLanguages.length > 0,
}));

const { default: useListLanguage } = await import("../useListLanguage");
const { pagesListHref, menusListHref, itemsListHref } = await import("../../lib/contentRoutes");

let api;
function Probe({ fallback }) {
  const [language, setLanguage] = useListLanguage(fallback);
  const location = useLocation();
  api = { setLanguage, navigate: useNavigate() };
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="url">{location.pathname + location.search}</span>
    </div>
  );
}

const shown = () => screen.getByTestId("language").textContent;
const url = () => screen.getByTestId("url").textContent;
const open = (entry, props = {}) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe {...props} />
    </MemoryRouter>,
  );

beforeEach(() => {
  extraLanguages = ["el", "de"];
});
afterEach(cleanup);

describe("useListLanguage", () => {
  it("shows the language the URL names", () => {
    open("/pages?language=el");
    expect(shown()).toBe("el");
  });

  it("shows the default language when the URL names none", () => {
    open("/pages");
    expect(shown()).toBe("en");
    expect(url()).toBe("/pages");
  });

  it("writes the chosen tab into the URL, the default included", () => {
    open("/pages");
    act(() => api.setLanguage("el"));
    expect(shown()).toBe("el");
    expect(url()).toBe("/pages?language=el");

    act(() => api.setLanguage("en"));
    expect(shown()).toBe("en");
    expect(url()).toBe("/pages?language=en");
  });

  it("replaces the history entry when the tab changes, so back leaves the list", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard", "/pages"]} initialIndex={1}>
        <Probe />
      </MemoryRouter>,
    );
    act(() => api.setLanguage("el"));
    act(() => api.setLanguage("de"));
    act(() => api.navigate(-1));
    expect(url()).toBe("/dashboard");
  });

  it("returns to the tab the user left after going elsewhere and coming back", () => {
    render(
      <MemoryRouter initialEntries={["/pages"]}>
        <Probe />
      </MemoryRouter>,
    );
    act(() => api.setLanguage("el"));
    act(() => api.navigate("/pages/about/edit?language=el"));
    act(() => api.navigate(-1));
    expect(url()).toBe("/pages?language=el");
    expect(shown()).toBe("el");
  });

  it("drops a language the site does not have", () => {
    open("/pages?language=fr");
    expect(shown()).toBe("en");
    expect(url()).toBe("/pages");
  });

  it("uses the fallback when the URL names none, and writes it in", () => {
    open("/collections/services", { fallback: "el" });
    expect(shown()).toBe("el");
    expect(url()).toBe("/collections/services?language=el");
  });

  it("prefers the URL's language over the fallback", () => {
    open("/collections/services?language=de", { fallback: "el" });
    expect(shown()).toBe("de");
  });

  it("ignores the URL on a single-language site", () => {
    extraLanguages = [];
    open("/pages?language=el");
    expect(shown()).toBe("en");
    expect(url()).toBe("/pages");
  });
});

describe("list addresses", () => {
  it("name the language when given one, and stay bare otherwise", () => {
    expect(pagesListHref("el")).toBe("/pages?language=el");
    expect(pagesListHref(undefined)).toBe("/pages");
    expect(menusListHref("el")).toBe("/menus?language=el");
    expect(itemsListHref("news", "el")).toBe("/collections/news?language=el");
    expect(itemsListHref("news")).toBe("/collections/news");
  });
});
