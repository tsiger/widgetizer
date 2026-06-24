// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PreviewStage, { STANDALONE_SANDBOX } from "../PreviewStage.jsx";

// Shared iframe stage for the standalone site preview: a centered, capped iframe
// with a loading overlay and a not-found message. Nothing renders in the frame
// until `src` is set; loading and notFound are mutually exclusive with the iframe.
describe("PreviewStage", () => {
  it("shows the loading overlay and no iframe while loading", () => {
    const { container } = render(
      <PreviewStage src={null} loading notFound={false} isMobile={false} title="t" loadingMessage="Loading…" />,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows the not-found message (not the iframe) when notFound and a src is absent", () => {
    const { container } = render(
      <PreviewStage src={null} loading={false} notFound isMobile={false} title="t" notFoundMessage="Page not found." />,
    );
    expect(screen.getByText("Page not found.")).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renders the iframe with the standalone sandbox and src once resolved", () => {
    const { container } = render(
      <PreviewStage src="/render/tok" loading={false} notFound={false} isMobile={false} title="t" sandbox={STANDALONE_SANDBOX} />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute("src")).toBe("/render/tok");
    expect(iframe.getAttribute("sandbox")).toBe(STANDALONE_SANDBOX);
  });

  it("caps the iframe width at 24rem in mobile and 100% on desktop", () => {
    const { container, rerender } = render(
      <PreviewStage src="/render/tok" loading={false} notFound={false} isMobile title="t" />,
    );
    expect(container.querySelector("iframe").style.maxWidth).toBe("24rem");
    rerender(<PreviewStage src="/render/tok" loading={false} notFound={false} isMobile={false} title="t" />);
    expect(container.querySelector("iframe").style.maxWidth).toBe("100%");
  });
});
