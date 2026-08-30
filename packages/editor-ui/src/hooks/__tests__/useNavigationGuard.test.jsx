// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The page editor's guard. Mirrors useFormNavigationGuard.test.jsx, plus the
// one thing this hook does differently: on "leave", it clears the save store's
// unsaved-changes state *before* letting the navigation through, so the editor
// doesn't re-prompt or autosave a page the user chose to abandon.
const rr = vi.hoisted(() => ({ state: "unblocked", proceed: vi.fn(), reset: vi.fn() }));
vi.mock("react-router-dom", () => ({
  useBlocker: () => ({ state: rr.state, proceed: rr.proceed, reset: rr.reset }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const store = vi.hoisted(() => ({ dirty: true, reset: vi.fn(), calls: [] }));
vi.mock("../../stores/saveStore.js", () => ({
  default: () => ({
    hasUnsavedChanges: () => store.dirty,
    reset: () => {
      store.calls.push("store.reset");
      store.reset();
    },
  }),
}));

import useNavigationGuard from "../useNavigationGuard.js";
import { ConfirmProvider } from "../../components/ui/ConfirmProvider.jsx";

function Harness() {
  const [n, setN] = useState(0);
  useNavigationGuard();
  return <button onClick={() => setN(n + 1)}>rerender-{n}</button>;
}

const renderGuard = () =>
  render(
    <ConfirmProvider>
      <Harness />
    </ConfirmProvider>,
  );

beforeEach(() => {
  rr.state = "unblocked";
  rr.proceed.mockReset();
  rr.reset.mockReset();
  store.dirty = true;
  store.reset.mockReset();
  store.calls = [];
  rr.proceed.mockImplementation(() => store.calls.push("blocker.proceed"));
});

describe("useNavigationGuard", () => {
  it("does not prompt while navigation is unblocked", () => {
    renderGuard();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("on leave: clears unsaved-changes state, then proceeds", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("common.leaveConfirm.confirm"));

    await waitFor(() => expect(rr.proceed).toHaveBeenCalledTimes(1));
    expect(store.reset).toHaveBeenCalledTimes(1);
    // Order matters: a proceed() before reset() would let the editor unmount
    // while the store still reports dirty.
    expect(store.calls).toEqual(["store.reset", "blocker.proceed"]);
    expect(rr.reset).not.toHaveBeenCalled();
  });

  it("on stay: resets the blocker and keeps the unsaved changes", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    await user.click(screen.getByText("common.leaveConfirm.cancel"));

    await waitFor(() => expect(rr.reset).toHaveBeenCalledTimes(1));
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(store.reset).not.toHaveBeenCalled();
  });

  it("Escape counts as stay", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(rr.reset).toHaveBeenCalledTimes(1));
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(store.reset).not.toHaveBeenCalled();
  });

  it("keeps one prompt open across unrelated re-renders", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    await user.click(screen.getByText("rerender-0"));
    await user.click(screen.getByText("rerender-1"));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(rr.reset).not.toHaveBeenCalled();
  });

  it("tears the dialog down on unmount without answering the blocker or touching the store", () => {
    rr.state = "blocked";
    const { unmount } = renderGuard();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    unmount();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(rr.reset).not.toHaveBeenCalled();
    expect(store.reset).not.toHaveBeenCalled();
  });
});
