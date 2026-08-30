// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

// useConfirmationModal seeds literal "Cancel"; a bare <ConfirmationModal /> with no
// cancelText falls back to t("common.cancel"), which the mock echoes as the key.
const cancel = () => screen.getByText(/^(Cancel|common\.cancel)$/);

import ConfirmationModal from "../ConfirmationModal.jsx";
import useConfirmationAction from "../../../hooks/useConfirmationAction.js";

// The row-menu pattern every list page uses: the menu's Delete item closes the
// menu and opens the confirmation in the same click, so the focused item is
// gone before the dialog can look at document.activeElement.
function MenuPage({ withReturnFocus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { confirm, confirmationModal } = useConfirmationAction(() => {});
  return (
    <>
      <button aria-haspopup="menu" onClick={() => setMenuOpen(true)}>
        trigger
      </button>
      {menuOpen && (
        <button
          onClick={(e) => {
            const trigger = e.currentTarget.parentElement.querySelector('[aria-haspopup="menu"]');
            setMenuOpen(false);
            confirm({ title: "Delete?", ...(withReturnFocus ? { returnFocusTo: trigger } : {}) });
          }}
        >
          delete
        </button>
      )}
      {confirmationModal}
    </>
  );
}

describe("ConfirmationModal keyboard", () => {
  it("swallows Escape so document-level listeners behind the dialog do not fire", async () => {
    const user = userEvent.setup();
    const behind = vi.fn();
    // Same registration the expanded editors and row menus use.
    const listener = (e) => e.key === "Escape" && behind();
    document.addEventListener("keydown", listener);
    function Host() {
      const [open, setOpen] = useState(true);
      return <ConfirmationModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => {}} />;
    }
    render(<Host />);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(behind).not.toHaveBeenCalled();

    // With the dialog closed, Escape reaches the page again.
    await user.keyboard("{Escape}");
    expect(behind).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", listener);
  });

  it("owns the keyboard while open: window-level shortcuts behind it do not fire", async () => {
    const user = userEvent.setup();
    // Same registration the page editor's Delete/Backspace and undo/redo shortcuts use.
    const seen = [];
    const listener = (e) => seen.push(e.key);
    window.addEventListener("keydown", listener);
    function Host() {
      const [open, setOpen] = useState(true);
      return <ConfirmationModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => {}} />;
    }
    render(<Host />);

    await user.keyboard("{Backspace}{Delete}z");
    await user.keyboard("{Control>}s{/Control}{Meta>}z{/Meta}");
    expect(seen).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Swallowed means default-prevented too — Ctrl/Cmd+S must not fall through
    // to the browser's save-page UI while the dialog is open.
    const ev = new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);

    // Enter still activates the focused button (default action, Cancel has
    // autofocus) but, like every key, no longer propagates behind the dialog.
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(seen).toEqual([]);

    // Closed: keys reach the page again.
    await user.keyboard("{Backspace}");
    expect(seen).toEqual(["Backspace"]);
    window.removeEventListener("keydown", listener);
  });
});

describe("ConfirmationModal stacking", () => {
  it("keys go to the topmost of two open dialogs, then to the survivor", async () => {
    const user = userEvent.setup();
    const closeBottom = vi.fn();
    const closeTop = vi.fn();
    function Host() {
      const [topOpen, setTopOpen] = useState(true);
      return (
        <>
          <ConfirmationModal isOpen onClose={closeBottom} onConfirm={() => {}} title="bottom" />
          <ConfirmationModal
            isOpen={topOpen}
            onClose={() => {
              closeTop();
              setTopOpen(false);
            }}
            onConfirm={() => {}}
            title="top"
          />
        </>
      );
    }
    render(<Host />);

    // The page-local-plus-navigation-guard shape: the second-opened dialog is
    // the one the user sees; Escape must close it, not the hidden older one.
    await user.keyboard("{Escape}");
    expect(closeTop).toHaveBeenCalledTimes(1);
    expect(closeBottom).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(closeBottom).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmationModal focus return", () => {
  it("without returnFocusTo, an opener that unmounts on the same click loses focus (the case the prop exists for)", async () => {
    const user = userEvent.setup();
    render(<MenuPage withReturnFocus={false} />);
    await user.click(screen.getByText("trigger"));
    await user.click(screen.getByText("delete"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(cancel());

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(document.body);
  });

  it("returnFocusTo hands focus to the menu trigger even though the menu item is gone", async () => {
    const user = userEvent.setup();
    render(<MenuPage withReturnFocus />);
    await user.click(screen.getByText("trigger"));
    await user.click(screen.getByText("delete"));

    await user.click(cancel());

    await waitFor(() => expect(screen.getByText("trigger")).toHaveFocus());
  });

  it("accepts a ref and reads it at close time", async () => {
    const user = userEvent.setup();
    const ref = { current: null };
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button ref={(el) => (ref.current = el)}>home</button>
          <button onClick={() => setOpen(true)}>open</button>
          <ConfirmationModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => {}} returnFocusTo={ref} />
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByText("open"));
    await user.click(cancel());
    await waitFor(() => expect(screen.getByText("home")).toHaveFocus());
  });

  it("does not throw when the remembered element has left the DOM", async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          {!open && <button onClick={() => setOpen(true)}>open</button>}
          <ConfirmationModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => {}} />
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByText("open"));
    // The opener is unmounted while the dialog is up; closing must not crash.
    await user.click(cancel());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("a later open without returnFocusTo does not inherit the previous target", async () => {
    const user = userEvent.setup();
    function Host() {
      const { confirm, confirmationModal } = useConfirmationAction(() => {});
      const [stale, setStale] = useState(null);
      return (
        <>
          <button ref={setStale}>stale</button>
          <button onClick={() => confirm({ title: "a", returnFocusTo: stale })}>first</button>
          <button onClick={() => confirm({ title: "b" })}>second</button>
          {confirmationModal}
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByText("first"));
    await user.click(cancel());
    await waitFor(() => expect(screen.getByText("stale")).toHaveFocus());

    await user.click(screen.getByText("second"));
    await user.click(cancel());
    await waitFor(() => expect(screen.getByText("second")).toHaveFocus());
  });
});
