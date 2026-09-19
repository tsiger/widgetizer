// @vitest-environment jsdom
/**
 * The site's Languages section.
 *
 * Unlike the rest of the project form, this file initialises real translations:
 * the confirmation has to state what removing a language deletes, and a test
 * against raw keys would not notice if those counts never reached the sentence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@widgetizer/core/locales/en.json";

const showToast = vi.fn();
const invalidateProjectsListCache = vi.fn();
const setActiveProject = vi.fn();
let fetchJsonImpl;
let projectState;

vi.mock("@widgetizer/editor-ui/lib/apiFetch", () => ({
  editorFetchJson: (...args) => fetchJsonImpl(...args),
}));
vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  invalidateProjectsListCache: (...args) => invalidateProjectsListCache(...args),
}));
vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});

import LanguagesSection from "../LanguagesSection.jsx";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

const GREEK = "Ελληνικά";
const ITALIAN = "Italiano";

function renderSection({ languages = [], defaultLanguage = "en", blocked = false } = {}) {
  const onChange = vi.fn();
  render(
    <LanguagesSection
      defaultLanguage={defaultLanguage}
      languages={languages}
      onChange={onChange}
      blocked={blocked}
    />,
  );
  return { onChange };
}

const addPicker = () => screen.getByLabelText("Add a Language");
const addButton = () => screen.getByRole("button", { name: /^Add$/ });

beforeEach(() => {
  showToast.mockClear();
  invalidateProjectsListCache.mockClear();
  setActiveProject.mockClear();
  projectState = { activeProject: { id: "p1", languages: [] }, setActiveProject };
  fetchJsonImpl = vi.fn(async () => ({}));
});

describe("the list of languages", () => {
  it("says the site is published in one language only when there are no others", () => {
    renderSection({ defaultLanguage: "el" });
    expect(screen.getByText(`None yet. The site is published in ${GREEK} only.`)).toBeTruthy();
  });

  it("lists each added language with its code, and a way to remove it", () => {
    renderSection({ languages: ["el", "it"] });
    expect(screen.getByText(GREEK)).toBeTruthy();
    expect(screen.getByText("(el)")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Remove ${GREEK}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `Remove ${ITALIAN}` })).toBeTruthy();
  });

  it("does not offer the default language, nor one already added", () => {
    renderSection({ languages: ["el"], defaultLanguage: "en" });
    const offered = [...addPicker().options].map((option) => option.value);
    expect(offered).not.toContain("en");
    expect(offered).not.toContain("el");
    expect(offered).toContain("it");
  });

  it("says plainly that adding and removing do not wait for Save", () => {
    renderSection();
    expect(screen.getByText(/takes effect straight away, not when you save/)).toBeTruthy();
  });
});

describe("adding a language", () => {
  it("posts the code and hands the new list back", async () => {
    fetchJsonImpl = vi.fn(async () => ({ languages: ["el"] }));
    const { onChange } = renderSection();

    fireEvent.change(addPicker(), { target: { value: "el" } });
    fireEvent.click(addButton());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["el"]));
    expect(fetchJsonImpl.mock.calls[0][0]).toBe("/languages");
    expect(fetchJsonImpl.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(JSON.parse(fetchJsonImpl.mock.calls[0][1].body)).toEqual({ code: "el" });
    expect(showToast).toHaveBeenCalledWith(`${GREEK} added.`, "success");
  });

  it("cannot be triggered before a language is chosen", () => {
    renderSection();
    expect(addButton().disabled).toBe(true);
  });

  it("reports the server's reason and leaves the list alone", async () => {
    fetchJsonImpl = vi.fn(async () => {
      throw new Error('"el" is already the slug of a page.');
    });
    const { onChange } = renderSection();

    fireEvent.change(addPicker(), { target: { value: "el" } });
    fireEvent.click(addButton());

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('"el" is already the slug of a page.', "error"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("removing a language", () => {
  it("states exactly what will be deleted before asking", async () => {
    fetchJsonImpl = vi.fn(async () => ({ code: "el", pages: 3, items: 2, menus: 1 }));
    renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));

    await screen.findByRole("dialog");
    expect(fetchJsonImpl.mock.calls[0][0]).toBe("/languages/el/summary");
    expect(screen.getByText(`Remove ${GREEK}?`)).toBeTruthy();
    const message = screen.getByRole("dialog").textContent;
    expect(message).toContain("3 pages, 2 collection items, 1 menu, its header and footer");
    expect(message).toContain("Uploaded images are shared");
    expect(message).toContain("cannot be undone");
  });

  it("counts one page as a page, not as pages", async () => {
    fetchJsonImpl = vi.fn(async () => ({ code: "el", pages: 1, items: 0, menus: 2 }));
    renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("dialog").textContent).toContain("1 page, 0 collection items, 2 menus");
  });

  it("deletes only after the confirmation is accepted", async () => {
    fetchJsonImpl = vi.fn(async (path) =>
      path.endsWith("/summary") ? { pages: 0, items: 0, menus: 0 } : { languages: [] },
    );
    const { onChange } = renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));
    await screen.findByRole("dialog");
    expect(fetchJsonImpl).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove Language" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
    expect(fetchJsonImpl.mock.calls[1][0]).toBe("/languages/el");
    expect(fetchJsonImpl.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
    expect(showToast).toHaveBeenCalledWith(`${GREEK} removed.`, "success");
  });

  it("says the language went but its links did not, when the server reports that", async () => {
    // The removal succeeded; some content still points at what went. A warning, not
    // an error — telling someone the removal failed would be false, and would push
    // them to retry something that is already done.
    fetchJsonImpl = vi.fn(async (path) =>
      path.endsWith("/summary")
        ? { pages: 0, items: 0, menus: 0 }
        : {
            languages: [],
            warnings: [{ code: "REFERENCE_CLEANUP_INCOMPLETE", count: 2, paths: ["pages/index.json", "menus/main-menu.json"] }],
          },
    );
    renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Remove Language" }));

    await waitFor(() => expect(showToast).toHaveBeenCalled());
    const [message, severity] = showToast.mock.calls.at(-1);
    expect(severity).toBe("warning");
    expect(message).toContain(GREEK);
    expect(message).toMatch(/couldn't be updated/i);
    // The storage keys are for logs; they mean nothing to the person reading this.
    expect(message).not.toMatch(/pages\/index\.json|menus\/|\.json/);
  });

  it("deletes nothing when the confirmation is dismissed", async () => {
    fetchJsonImpl = vi.fn(async () => ({ pages: 1, items: 0, menus: 0 }));
    const { onChange } = renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
    expect(fetchJsonImpl).toHaveBeenCalledTimes(1);
  });

  it("does not ask when it cannot read what the language contains", async () => {
    fetchJsonImpl = vi.fn(async () => {
      throw new Error("boom");
    });
    renderSection({ languages: ["el"] });

    fireEvent.click(screen.getByRole("button", { name: `Remove ${GREEK}` }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("boom", "error"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("keeping the rest of the editor in step", () => {
  it("drops the projects-list cache and refreshes the active project after adding", async () => {
    const project = { id: "p1", languages: ["el"], defaultLanguage: "en" };
    fetchJsonImpl = vi.fn(async () => project);
    const { onChange } = renderSection();

    fireEvent.change(addPicker(), { target: { value: "el" } });
    fireEvent.click(addButton());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(["el"]));
    expect(invalidateProjectsListCache).toHaveBeenCalled();
    expect(setActiveProject).toHaveBeenCalledWith(project);
  });

  it("leaves another project's record alone", async () => {
    projectState = { activeProject: { id: "other", languages: [] }, setActiveProject };
    fetchJsonImpl = vi.fn(async () => ({ id: "p1", languages: ["el"] }));
    renderSection();

    fireEvent.change(addPicker(), { target: { value: "el" } });
    fireEvent.click(addButton());

    await waitFor(() => expect(invalidateProjectsListCache).toHaveBeenCalled());
    expect(setActiveProject).not.toHaveBeenCalled();
  });
});

describe("an unsaved default language", () => {
  it("blocks adding and removing, and says why", () => {
    renderSection({ languages: ["el"], blocked: true });

    expect(addPicker().disabled).toBe(true);
    expect(screen.getByRole("button", { name: /^Add$/ }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: `Remove ${GREEK}` }).disabled).toBe(true);
    expect(screen.getByText(/Save the default language before adding or removing one/)).toBeTruthy();
  });

  it("allows both once the default matches what was saved", () => {
    renderSection({ languages: ["el"] });
    expect(addPicker().disabled).toBe(false);
    expect(screen.getByRole("button", { name: `Remove ${GREEK}` }).disabled).toBe(false);
  });
});
