// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import MediaToolbar from "../MediaToolbar.jsx";

// The type-filter <select> includes a focused "Audio" option. This pairs with the
// useMediaState "audio" filter branch.

function renderToolbar() {
  return render(
    <MediaToolbar
      viewMode="grid"
      onViewModeChange={vi.fn()}
      searchTerm=""
      onSearchChange={vi.fn()}
      selectedFiles={[]}
      onBulkDelete={vi.fn()}
      onRefreshUsage={vi.fn()}
      filterType="all"
      onFilterTypeChange={vi.fn()}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("MediaToolbar — type filter", () => {
  it("offers an audio option in the type filter", () => {
    const { container } = renderToolbar();
    expect(container.querySelector('option[value="audio"]')).not.toBeNull();
  });
});
