// @vitest-environment jsdom
import { useLayoutEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

let activeProjectId = "p1";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("../../stores/projectStore", () => ({
  default: (selector) => selector({ activeProject: { id: activeProjectId } }),
}));
vi.mock("../../lib/apiFetch", () => ({ apiFetch: vi.fn() }));

import { apiFetch } from "../../lib/apiFetch";
import { invalidateThemeLocale, useThemeLocale } from "../useThemeLocale.js";

const KEY = "tTheme:global.general.settings.show_breadcrumbs.label";
const RAW = "global.general.settings.show_breadcrumbs.label";
const localeWith = (label) => ({ global: { general: { settings: { show_breadcrumbs: { label } } } } });
const ok = (data) => ({ ok: true, json: async () => data });

/** Locale requests wait until the test resolves them, by URL. */
function deferLocaleRequests() {
  const pending = {};
  apiFetch.mockImplementation((url) => {
    if (url === "/api/settings") return Promise.resolve(ok({}));
    return new Promise((resolve) => (pending[url] = resolve));
  });
  return pending;
}

const urlFor = (projectId) => `/api/themes/project/${projectId}/locales/en`;

async function mountWithLabel(projectId, label) {
  activeProjectId = projectId;
  const pending = deferLocaleRequests();
  const hook = renderHook(() => useThemeLocale());
  await waitFor(() => expect(pending[urlFor(projectId)]).toBeTypeOf("function"));
  await act(async () => pending[urlFor(projectId)](ok(localeWith(label))));
  await waitFor(() => expect(hook.result.current.tTheme(KEY)).toBe(label));
  return hook;
}

beforeEach(() => {
  apiFetch.mockReset();
});

describe("invalidateThemeLocale", () => {
  it("refetches a project's labels for mounted screens, keeping the old ones until the new arrive", async () => {
    const { result } = await mountWithLabel("refresh", "Old label");

    const pending = deferLocaleRequests();
    act(() => invalidateThemeLocale("refresh"));
    await waitFor(() => expect(pending[urlFor("refresh")]).toBeTypeOf("function"));
    expect(result.current.tTheme(KEY)).toBe("Old label");

    await act(async () => pending[urlFor("refresh")](ok(localeWith("Show breadcrumbs"))));
    await waitFor(() => expect(result.current.tTheme(KEY)).toBe("Show breadcrumbs"));
  });

  it("keeps the old labels when the refresh fails", async () => {
    const { result } = await mountWithLabel("failing", "Old label");

    const pending = deferLocaleRequests();
    act(() => invalidateThemeLocale("failing"));
    await waitFor(() => expect(pending[urlFor("failing")]).toBeTypeOf("function"));
    await act(async () => pending[urlFor("failing")]({ ok: false, status: 500, json: async () => ({}) }));
    expect(result.current.tTheme(KEY)).toBe("Old label");
  });

  it("does not disturb another project's load already in flight", async () => {
    activeProjectId = "other";
    const pending = deferLocaleRequests();
    const { result } = renderHook(() => useThemeLocale());
    await waitFor(() => expect(pending[urlFor("other")]).toBeTypeOf("function"));
    expect(result.current.tTheme(KEY)).toBe(RAW);

    act(() => invalidateThemeLocale("someone-else"));
    await act(async () => pending[urlFor("other")](ok(localeWith("Other label"))));
    await waitFor(() => expect(result.current.tTheme(KEY)).toBe("Other label"));
  });

  it("still loads when the refresh lands between the screen drawing and its load starting", async () => {
    activeProjectId = "between";
    const pending = deferLocaleRequests();
    const { result } = renderHook(() => {
      useLayoutEffect(() => invalidateThemeLocale("between"), []);
      return useThemeLocale();
    });
    await waitFor(() => expect(pending[urlFor("between")]).toBeTypeOf("function"));
    await act(async () => pending[urlFor("between")](ok(localeWith("Loaded"))));
    await waitFor(() => expect(result.current.tTheme(KEY)).toBe("Loaded"));
  });
});
