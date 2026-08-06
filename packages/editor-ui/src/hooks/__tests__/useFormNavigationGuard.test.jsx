// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// A fresh blocker object is returned on every render — that is what react-router
// actually does, and the guard must not re-prompt because of it.
const rr = vi.hoisted(() => ({ state: "unblocked", proceed: vi.fn(), reset: vi.fn() }));
vi.mock("react-router-dom", () => ({
  useBlocker: () => ({ state: rr.state, proceed: rr.proceed, reset: rr.reset }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import useFormNavigationGuard from "../useFormNavigationGuard.js";
import { ConfirmProvider } from "../../components/ui/ConfirmProvider.jsx";

function Harness({ dirty = true }) {
  const [n, setN] = useState(0);
  useFormNavigationGuard(dirty);
  return <button onClick={() => setN(n + 1)}>rerender-{n}</button>;
}

const renderGuard = (props) =>
  render(
    <ConfirmProvider>
      <Harness {...props} />
    </ConfirmProvider>,
  );

beforeEach(() => {
  rr.state = "unblocked";
  rr.proceed.mockClear();
  rr.reset.mockClear();
});

describe("useFormNavigationGuard", () => {
  it("does not prompt while navigation is unblocked", () => {
    renderGuard();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prompts when blocked and proceeds once confirmed", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByText("common.leaveConfirm.confirm"));

    await waitFor(() => expect(rr.proceed).toHaveBeenCalledTimes(1));
    expect(rr.reset).not.toHaveBeenCalled();
  });

  it("resets the blocker when the user stays", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    await user.click(screen.getByText("common.leaveConfirm.cancel"));

    await waitFor(() => expect(rr.reset).toHaveBeenCalledTimes(1));
    expect(rr.proceed).not.toHaveBeenCalled();
  });

  it("keeps one prompt open across unrelated re-renders", async () => {
    const user = userEvent.setup();
    rr.state = "blocked";
    renderGuard();

    // Re-render twice while still blocked. Note this does NOT fail against a
    // naive [blocker] dependency — React batches the provider's close/reopen
    // into one render, so the dialog survives either way. The reason the hook
    // keys off blocker.state is the answer-dropping race described there, which
    // is timing-dependent and not deterministically reproducible here. This
    // pins the observable contract: one prompt, and no answer until the user gives one.
    await user.click(screen.getByText("rerender-0"));
    await user.click(screen.getByText("rerender-1"));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(rr.reset).not.toHaveBeenCalled();

    await user.click(screen.getByText("common.leaveConfirm.confirm"));
    await waitFor(() => expect(rr.proceed).toHaveBeenCalledTimes(1));
  });

  it("tears the dialog down on unmount without answering the blocker", async () => {
    rr.state = "blocked";
    const { unmount } = renderGuard();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    unmount();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(rr.proceed).not.toHaveBeenCalled();
    expect(rr.reset).not.toHaveBeenCalled();
  });
});
