// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import YouTubeInput from "../YouTubeInput.jsx";
import RichTextInput from "../RichTextInput.jsx";
import { hasUnsavedWork } from "../../../../stores/unsavedRegistry";

describe("inputs that hold a change back", () => {
  it("a YouTube address still waiting to be read counts as unsaved until it reaches the page", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<YouTubeInput id="video" value={null} onChange={onChange} />);
    expect(hasUnsavedWork()).toBe(false);
    fireEvent.change(container.querySelector("input"), { target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    expect(hasUnsavedWork()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(600));
    expect(onChange).toHaveBeenCalled();
    expect(hasUnsavedWork()).toBe(false);
    vi.useRealTimers();
  });

  it("a link address typed but not applied counts as unsaved", async () => {
    const onChange = vi.fn();
    const { container, getByTitle, unmount } = render(<RichTextInput id="body" value="<p>Hello</p>" onChange={onChange} />);
    await act(async () => {});
    fireEvent.click(getByTitle("Add Link"));
    expect(hasUnsavedWork()).toBe(false);
    fireEvent.change(container.querySelector(".richtext-link-input"), { target: { value: "https://example.com" } });
    expect(hasUnsavedWork()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    unmount();
    expect(hasUnsavedWork()).toBe(false);
  });
});
