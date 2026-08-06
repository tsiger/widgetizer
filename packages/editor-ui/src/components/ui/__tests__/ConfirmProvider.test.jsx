// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The modal only uses t() for its default button/title copy; every test below
// passes explicit strings, so echoing the key back is enough.
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { ConfirmProvider, useConfirm } from "../ConfirmProvider.jsx";

const OPTS = { title: "Leave?", message: "Unsaved work", confirmText: "Discard", cancelText: "Stay" };

// Exposes confirm() through a button so tests drive it the way a user would,
// and hands the pending promise back through `pendingRef` for cancel() tests.
function Asker({ onResult, opts = OPTS, label = "ask", pendingRef }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={() => {
        const pending = confirm(opts);
        if (pendingRef) pendingRef.current = pending;
        pending.then(onResult);
      }}
    >
      {label}
    </button>
  );
}

describe("ConfirmProvider", () => {
  it("resolves true when confirmed", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask"));
    await user.click(screen.getByText("Discard"));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    // The modal fires onConfirm() *and* onClose(); the request must settle once.
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false when cancelled", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask"));
    await user.click(screen.getByText("Stay"));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false on Escape", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <Asker onResult={onResult} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("supersedes an open request so its caller is never left awaiting", async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    render(
      <ConfirmProvider>
        <Asker onResult={first} label="ask-1" opts={{ ...OPTS, title: "First" }} />
        <Asker onResult={second} label="ask-2" opts={{ ...OPTS, title: "Second" }} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask-1"));
    await user.click(screen.getByText("ask-2"));

    // The first request settles false rather than hanging forever...
    await waitFor(() => expect(first).toHaveBeenCalledWith(false));
    // ...and the second is the one now on screen.
    expect(screen.getByRole("dialog")).toHaveTextContent("Second");
    expect(second).not.toHaveBeenCalled();
  });

  it("cancel() closes the dialog and resolves false", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const pendingRef = { current: null };
    render(
      <ConfirmProvider>
        <Asker onResult={onResult} pendingRef={pendingRef} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    pendingRef.current.cancel();

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("cancel() from a superseded request leaves the current dialog alone", async () => {
    const user = userEvent.setup();
    const stalePending = { current: null };
    render(
      <ConfirmProvider>
        <Asker onResult={vi.fn()} pendingRef={stalePending} label="ask-1" opts={{ ...OPTS, title: "First" }} />
        <Asker onResult={vi.fn()} label="ask-2" opts={{ ...OPTS, title: "Second" }} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("ask-1"));
    const superseded = stalePending.current;
    await user.click(screen.getByText("ask-2"));

    // This is the unmount-mid-prompt cleanup path: it must not close a dialog
    // that now belongs to someone else.
    superseded.cancel();

    expect(screen.getByRole("dialog")).toHaveTextContent("Second");
  });

  it("returns focus to the invoking element on close", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmProvider>
        <Asker onResult={vi.fn()} />
      </ConfirmProvider>,
    );

    const trigger = screen.getByText("ask");
    await user.click(trigger);
    // Focus moves into the dialog rather than being left nowhere.
    expect(screen.getByText("Stay")).toHaveFocus();

    await user.click(screen.getByText("Stay"));

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("throws when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Asker onResult={vi.fn()} />)).toThrow(/ConfirmProvider/);
    spy.mockRestore();
  });
});
