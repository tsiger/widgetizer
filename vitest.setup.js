// Global Vitest setup. The default test environment stays "node" (fast for the
// store/query/logic suites); component tests opt into jsdom per-file with a
// `// @vitest-environment jsdom` docblock. jest-dom matchers and React Testing
// Library cleanup are registered here — cleanup() is a no-op when nothing was
// rendered, so this is safe for node-environment tests too.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Minimal, resource-less i18next instance so provider-less component tests
// don't warn ("You will need to pass in an i18next instance") on every
// render. With no resources a missing key falls back to the key string, so
// the suites' assert-on-keys convention is preserved.
i18n.use(initReactI18next).init({
  lng: "en",
  resources: {},
  interpolation: { escapeValue: false },
});

afterEach(() => {
  cleanup();
});
