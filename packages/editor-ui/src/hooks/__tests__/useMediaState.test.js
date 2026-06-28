// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useMediaState from "../useMediaState.js";

// The media library has a focused "audio" type filter. "file" means any non-image
// asset, so non-image pickers still reach audio; "audio" is a focused subset of it.
// With no active project seeded, the load effect is a no-op, so we
// drive the filter purely through setFiles/setFilterType.

const AUDIO = { id: "a", type: "audio/mpeg", originalName: "song.mp3", filename: "song.mp3" };
const IMAGE = { id: "i", type: "image/png", originalName: "pic.png", filename: "pic.png" };
const PDF = { id: "p", type: "application/pdf", originalName: "doc.pdf", filename: "doc.pdf" };

afterEach(() => {
  localStorage.clear();
});

describe("useMediaState — type filter", () => {
  it("filters to audio-only when filterType is 'audio'", () => {
    const { result } = renderHook(() => useMediaState());

    act(() => result.current.setFiles([AUDIO, IMAGE, PDF]));
    act(() => result.current.setFilterType("audio"));

    expect(result.current.filteredFiles).toEqual([AUDIO]);
  });

  it("keeps 'file' meaning any non-image asset (audio + documents)", () => {
    const { result } = renderHook(() => useMediaState());

    act(() => result.current.setFiles([AUDIO, IMAGE, PDF]));
    act(() => result.current.setFilterType("file"));

    expect(result.current.filteredFiles).toEqual([AUDIO, PDF]);
  });
});

// MEDIA-010: the grid/list view choice must survive a reload (read from localStorage on mount).
describe("useMediaState — view mode persistence", () => {
  it("defaults to list when nothing is stored", () => {
    const { result } = renderHook(() => useMediaState());
    expect(result.current.viewMode).toBe("list");
  });

  it("restores a saved view mode on mount", () => {
    localStorage.setItem("mediaViewMode", "grid");
    const { result } = renderHook(() => useMediaState());
    expect(result.current.viewMode).toBe("grid");
  });

  it("ignores an invalid stored value and falls back to list", () => {
    localStorage.setItem("mediaViewMode", "bogus");
    const { result } = renderHook(() => useMediaState());
    expect(result.current.viewMode).toBe("list");
  });

  it("persists a changed view mode to localStorage", () => {
    const { result } = renderHook(() => useMediaState());
    act(() => result.current.setViewMode("grid"));
    expect(localStorage.getItem("mediaViewMode")).toBe("grid");
  });
});
