// @vitest-environment jsdom
/**
 * The page settings screen saves only what it edits. It loads the whole page, but
 * the page's content may be saved again by the editor while the form is open, so
 * sending the loaded copy back would overwrite that content with the old one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getPage = vi.fn();
const updatePage = vi.fn();
let submitForm;

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../queries/pageManager", () => ({
  getPage: (...args) => getPage(...args),
  updatePage: (...args) => updatePage(...args),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("../../lib/routeBase.jsx", () => ({ useEditorPath: () => (path) => path }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../components/pages/PageForm", () => ({
  default: ({ onSubmit }) => {
    submitForm = onSubmit;
    return null;
  },
}));
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../stores/projectStore", () => {
  const state = { activeProject: { id: "project-a" } };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});

const { default: PagesEdit } = await import("../PagesEdit.jsx");

const STORED = {
  id: "about",
  slug: "about",
  name: "About",
  language: "el",
  uuid: "u-about",
  seo: { description: "Old" },
  widgets: { w1: { type: "text", settings: {} } },
  widgetsOrder: ["w1"],
};

beforeEach(() => {
  getPage.mockReset().mockResolvedValue(STORED);
  updatePage.mockReset().mockResolvedValue({ success: true, data: { ...STORED, name: "About us" } });
  submitForm = null;
});

describe("saving page settings", () => {
  it("sends the form's fields and the page's language, never its content", async () => {
    render(
      <MemoryRouter initialEntries={["/pages/about/edit?language=el"]}>
        <Routes>
          <Route path="/pages/:id/edit" element={<PagesEdit />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(submitForm).toBeTypeOf("function"));

    const formData = { name: "About us", slug: "about", seo: { description: "New" }, parentPageUuid: "" };
    await submitForm(formData);

    expect(updatePage).toHaveBeenCalledTimes(1);
    const [id, body] = updatePage.mock.calls[0];
    expect(id).toBe("about");
    expect(body).toEqual({ ...formData, language: "el" });
  });
});
