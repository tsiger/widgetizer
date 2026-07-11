// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SplitButton from "../SplitButton.jsx";

const item = (over = {}) => ({ id: "publish", label: "Save & Publish", onClick: vi.fn(), ...over });

describe("SplitButton — rendering", () => {
  it("renders a single button (no caret, no menu) when there are no items", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("renders primary + a caret with menu ARIA when items exist; menu is closed initially", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item()]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    expect(caret).toHaveAttribute("aria-haspopup", "menu");
    expect(caret).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("SplitButton — mouse", () => {
  it("invokes primary.onClick on primary click", () => {
    const onClick = vi.fn();
    render(<SplitButton primary={{ label: "Save", onClick }} items={[item()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toggles the menu from the caret and runs an item's onClick, then closes", () => {
    const it0 = item();
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[it0]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(caret);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(caret).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Save & Publish" }));
    expect(it0.onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the menu when the primary button is clicked while it's open", () => {
    const onClick = vi.fn();
    render(<SplitButton primary={{ label: "Save", onClick }} items={[item()]} />);
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on outside click", () => {
    render(
      <div>
        <SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item()]} />
        <button>outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not run a disabled item", () => {
    const it0 = item({ disabled: true });
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[it0]} />);
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save & Publish" }));
    expect(it0.onClick).not.toHaveBeenCalled();
  });
});

describe("SplitButton — keyboard & focus (WAI-ARIA menu button)", () => {
  it("opens on ArrowDown from the caret and focuses the first item", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item({ id: "a", label: "A" }), item({ id: "b", label: "B" })]} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "More actions" }), { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "A" })).toHaveFocus();
  });

  it("moves focus with ArrowDown/ArrowUp/Home/End", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item({ id: "a", label: "A" }), item({ id: "b", label: "B" })]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    fireEvent.keyDown(caret, { key: "ArrowDown" });
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "B" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "A" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "B" })).toHaveFocus();
  });

  it("Enter on the focused item runs it and closes", () => {
    const it0 = item({ id: "a", label: "A" });
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[it0]} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "More actions" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Enter" });
    expect(it0.onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Escape closes the menu and returns focus to the caret", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item()]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    fireEvent.keyDown(caret, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(caret).toHaveFocus();
  });

  it("opens an all-disabled menu with focus on the menu container, and Escape closes it back to the caret", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item({ disabled: true })]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(caret);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(caret).toHaveFocus();
  });
});

describe("SplitButton — caret tone when all items are disabled", () => {
  it("shows the disabled grey tone when every item is disabled, but stays clickable (not the disabled attribute)", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item({ disabled: true })]} />);
    const caret = screen.getByRole("button", { name: "More actions" });
    expect(caret).not.toBeDisabled();
    expect(caret.className).toMatch(/bg-slate-200/);
    expect(caret.className).not.toMatch(/bg-pink-600/);
  });

  it("keeps the pink tone when at least one item is enabled", () => {
    render(
      <SplitButton
        primary={{ label: "Save", onClick: vi.fn() }}
        items={[item({ id: "a", label: "A", disabled: true }), item({ id: "b", label: "B" })]}
      />,
    );
    const caret = screen.getByRole("button", { name: "More actions" });
    expect(caret.className).toMatch(/bg-pink-600/);
    expect(caret.className).not.toMatch(/bg-slate-200/);
  });

  it("still opens the menu on click when all items are disabled (grey caret remains functional)", () => {
    render(<SplitButton primary={{ label: "Save", onClick: vi.fn() }} items={[item({ disabled: true })]} />);
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
