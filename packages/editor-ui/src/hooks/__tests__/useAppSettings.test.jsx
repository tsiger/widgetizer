// @vitest-environment jsdom
/**
 * Many screens read the app settings at once (image and file fields, the media
 * picker, dates): they share one request and one cached copy, and a save is what
 * screens opened afterwards start from.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";

const getAppSettings = vi.fn();
const saveAppSettings = vi.fn();
vi.mock("../../queries/appSettingsManager.js", () => ({
  getAppSettings: (...args) => getAppSettings(...args),
  saveAppSettings: (...args) => saveAppSettings(...args),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { changeLanguage: () => {} } }) }));

let useAppSettings;
let useToastStore;
let hooks;

function Probe({ name, onResult = (result) => (hooks[name] = result) }) {
  const result = useAppSettings();
  onResult(result);
  if (result.loading) return <div>{name}: loading</div>;
  return (
    <div>
      {name}: {result.settings ? result.settings.media.maxFileSizeMB : "none"} {result.hasChanges ? "changed" : "saved"}
    </div>
  );
}

beforeEach(async () => {
  // The cache is module state; each test starts from a fresh module.
  vi.resetModules();
  getAppSettings.mockReset();
  saveAppSettings.mockReset();
  ({ default: useAppSettings } = await import("../useAppSettings.js"));
  ({ default: useToastStore } = await import("../../stores/toastStore.js"));
  hooks = {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useAppSettings", () => {
  it("makes one request for screens mounted together and fills in schema defaults", async () => {
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    expect(await screen.findByText("a: 7 saved")).toBeInTheDocument();
    expect(screen.getByText("b: 7 saved")).toBeInTheDocument();
    expect(getAppSettings).toHaveBeenCalledTimes(1);
    expect(hooks.a.settings.general.language).toBeDefined();
  });

  it("reuses the copy for a minute, then asks again", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    const first = render(<Probe name="a" />);
    await screen.findByText("a: 7 saved");
    first.unmount();

    render(<Probe name="b" />);
    await screen.findByText("b: 7 saved");
    expect(getAppSettings).toHaveBeenCalledTimes(1);
    cleanup();

    vi.setSystemTime(Date.now() + 60001);
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 9 } });
    render(<Probe name="c" />);
    await screen.findByText("c: 9 saved");
    expect(getAppSettings).toHaveBeenCalledTimes(2);
  });

  it("reports changes until they are saved or cancelled", async () => {
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    render(<Probe name="a" />);
    await screen.findByText("a: 7 saved");

    act(() => hooks.a.handleInputChange("media.maxFileSizeMB", 8));
    expect(screen.getByText("a: 8 changed")).toBeInTheDocument();
    act(() => hooks.a.handleCancel());
    expect(screen.getByText("a: 7 saved")).toBeInTheDocument();

    act(() => hooks.a.handleInputChange("media.maxFileSizeMB", 7));
    expect(screen.getByText("a: 7 saved")).toBeInTheDocument();

    act(() => hooks.a.handleInputChange("media.maxFileSizeMB", "12"));
    saveAppSettings.mockImplementation(async (settings) => ({ settings, message: "ok" }));
    await act(() => hooks.a.handleSave());
    expect(saveAppSettings.mock.calls[0][0].media.maxFileSizeMB).toBe(12);
    expect(screen.getByText("a: 12 saved")).toBeInTheDocument();
  });

  it("starts a screen opened after a save from the saved settings", async () => {
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    saveAppSettings.mockImplementation(async (settings) => ({ settings }));
    render(<Probe name="a" />);
    await screen.findByText("a: 7 saved");
    act(() => hooks.a.handleInputChange("media.maxFileSizeMB", 20));
    await act(() => hooks.a.handleSave());

    render(<Probe name="b" />);
    expect(await screen.findByText("b: 20 saved")).toBeInTheDocument();
    expect(getAppSettings).toHaveBeenCalledTimes(1);
  });

  it("shows one error for a failed load, and tries again on the next mount", async () => {
    getAppSettings.mockRejectedValueOnce(new Error("offline"));
    const first = render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    expect(await screen.findByText("a: none saved")).toBeInTheDocument();
    expect(screen.getByText("b: none saved")).toBeInTheDocument();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["offline"]);
    first.unmount();

    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    render(<Probe name="c" />);
    expect(await screen.findByText("c: 7 saved")).toBeInTheDocument();
    expect(getAppSettings).toHaveBeenCalledTimes(2);
  });

  it("finishes a load whose screen closed meanwhile, without touching that screen", async () => {
    let resolve;
    getAppSettings.mockReturnValue(new Promise((r) => (resolve = r)));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = render(<Probe name="a" />);
    first.unmount();
    await act(async () => resolve({ media: { maxFileSizeMB: 7 } }));

    render(<Probe name="b" />);
    expect(await screen.findByText("b: 7 saved")).toBeInTheDocument();
    expect(getAppSettings).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("makes one request under StrictMode's double mount", async () => {
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    render(
      <StrictMode>
        <Probe name="a" />
      </StrictMode>,
    );
    expect(await screen.findByText("a: 7 saved")).toBeInTheDocument();
    expect(getAppSettings).toHaveBeenCalledTimes(1);
  });

  it("keeps unsaved edits to the screen that made them", async () => {
    getAppSettings.mockResolvedValue({ media: { maxFileSizeMB: 7 } });
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    await screen.findByText("a: 7 saved");
    act(() => hooks.a.handleInputChange("media.maxFileSizeMB", 30));
    expect(screen.getByText("a: 30 changed")).toBeInTheDocument();
    expect(screen.getByText("b: 7 saved")).toBeInTheDocument();

    render(<Probe name="c" />);
    expect(await screen.findByText("c: 7 saved")).toBeInTheDocument();
  });
});
