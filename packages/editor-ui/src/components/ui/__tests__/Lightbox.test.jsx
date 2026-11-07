// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import Lightbox from "../Lightbox.jsx";

const props = { isOpen: true, onClose: () => {}, imageAlt: "A photo", onPrevious: () => {}, onNext: () => {} };

describe("Lightbox", () => {
  it("says so when the image can't load, instead of showing an empty viewer", () => {
    render(<Lightbox {...props} imageUrl="/api/media/p/uploads/images/gone.jpg" />);
    fireEvent.error(screen.getByRole("img", { name: "A photo" }));

    expect(screen.queryByRole("img", { name: "A photo" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("components.lightbox.loadError");
  });

  it("shows the image after all when the same element loads it on a second try", () => {
    // An embedding app may reload a failed image itself, e.g. after refreshing its sign-in.
    render(<Lightbox {...props} imageUrl="/api/media/p/uploads/images/a.jpg" />);
    const img = screen.getByRole("img", { name: "A photo" });
    fireEvent.error(img);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.load(img);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("img", { name: "A photo" })).toBe(img);
  });

  it("tries the next image again after one failed", () => {
    const { rerender } = render(<Lightbox {...props} imageUrl="/a.jpg" />);
    fireEvent.error(screen.getByRole("img", { name: "A photo" }));

    rerender(<Lightbox {...props} imageUrl="/b.jpg" />);
    expect(screen.getByRole("img", { name: "A photo" })).toHaveAttribute("src", "/b.jpg");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("forgets the failure when closed, so reopening the same image tries again", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Lightbox {...props} onClose={onClose} imageUrl="/a.jpg" />);
    fireEvent.error(screen.getByRole("img", { name: "A photo" }));

    fireEvent.click(screen.getByRole("button", { name: "Close lightbox" }));
    expect(onClose).toHaveBeenCalled();
    rerender(<Lightbox {...props} isOpen={false} imageUrl="/a.jpg" />);
    rerender(<Lightbox {...props} imageUrl="/a.jpg" />);
    expect(screen.getByRole("img", { name: "A photo" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
