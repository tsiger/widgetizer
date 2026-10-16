// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const api = vi.hoisted(() => ({ status: null, saved: [], showToast: vi.fn() }));
vi.mock("@widgetizer/editor-ui/lib/apiFetch", () => ({ apiFetchJson: vi.fn(async () => api.status) }));
vi.mock("@widgetizer/editor-ui/queries/appSettingsManager", () => ({
  saveAppSettings: vi.fn(async (patch) => {
    api.saved.push(patch);
    api.status = { ...api.status, enabled: patch.assistant.enabled };
    return {};
  }),
}));
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => ({
  default: (select) => select({ showToast: api.showToast }),
}));

import AssistantAccess from "../editor/AssistantAccess.jsx";

const OFF = { enabled: false, ready: false, error: null, sessions: [] };

beforeEach(() => {
  api.saved = [];
  api.showToast.mockReset();
});

afterEach(() => {
  delete window.electronAssistant;
});

describe("AssistantAccess", () => {
  it("shows nothing until the server has said what's true", () => {
    api.status = null;
    const { container } = render(<AssistantAccess />);
    expect(container.textContent).toBe("");
  });

  it("turns access on as a settings change outside the desktop app", async () => {
    api.status = { ...OFF, editorProtected: false };
    render(<AssistantAccess />);
    await userEvent.click(await screen.findByRole("button", { name: "appSettings.assistant.turnOn" }));
    expect(api.saved).toEqual([{ assistant: { enabled: true } }]);
  });

  it("asks the desktop app to turn it on, never the settings route", async () => {
    api.status = { ...OFF, editorProtected: true };
    window.electronAssistant = {
      requestEnable: vi.fn(async () => {
        api.status = { ...api.status, enabled: true, ready: true };
        return { result: "enabled" };
      }),
    };
    render(<AssistantAccess />);
    await userEvent.click(await screen.findByRole("button", { name: "appSettings.assistant.turnOn" }));
    expect(window.electronAssistant.requestEnable).toHaveBeenCalledTimes(1);
    expect(api.saved).toEqual([]);
    expect(await screen.findByRole("button", { name: "appSettings.assistant.turnOff" })).toBeTruthy();
  });

  it("says so when the desktop prompt isn't reachable", async () => {
    api.status = { ...OFF, editorProtected: true };
    render(<AssistantAccess />);
    await userEvent.click(await screen.findByRole("button", { name: "appSettings.assistant.turnOn" }));
    await waitFor(() => expect(api.showToast).toHaveBeenCalledWith("appSettings.assistant.desktopOnly", "error"));
    expect(api.saved).toEqual([]);
  });

  it("never lets an older status reply overwrite the result of a switch", async () => {
    const { apiFetchJson } = await import("@widgetizer/editor-ui/lib/apiFetch");
    api.status = { ...OFF, enabled: true, ready: true, editorProtected: true };
    const view = render(<AssistantAccess />);
    await screen.findByRole("button", { name: "appSettings.assistant.turnOff" });

    let releaseStale;
    apiFetchJson.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseStale = () => resolve({ ...OFF, enabled: true, ready: true, editorProtected: true });
        }),
    );
    await vi.waitFor(() => expect(releaseStale).toBeTypeOf("function"), { timeout: 7000 });
    await userEvent.click(screen.getByRole("button", { name: "appSettings.assistant.turnOff" }));
    await screen.findByRole("button", { name: "appSettings.assistant.turnOn" });
    releaseStale();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("button", { name: "appSettings.assistant.turnOn" })).toBeTruthy();
    view.unmount();
  }, 10000);

  it("turns access off directly", async () => {
    api.status = { ...OFF, enabled: true, ready: true, editorProtected: true };
    render(<AssistantAccess />);
    await userEvent.click(await screen.findByRole("button", { name: "appSettings.assistant.turnOff" }));
    expect(api.saved).toEqual([{ assistant: { enabled: false } }]);
  });
});
