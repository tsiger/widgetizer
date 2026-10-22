// @vitest-environment jsdom
/**
 * Creating a missing translation takes the user to it, but only if they are
 * still where they asked: one who has moved anywhere since, another screen or
 * just another collection's list, must not be pulled back when it returns.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

const { default: useTranslationVersions } = await import("../useTranslationVersions");
const { default: useToastStore } = await import("../../stores/toastStore");

let api;
function List({ createVersion, onCreated, afterCreate }) {
  const { createIn, siblingsOf, pendingKey } = useTranslationVersions({
    entries: [{ id: "about", uuid: "u-about", language: "en" }],
    defaultLanguage: "en",
    createVersion,
    onCreated,
    afterCreate,
  });
  api = { createIn, siblingsOf, pendingKey, navigate: useNavigate() };
  return null;
}

function Elsewhere() {
  api.navigate = useNavigate();
  return null;
}

const open = (entry, props) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/collections/:type" element={<List {...props} />} />
        <Route path="/pages" element={<List {...props} />} />
        <Route path="/media" element={<Elsewhere />} />
      </Routes>
    </MemoryRouter>,
  );

// A create request the test finishes when it chooses.
const pendingCreate = () => {
  let finish;
  const createVersion = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = () => resolve({ id: "about", uuid: "u-el-about", translationGroupId: "u-about", language: "el" });
      }),
  );
  return { createVersion, finish: () => finish() };
};

afterEach(cleanup);

describe("useTranslationVersions", () => {
  it("takes a user still on the list to the version", async () => {
    const { createVersion, finish } = pendingCreate();
    const onCreated = vi.fn();
    const afterCreate = vi.fn();
    open("/pages", { createVersion, onCreated, afterCreate });

    let creating;
    act(() => {
      creating = api.createIn({ id: "about", uuid: "u-about", language: "en" }, "el");
    });
    await act(async () => {
      finish();
      await creating;
    });

    expect(afterCreate).toHaveBeenCalledOnce();
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ uuid: "u-el-about" }));
  });

  it("leaves a user who moved to another screen where they are", async () => {
    const { createVersion, finish } = pendingCreate();
    const onCreated = vi.fn();
    const afterCreate = vi.fn();
    open("/pages", { createVersion, onCreated, afterCreate });

    let creating;
    act(() => {
      creating = api.createIn({ id: "about", uuid: "u-about", language: "en" }, "el");
    });
    act(() => api.navigate("/media"));
    await act(async () => {
      finish();
      await creating;
    });

    expect(afterCreate).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });

  // The collection list stays mounted from one collection to the next; only the path changes.
  it("leaves a user who moved to another collection's list where they are", async () => {
    const { createVersion, finish } = pendingCreate();
    const onCreated = vi.fn();
    const afterCreate = vi.fn();
    open("/collections/news", { createVersion, onCreated, afterCreate });

    let creating;
    act(() => {
      creating = api.createIn({ id: "about", uuid: "u-about", language: "en" }, "el");
    });
    act(() => api.navigate("/collections/projects"));
    await act(async () => {
      finish();
      await creating;
    });

    expect(afterCreate).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });

  // The editor stays on /page-editor from one page to the next; only the query changes.
  it("leaves a user who moved on with only the query changing where they are", async () => {
    const { createVersion, finish } = pendingCreate();
    const onCreated = vi.fn();
    open("/pages", { createVersion, onCreated });

    let creating;
    act(() => {
      creating = api.createIn({ id: "about", uuid: "u-about", language: "en" }, "el");
    });
    act(() => api.navigate("/pages?language=el"));
    await act(async () => {
      finish();
      await creating;
    });

    expect(onCreated).not.toHaveBeenCalled();
    // Still on the list, which must not offer to create the same version again.
    expect(api.siblingsOf({ id: "about", uuid: "u-about", language: "en" }).has("el")).toBe(true);
  });

  it("reports a failed creation and goes nowhere", async () => {
    const createVersion = vi.fn(() => Promise.reject(new Error("Already exists")));
    const onCreated = vi.fn();
    const afterCreate = vi.fn();
    open("/pages", { createVersion, onCreated, afterCreate });

    await act(async () => {
      await api.createIn({ id: "about", uuid: "u-about", language: "en" }, "el");
    });

    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({ message: "Already exists", variant: "error" });
    expect(afterCreate).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(api.pendingKey).toBeNull();
    expect(api.siblingsOf({ id: "about", uuid: "u-about", language: "en" }).has("el")).toBe(false);
  });
});
