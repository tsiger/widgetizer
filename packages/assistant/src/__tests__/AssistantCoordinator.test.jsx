// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const env = vi.hoisted(() => ({ posts: [], dirty: false, saving: false, state: null, site: "site-1", listeners: new Set() }));
vi.mock("@widgetizer/editor-ui/stores/projectStore", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (listener) => {
    env.listeners.add(listener);
    return () => env.listeners.delete(listener);
  };
  return { default: (select) => useSyncExternalStore(subscribe, () => select({ activeProject: { id: env.site } })) };
});
vi.mock("@widgetizer/editor-ui/lib/apiFetch", () => ({
  apiFetchJson: vi.fn(async (path, options) => {
    if (path === "/api/assistant/jobs/state") {
      if (!env.state) throw new Error("offline");
      return env.state;
    }
    if (options?.method !== "POST") return {};
    env.posts.push({ path, body: JSON.parse(options?.body ?? "null") });
    return {};
  }),
}));
vi.mock("@widgetizer/editor-ui/stores/unsavedRegistry", () => ({ hasUnsavedWork: () => env.dirty }));
vi.mock("@widgetizer/editor-ui/queries/appSettingsManager", () => ({
  saveAppSettings: vi.fn(async (patch) => void env.posts.push({ path: "settings", body: patch })),
}));
vi.mock("@widgetizer/editor-ui/stores/saveStore", () => ({ default: { getState: () => ({ isSaving: env.saving }) } }));

import AssistantCoordinator from "../editor/AssistantCoordinator.jsx";
import { getSiteGeneration, setSiteGeneration } from "@widgetizer/editor-ui/lib/siteGeneration";

class FakeEventSource {
  static last = null;
  constructor(url) {
    this.url = url;
    this.listeners = {};
    FakeEventSource.last = this;
  }
  addEventListener(name, listener) {
    (this.listeners[name] ??= []).push(listener);
  }
  emit(name, data) {
    act(() => {
      for (const listener of this.listeners[name] ?? []) listener({ data: JSON.stringify(data) });
    });
  }
  close() {}
}

const reload = vi.fn();

beforeEach(() => {
  env.posts = [];
  env.dirty = false;
  env.saving = false;
  env.state = null;
  env.site = "site-1";
  setSiteGeneration(null);
  globalThis.EventSource = FakeEventSource;
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } });
  reload.mockReset();
});

afterEach(() => {
  delete globalThis.EventSource;
});

const open = () => render(<AssistantCoordinator><p>editor</p></AssistantCoordinator>);
const JOB = { id: "job-1", state: "active", summary: "New title" };

describe("AssistantCoordinator", () => {
  it("holds the editor until it knows which version of the site it loads", () => {
    open();
    expect(screen.queryByText("editor")).toBeNull();
    FakeEventSource.last.emit("hello", { generation: 4, job: null });
    expect(screen.getByText("editor")).toBeTruthy();
    expect(getSiteGeneration()).toBe("4");
  });

  it("answers whether this window has unsaved work before a job starts", async () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: null });
    env.dirty = true;
    FakeEventSource.last.emit("prepare", { operation: "op-1", jobId: "job-1" });
    await waitFor(() => expect(env.posts).toHaveLength(1));
    expect(env.posts[0].path).toBe("/api/assistant/editor/ready");
    expect(env.posts[0].body).toMatchObject({ operation: "op-1", clean: false });
    expect(env.posts[0].body.doc).toMatch(/^[a-f0-9]{32}$/);
  });

  it("locks while a job runs, offers Stop, and reloads once the site changed", async () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: null });
    FakeEventSource.last.emit("state", { generation: 2, job: JOB });
    expect(screen.getByText("assistantJob.working")).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "assistantJob.turnOff" }));
    expect(env.posts.at(-1)).toEqual({ path: "settings", body: { assistant: { enabled: false } } });
    await userEvent.click(screen.getByRole("button", { name: "assistantJob.stop" }));
    expect(env.posts.at(-1).path).toBe("/api/assistant/jobs/stop");
    FakeEventSource.last.emit("state", { generation: 3, job: null });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("unlocks without reloading when the job changed nothing", () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: null });
    FakeEventSource.last.emit("state", { generation: 1, job: JOB });
    FakeEventSource.last.emit("state", { generation: 1, job: null });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("explains, rather than reloading, when unsaved work can no longer be saved", () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: null });
    env.dirty = true;
    FakeEventSource.last.emit("hello", { generation: 5, job: null });
    expect(screen.getByText("assistantJob.missed")).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it("offers Try again and Keep when restoring failed", async () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: { ...JOB, state: "recovery_needed" } });
    await userEvent.click(screen.getByRole("button", { name: "assistantJob.keep" }));
    expect(env.posts.at(-1).path).toBe("/api/assistant/recovery/keep");
    expect(screen.getByRole("button", { name: "assistantJob.retry" })).toBeTruthy();
  });

  it("makes the rest of the page inert while locked", () => {
    open();
    FakeEventSource.last.emit("hello", { generation: 1, job: JOB });
    const editor = screen.getByText("editor").closest("body > *");
    expect(editor.inert).toBe(true);
    FakeEventSource.last.emit("state", { generation: 1, job: null });
    expect(editor.inert).toBe(false);
  });

  it("offers Undo for a job that just finished, until closed", async () => {
    localStorage.clear();
    open();
    const finished = { id: "job-9", siteId: "site-1", state: "finished", summary: "New title", ended: new Date().toISOString() };
    FakeEventSource.last.emit("hello", { generation: 1, job: null, lastFinished: finished });
    await userEvent.click(screen.getByRole("button", { name: "assistantJob.undo" }));
    expect(env.posts.at(-1)).toEqual({ path: "/api/assistant/jobs/undo", body: { jobId: "job-9" } });
    await userEvent.click(screen.getByRole("button", { name: "assistantJob.close" }));
    expect(screen.queryByRole("button", { name: "assistantJob.undo" })).toBeNull();
  });

  it("lists what changed, including pages a change touched along the way", () => {
    localStorage.clear();
    open();
    const finished = {
      id: "job-5",
      siteId: "site-1",
      summary: "News",
      ended: new Date().toISOString(),
      completion: { changes: [{ label: "the page \"news\" (en)", notes: ["Moved the collection listing here from: blog"] }], nextSteps: [] },
    };
    FakeEventSource.last.emit("hello", { generation: 1, job: null, lastFinished: finished });
    expect(screen.getByText("Moved the collection listing here from: blog")).toBeTruthy();
  });

  it("doesn't offer Undo for a job that finished long ago", () => {
    localStorage.clear();
    open();
    const finished = { id: "job-8", siteId: "site-1", state: "finished", summary: "Old", ended: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() };
    FakeEventSource.last.emit("hello", { generation: 1, job: null, lastFinished: finished });
    expect(screen.queryByRole("button", { name: "assistantJob.undo" })).toBeNull();
  });

  it("offers Undo only for the open site's job, and asks again after a switch", async () => {
    localStorage.clear();
    open();
    const finished = { id: "job-7", siteId: "site-1", state: "finished", summary: "On A", ended: new Date().toISOString() };
    FakeEventSource.last.emit("hello", { generation: 1, job: null, lastFinished: finished });
    expect(screen.getByRole("button", { name: "assistantJob.undo" })).toBeTruthy();
    env.state = { job: { generation: 1, job: null, lastFinished: null } };
    act(() => {
      env.site = "site-2";
      for (const listener of env.listeners) listener();
    });
    expect(screen.queryByRole("button", { name: "assistantJob.undo" })).toBeNull();
    env.state = { job: { generation: 1, job: null, lastFinished: finished } };
    act(() => {
      env.site = "site-1";
      for (const listener of env.listeners) listener();
    });
    expect(await screen.findByRole("button", { name: "assistantJob.undo" })).toBeTruthy();
  });

  it("takes the Undo offer down when its hour is up", async () => {
    localStorage.clear();
    open();
    const ended = new Date(Date.now() - 60 * 60 * 1000 + 150).toISOString();
    FakeEventSource.last.emit("hello", { generation: 1, job: null, lastFinished: { id: "job-6", siteId: "site-1", summary: "Soon", ended } });
    expect(screen.getByRole("button", { name: "assistantJob.undo" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "assistantJob.undo" })).toBeNull(), { timeout: 1000 });
  });

  describe("without a live event stream", () => {
    it("shows the site after a successful state read, but locked, since it can't be asked before a job", async () => {
      delete globalThis.EventSource;
      env.state = { job: { generation: 7, job: null } };
      open();
      expect(await screen.findByText("editor")).toBeTruthy();
      expect(getSiteGeneration()).toBe("7");
      await new Promise((resolve) => setTimeout(resolve, 1700));
      expect(screen.getByText("assistantJob.connecting")).toBeTruthy();
    });

    it("doesn't load content it can't place", async () => {
      delete globalThis.EventSource;
      open();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.queryByText("editor")).toBeNull();
    });
  });
});
