// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Sidebar pulls page existence from the query layer and the version footer from
// a build-time global — stub both so the test focuses on nav registration.
vi.mock("../../../queries/pageManager", () => ({ getAllPages: vi.fn().mockResolvedValue([]) }));
vi.mock("../SidebarMeta", () => ({ default: () => null }));

import Sidebar from "../Sidebar.jsx";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import { builtinNavPlugin } from "../../../extension/builtinNav.js";

function renderSidebar(plugins) {
  return render(
    <MemoryRouter>
      <PluginProvider plugins={plugins}>
        <Sidebar />
      </PluginProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar (nav from registry)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the built-in editor nav items (labels are i18n keys without a provider)", () => {
    renderSidebar([builtinNavPlugin]);
    for (const key of [
      "navigation.pages",
      "navigation.menus",
      "navigation.media",
      "navigation.settings",
      "navigation.exportSite",
      "navigation.sitePreview",
    ]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it("renders the group titles in NAV_GROUPS order", () => {
    renderSidebar([builtinNavPlugin]);
    expect(screen.getByText("navigation.site")).toBeInTheDocument();
    expect(screen.getByText("navigation.tools")).toBeInTheDocument();
  });

  it("renders plugin-contributed nav items alongside the built-ins", () => {
    const formsPlugin = {
      name: "forms",
      navItems: [{ id: "forms", labelKey: "Forms", path: "/forms", icon: () => null, group: "tools" }],
    };
    renderSidebar([builtinNavPlugin, formsPlugin]);
    expect(screen.getByText("Forms")).toBeInTheDocument();
  });
});
