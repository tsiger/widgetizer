// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";

const getThemeSettings = vi.fn();
let projectState;

vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getThemeSettings: (...args) => getThemeSettings(...args),
}));
vi.mock("@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx", () => ({
  default: () => <div data-testid="image-input" />,
}));

import SiteIdentityFields from "../SiteIdentityFields.jsx";
import { identityToForm } from "../siteIdentityForm.js";

const PROJECT_A = { id: "project-a", name: "A" };
const PROJECT_B = { id: "project-b", name: "B" };

function Harness({ identity = {}, identityErrors = [], project = PROJECT_B, siteTitle = "" }) {
  const form = useForm({ defaultValues: { siteIdentity: identityToForm(identity) } });
  return (
    <SiteIdentityFields
      register={form.register}
      watch={form.watch}
      setValue={form.setValue}
      identityErrors={identityErrors}
      project={project}
      siteUrl=""
      siteTitle={siteTitle}
      onGoToSiteUrl={() => {}}
    />
  );
}

const readiness = () => screen.getByRole("status").textContent;

beforeEach(() => {
  getThemeSettings.mockReset();
  getThemeSettings.mockResolvedValue({
    settings: { global: { general: [{ id: "favicon", value: "/uploads/images/icon.png" }] } },
  });
  projectState = { activeProject: PROJECT_A };
});

describe("SiteIdentityFields — logo while another project is active", () => {
  it("offers no media picker and asks for no theme settings when editing an inactive project", async () => {
    render(<Harness project={PROJECT_B} identity={{ logo: "/uploads/images/logo.png" }} />);

    expect(screen.queryByTestId("image-input")).toBeNull();
    expect(screen.getByText("forms.project.identity.logoNeedsActive")).toBeInTheDocument();
    expect(screen.queryByText("forms.project.identity.useSiteIcon")).toBeNull();
    expect(getThemeSettings).not.toHaveBeenCalled();
  });

  it("lets an inactive project's stored logo be removed", async () => {
    render(<Harness project={PROJECT_B} identity={{ logo: "/uploads/images/logo.png" }} />);
    fireEvent.click(screen.getByRole("button", { name: "forms.project.identity.removeLogo" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "forms.project.identity.removeLogo" })).toBeNull());
  });

  it("uses the media picker and offers the Site Icon for the active project", async () => {
    render(<Harness project={PROJECT_A} />);

    expect(screen.getByTestId("image-input")).toBeInTheDocument();
    expect(getThemeSettings).toHaveBeenCalledWith("project-a");
    expect(await screen.findByRole("button", { name: "forms.project.identity.useSiteIcon" })).toBeInTheDocument();
  });
});

describe("SiteIdentityFields — readiness", () => {
  it("updates as identity fields change", async () => {
    render(<Harness />);
    expect(readiness()).toContain("forms.project.identity.readinessItems.name forms.project.identity.readinessMissing");
    expect(readiness()).not.toContain("readinessItems.address");

    fireEvent.change(document.getElementById("identity-publicName"), { target: { value: "Crumbly" } });
    await waitFor(() => expect(readiness()).toContain("forms.project.identity.readinessItems.name ✓"));

    fireEvent.change(document.getElementById("identity-category"), { target: { value: "bakery" } });
    await waitFor(() =>
      expect(readiness()).toContain("forms.project.identity.readinessItems.address forms.project.identity.readinessMissing"),
    );

    fireEvent.change(document.getElementById("identity-streetAddress"), { target: { value: "1 Baker St" } });
    fireEvent.change(document.getElementById("identity-addressLocality"), { target: { value: "Athens" } });
    fireEvent.change(document.getElementById("identity-addressCountry"), { target: { value: "GR" } });
    await waitFor(() => expect(readiness()).toContain("forms.project.identity.readinessItems.address ✓"));
  });
});

describe("SiteIdentityFields — business details", () => {
  it("appears for a local business and stays hidden otherwise", async () => {
    render(<Harness identity={{ category: "organization" }} />);
    expect(screen.queryByRole("heading", { name: "forms.project.business.title" })).toBeNull();

    fireEvent.change(document.getElementById("identity-category"), { target: { value: "bakery" } });
    expect(await screen.findByRole("heading", { name: "forms.project.business.title" })).toBeInTheDocument();
  });

  it("stays visible while one of its hidden fields has an error, so it can be fixed", () => {
    render(
      <Harness
        identity={{ category: "organization", telephone: "call me" }}
        identityErrors={[{ field: "telephone", code: "invalid" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "forms.project.business.title" })).toBeInTheDocument();
    expect(document.getElementById("identity-telephone").value).toBe("call me");
    expect(screen.getByText("forms.project.identity.errors.invalid")).toBeInTheDocument();
  });
});
