// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import SortableItem from "../SortableItem.jsx";
import { MENU_DEFAULT_LABEL_NEW_ITEM } from "../utils/menuUtils";

// A menu item's link target is chosen in MenuCombobox. The selection handler must
// map the chosen option to the correct STABLE reference the renderer resolves:
// a page -> pageUuid, a collection item -> collectionItemUuid + collectionType
// (#11), a free-typed value -> a custom link.

const PAGE_OPTION = { value: "page-uuid-1", label: "About", slug: "about", isPage: true, group: "Pages" };
const ITEM_OPTION = {
  value: "item-uuid-1",
  label: "Project Alpha",
  isCollectionItem: true,
  collectionType: "projects",
  slugPrefix: "projects",
  slug: "alpha",
  group: "Projects",
};

/** Render one SortableItem with its dropdown forced open, returning the onEdit spy. */
function renderItem(item, options) {
  const onEdit = vi.fn();
  render(
    <DndContext>
      <SortableContext items={[item.id]}>
        <SortableItem
          id={item.id}
          item={item}
          depth={0}
          onRemove={vi.fn()}
          onEdit={onEdit}
          onAddChild={vi.fn()}
          onToggle={vi.fn()}
          expandedItems={[]}
          pages={options}
          openDropdownId={item.id}
          onDropdownOpen={vi.fn()}
          projectedDepth={0}
          indicatorPosition={null}
        />
      </SortableContext>
    </DndContext>,
  );
  return { onEdit };
}

afterEach(cleanup);

describe("SortableItem — link target selection", () => {
  it("stores collectionItemUuid + derived link when a collection item is picked", () => {
    const item = { id: "i1", label: MENU_DEFAULT_LABEL_NEW_ITEM, link: "" };
    const { onEdit } = renderItem(item, [PAGE_OPTION, ITEM_OPTION]);

    fireEvent.click(screen.getByText("Project Alpha"));

    expect(onEdit).toHaveBeenCalledTimes(1);
    const [, patch] = onEdit.mock.calls[0];
    expect(patch).toMatchObject({
      collectionItemUuid: "item-uuid-1",
      collectionType: "projects",
      link: "projects/alpha.html",
      pageUuid: undefined,
    });
    // The default label adopts the item's title.
    expect(patch.label).toBe("Project Alpha");
  });

  it("stores pageUuid + slug link when a page is picked (regression guard)", () => {
    const item = { id: "i1", label: MENU_DEFAULT_LABEL_NEW_ITEM, link: "" };
    const { onEdit } = renderItem(item, [PAGE_OPTION, ITEM_OPTION]);

    fireEvent.click(screen.getByText("About"));

    const [, patch] = onEdit.mock.calls[0];
    expect(patch).toMatchObject({
      pageUuid: "page-uuid-1",
      link: "about.html",
      collectionItemUuid: undefined,
    });
  });

  it("shows the collection item's label for a stored collectionItemUuid", () => {
    const item = {
      id: "i1",
      label: "Featured",
      collectionItemUuid: "item-uuid-1",
      collectionType: "projects",
      link: "projects/alpha.html",
    };
    renderItem(item, [PAGE_OPTION, ITEM_OPTION]);

    // The combobox input resolves the stable uuid back to the option label,
    // rather than showing the raw "projects/alpha.html" link.
    expect(screen.getByDisplayValue("Project Alpha")).toBeTruthy();
  });
});
