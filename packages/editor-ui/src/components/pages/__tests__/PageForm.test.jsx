// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../../queries/pageManager", () => ({
  getAllPages: async () => [{ uuid: "u-parent", slug: "services", name: "Services" }],
}));
vi.mock("../../settings/inputs/ImageInput", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }), Trans: () => null }));

import PageForm from "../PageForm.jsx";

const PAGE = { id: "about", uuid: "u-about", name: "About", slug: "about", parentPageUuid: "u-parent" };

describe("PageForm after a save", () => {
  it("keeps the parent page on the next save", async () => {
    const onSubmit = vi.fn(async () => false);
    const { rerender, container } = render(<PageForm initialData={PAGE} onSubmit={onSubmit} isDirty />);
    rerender(<PageForm initialData={{ ...PAGE, name: "About us" }} onSubmit={onSubmit} isDirty />);

    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    await screen.findByRole("option", { name: "Services" });
    fireEvent.change(container.querySelector("#name"), { target: { value: "About us again" } });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].parentPageUuid).toBe("u-parent");
  });
});
