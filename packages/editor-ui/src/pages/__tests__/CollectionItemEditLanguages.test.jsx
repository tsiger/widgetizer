// @vitest-environment jsdom
/**
 * Saving and creating a collection item in the right language.
 *
 * A page's settings form spreads the loaded page, so its language rides along;
 * the item form submits only its own fields, so the language has to be put back
 * on the way out — otherwise a Greek item overwrites the English one that shares
 * its slug, or 404s when there is none.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getCollectionSchema = vi.fn();
const getCollectionItem = vi.fn();
const updateCollectionItem = vi.fn();
const createCollectionItem = vi.fn();
const navigate = vi.fn();
let submitForm;
let formProps;
let routeParams = {};
let routeSearch = "";

vi.mock("../../queries/collectionManager", () => ({
  getCollectionSchema: (...args) => getCollectionSchema(...args),
  getCollectionItem: (...args) => getCollectionItem(...args),
  updateCollectionItem: (...args) => updateCollectionItem(...args),
  createCollectionItem: (...args) => createCollectionItem(...args),
}));
vi.mock("../../queries/mediaManager", () => ({ invalidateMediaCache: vi.fn() }));
vi.mock("../../hooks/useLinkTargets", () => ({ invalidateLinkTargetsCache: vi.fn() }));
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../stores/projectStore", () => {
  const state = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
// Stand in for the real form: it submits the fields it owns, nothing more.
vi.mock("../../components/collections/CollectionItemForm", () => ({
  default: (props) => {
    formProps = props;
    submitForm = () => props.onSubmit({ slug: "launch", settings: { body: "hi" } });
    return <div data-testid="form" />;
  },
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: (...args) => navigate(...args), getDirtyTitle: (title) => title }),
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => routeParams,
  useSearchParams: () => [new URLSearchParams(routeSearch), vi.fn()],
}));

const { default: CollectionItemEdit } = await import("../CollectionItemEdit.jsx");
const { default: CollectionItemAdd } = await import("../CollectionItemAdd.jsx");

const SCHEMA = { type: "news", displayName: "Story", settings: [] };

const renderAt = (Component, params, search) => {
  routeParams = params;
  routeSearch = search;
  return render(<Component />, { wrapper: MemoryRouter });
};

beforeEach(() => {
  formProps = undefined;
  submitForm = undefined;
  navigate.mockReset();
  getCollectionSchema.mockReset().mockResolvedValue(SCHEMA);
  getCollectionItem.mockReset().mockResolvedValue({
    id: "launch",
    slug: "launch",
    uuid: "u-el",
    title: "Kalimera",
    language: "el",
    settings: {},
  });
  updateCollectionItem.mockReset().mockResolvedValue({ slug: "launch", title: "Kalimera", language: "el" });
  createCollectionItem.mockReset().mockResolvedValue({ slug: "nea", language: "el" });
});
afterEach(cleanup);

describe("editing a translated item", () => {
  it("saves it back into its own language", async () => {
    renderAt(CollectionItemEdit, { type: "news", slug: "launch" }, "language=el");
    await screen.findByTestId("form");

    await submitForm();
    expect(updateCollectionItem).toHaveBeenCalledWith("news", "launch", {
      slug: "launch",
      settings: { body: "hi" },
      language: "el",
    });
  });

  it("reads the item in that language too", async () => {
    renderAt(CollectionItemEdit, { type: "news", slug: "launch" }, "language=el");
    await screen.findByTestId("form");
    expect(getCollectionItem).toHaveBeenCalledWith("news", "launch", "el");
  });

  it("sends no language on a single-language site, so nothing changes there", async () => {
    getCollectionItem.mockResolvedValue({ id: "launch", slug: "launch", title: "Launch", settings: {} });
    renderAt(CollectionItemEdit, { type: "news", slug: "launch" }, "");
    await screen.findByTestId("form");

    await submitForm();
    expect(updateCollectionItem).toHaveBeenCalledWith("news", "launch", { slug: "launch", settings: { body: "hi" } });
  });
});

describe("adding an item in a chosen language", () => {
  it("tells the form which language it is, so its pickers open there", async () => {
    renderAt(CollectionItemAdd, { type: "news" }, "language=el");
    await screen.findByTestId("form");
    expect(formProps.initialData.language).toBe("el");
  });

  it("creates it in that language", async () => {
    renderAt(CollectionItemAdd, { type: "news" }, "language=el");
    await screen.findByTestId("form");

    await submitForm();
    await waitFor(() =>
      expect(createCollectionItem).toHaveBeenCalledWith("news", {
        slug: "launch",
        settings: { body: "hi" },
        language: "el",
      }),
    );
  });
});
