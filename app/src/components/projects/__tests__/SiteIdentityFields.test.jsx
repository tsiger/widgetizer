// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";

const getThemeSettings = vi.fn();
const showToast = vi.fn();

vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getThemeSettings: (...args) => getThemeSettings(...args),
}));
vi.mock("@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx", () => ({
  default: () => <div data-testid="image-input" />,
}));
vi.mock("@widgetizer/editor-ui/hooks/useAppSettings", () => ({
  default: () => ({ settings: { media: { maxFileSizeMB: 1 } } }),
}));
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});

import SiteIdentityFields from "../SiteIdentityFields.jsx";
import { identityToForm } from "../siteIdentityForm.js";

const PROJECT = { id: "project-a", name: "A" };

function Harness({
  identity = {},
  identityErrors = [],
  project = PROJECT,
  siteUrl = "",
  siteTitle = "",
  onGoTo = () => {},
}) {
  const form = useForm({ defaultValues: { siteIdentity: identityToForm(identity), logoFile: null } });
  const logoFile = useWatch({ control: form.control, name: "logoFile" });
  const props = {
    register: form.register,
    watch: form.watch,
    setValue: form.setValue,
    identityErrors,
    project,
    siteUrl,
    siteTitle,
    onGoTo,
    logoFile,
    onLogoFileChange: (file) => form.setValue("logoFile", file),
  };
  return (
    <>
      <SiteIdentityFields section="readiness" {...props} />
      <SiteIdentityFields section="identity" {...props} />
      <SiteIdentityFields section="business" {...props} />
    </>
  );
}

const readiness = () => screen.getByRole("status").textContent;
const logoFileInput = () => document.getElementById("identity-logo-file");

beforeEach(() => {
  getThemeSettings.mockReset();
  getThemeSettings.mockResolvedValue({
    settings: { global: { general: [{ id: "favicon", value: "/uploads/images/icon.png" }] } },
  });
  showToast.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("SiteIdentityFields — logo", () => {
  it("uses the media picker and offers the Site Icon for an existing project", async () => {
    render(<Harness />);

    expect(screen.getByTestId("image-input")).toBeInTheDocument();
    expect(logoFileInput()).toBeNull();
    expect(getThemeSettings).toHaveBeenCalledWith("project-a");
    expect(await screen.findByRole("button", { name: "forms.project.identity.useSiteIcon" })).toBeInTheDocument();
  });

  it("lets a new project pick a logo file, previews it and removes it again", async () => {
    render(<Harness project={{}} />);
    expect(screen.queryByTestId("image-input")).toBeNull();
    expect(getThemeSettings).not.toHaveBeenCalled();

    const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    fireEvent.change(logoFileInput(), { target: { files: [file] } });
    expect(await screen.findByRole("img", { name: "logo.svg" })).toHaveAttribute("src", "blob:preview");

    fireEvent.click(screen.getByRole("button", { name: "forms.project.identity.removeLogo" }));
    await waitFor(() => expect(screen.queryByRole("img", { name: "logo.svg" })).toBeNull());
  });

  it("refuses a file that isn't an image or is over the size limit", () => {
    render(<Harness project={{}} />);

    fireEvent.change(logoFileInput(), {
      target: { files: [new File(["%PDF"], "logo.pdf", { type: "application/pdf" })] },
    });
    fireEvent.change(logoFileInput(), {
      target: { files: [new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" })] },
    });

    expect(showToast).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("SiteIdentityFields — readiness", () => {
  it("lists only what is missing and updates as identity fields change", async () => {
    render(<Harness />);
    expect(readiness()).toContain("forms.project.identity.readinessItems.name");
    expect(readiness()).not.toContain("readinessItems.address");

    fireEvent.change(document.getElementById("identity-publicName"), { target: { value: "Crumbly" } });
    await waitFor(() => expect(readiness()).not.toContain("readinessItems.name"));

    fireEvent.change(document.getElementById("identity-category"), { target: { value: "bakery" } });
    await waitFor(() => expect(readiness()).toContain("forms.project.identity.readinessItems.address"));

    fireEvent.change(document.getElementById("identity-streetAddress"), { target: { value: "1 Baker St" } });
    fireEvent.change(document.getElementById("identity-addressLocality"), { target: { value: "Athens" } });
    fireEvent.change(document.getElementById("identity-addressCountry"), { target: { value: "GR" } });
    await waitFor(() => expect(readiness()).not.toContain("readinessItems.address"));
  });

  it("counts a logo file chosen on a new project as the logo until it is removed", async () => {
    render(<Harness project={{}} />);
    expect(readiness()).toContain("forms.project.identity.readinessItems.logo");

    fireEvent.change(logoFileInput(), { target: { files: [new File(["png"], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(readiness()).not.toContain("readinessItems.logo"));

    fireEvent.click(screen.getByRole("button", { name: "forms.project.identity.removeLogo" }));
    await waitFor(() => expect(readiness()).toContain("forms.project.identity.readinessItems.logo"));
  });

  it("shows nothing when nothing is missing", () => {
    render(<Harness identity={{ category: "person" }} siteUrl="https://ann.example" siteTitle="Ann" />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hands a missing item to onGoTo", () => {
    const onGoTo = vi.fn();
    render(<Harness onGoTo={onGoTo} />);
    fireEvent.click(screen.getByRole("button", { name: "forms.project.identity.readinessItems.name" }));
    expect(onGoTo).toHaveBeenCalledWith("name");
  });
});

describe("SiteIdentityFields — social profiles", () => {
  const addPicker = () => screen.getByRole("combobox", { name: "forms.project.identity.addProfile" });

  it("shows only the profiles that are filled in", () => {
    render(<Harness identity={{ profiles: { instagram: "https://instagram.com/crumbly" } }} />);
    expect(document.getElementById("identity-instagram").value).toBe("https://instagram.com/crumbly");
    expect(document.getElementById("identity-facebook")).toBeNull();
  });

  it("adds a profile from the picker and removes it again", async () => {
    render(<Harness />);
    expect(document.getElementById("identity-facebook")).toBeNull();

    fireEvent.change(addPicker(), { target: { value: "facebook" } });
    const input = await waitFor(() => {
      const element = document.getElementById("identity-facebook");
      expect(element).not.toBeNull();
      return element;
    });
    fireEvent.change(input, { target: { value: "https://facebook.com/crumbly" } });

    fireEvent.click(
      screen.getByRole("button", {
        name: "forms.project.identity.removeProfile forms.project.identity.networks.facebook",
      }),
    );
    await waitFor(() => expect(document.getElementById("identity-facebook")).toBeNull());
    expect([...addPicker().options].map((option) => option.value)).toContain("facebook");
  });

  it("keeps a profile with an error visible", () => {
    render(<Harness identityErrors={[{ field: "profiles.github", code: "invalid" }]} />);
    expect(document.getElementById("identity-github")).not.toBeNull();
  });
});
