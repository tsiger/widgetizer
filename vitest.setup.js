// Global Vitest setup. The default test environment stays "node" (fast for the
// store/query/logic suites); component tests opt into jsdom per-file with a
// `// @vitest-environment jsdom` docblock. jest-dom matchers and React Testing
// Library cleanup are registered here — cleanup() is a no-op when nothing was
// rendered, so this is safe for node-environment tests too.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
