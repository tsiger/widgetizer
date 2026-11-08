import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import n from "eslint-plugin-n";
import { readFileSync } from "node:fs";
import requireScopeArg from "./eslint-rules/require-scope-arg.js";

// Local-only plugin housing repo-specific lint rules.
const local = { rules: { "require-scope-arg": requireScopeArg } };

// React Compiler checks from eslint-plugin-react-hooks that flag existing editor
// and shell code (7.1.1 found 36 places). Reported as warnings until that code is
// reworked component by component; the other hooks rules stay errors.
const reactCompilerFindingsAsWarnings = {
  "react-hooks/globals": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/static-components": "warn",
};

// ESLint 10 tracks JSX references itself (`<Card />` counts as using `Card`), so
// eslint-plugin-react's workaround for that is redundant.
const jsxReferencesTrackedByEslint = { "react/jsx-uses-vars": "off" };

// Core rules that catch likely mistakes and cost nothing today: the code passes
// them all, apart from a few deliberate cases marked inline.
const mistakeGuards = {
  "array-callback-return": "error",
  "default-case-last": "error",
  eqeqeq: ["error", "smart"],
  "no-constructor-return": "error",
  "no-new-wrappers": "error",
  "no-return-assign": "error",
  "no-self-compare": "error",
  "no-template-curly-in-string": "error",
  "no-throw-literal": "error",
  "no-unreachable-loop": "error",
  "prefer-promise-reject-errors": "error",
};

// The workspace packages the server runs (core is also bundled into the editor)
// are installed in production without dev dependencies: the Docker image prunes
// them and the desktop app packs only dependencies. n/no-unpublished-* can't see
// that from inside a workspace (it reads only the workspace's own package.json,
// and the dev packages are declared at the root), so each workspace refuses, by
// name, the dev packages that neither it nor the root declares for runtime. This
// protects OSS's own install; a package the root alone declares still passes.
const readPackage = (dir) => JSON.parse(readFileSync(new URL(`${dir}/package.json`, import.meta.url), "utf8"));
const rootPackage = readPackage(".");
const runtimeNames = (p) => [
  ...Object.keys(p.dependencies ?? {}),
  ...Object.keys(p.peerDependencies ?? {}),
  ...Object.keys(p.optionalDependencies ?? {}),
];
function devOnlyImportsRefused(workspaceDir) {
  const workspace = readPackage(workspaceDir);
  const runtime = new Set([...runtimeNames(rootPackage), ...runtimeNames(workspace)]);
  const devOnly = [
    ...new Set([...Object.keys(rootPackage.devDependencies ?? {}), ...Object.keys(workspace.devDependencies ?? {})]),
  ].filter((name) => !runtime.has(name));
  // Static, re-exported and literal dynamic imports, and require().
  const refused = [
    {
      name: devOnly.flatMap((name) => [name, `${name}/**`]),
      message: "a dev dependency, which production doesn't install",
    },
  ];
  return {
    files: [`${workspaceDir}/src/**/*.js`],
    ignores: ["**/*.test.js", "**/tests/**", "**/__tests__/**"],
    plugins: { n },
    rules: { "n/no-restricted-import": ["error", refused], "n/no-restricted-require": ["error", refused] },
  };
}

// The root's own production files: n/no-unpublished-* refuses a dev-only package
// (ignorePrivate: the root is "private", which the rule skips by default).
const devOnlyInProduction = (options = {}) => ({
  "n/no-unpublished-import": ["error", { ignorePrivate: false, ...options }],
  "n/no-unpublished-require": ["error", { ignorePrivate: false, ...options }],
});

export default [
  // data/ is runtime state (installed theme copies, projects), not source. A theme
  // update's deleted/ folder holds plain-text markers named after the removed
  // files, so a removed .js leaves a marker ESLint cannot parse.
  { ignores: ["dist", "dist-electron", "data/**", "themes/*/updates/*/deleted/**"] },
  // Node packages: the Express backend (@widgetizer/builder-server) and the
  // OSS local adapters (@widgetizer/adapters-local).
  {
    files: [
      "packages/builder-server/src/**/*.js",
      "packages/adapters-local/src/**/*.js",
      "scripts/validate-theme.js",
      "scripts/build-theme-skill-contract.js",
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { local },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "local/require-scope-arg": "error",
    },
  },
  // Shared packages (@widgetizer/core) — code consumed by both the React
  // frontend and the Node backend, so allow both global sets. The Node-only
  // builder-server package is linted by the server block above.
  {
    files: ["packages/core/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // @widgetizer/editor-ui — React UI package (shared by both shells). Browser +
  // Node globals; JSX enabled for the components that land in 1.5e. No
  // react-refresh rule (it is a library, not an HMR entry point).
  {
    files: ["packages/editor-ui/src/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __APP_VERSION__: "readonly",
        __APP_NAME__: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: { react: { version: "19.0" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...reactCompilerFindingsAsWarnings,
      ...jsxReferencesTrackedByEslint,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/prop-types": "off",
    },
  },
  // OSS shell (web entry + shared server assembly), Node ESM. Scoped to the
  // top level of app/ — the React frontend shell under app/src/ has its own
  // browser+JSX block below.
  {
    files: ["server.js", "app/*.js"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { local },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "local/require-scope-arg": "error",
    },
  },
  // OSS frontend shell (app/src/) — React, shared by web + Electron. Mirrors the
  // src/** block (browser globals, JSX, react-refresh) now that the shell lives
  // here after the Sprint 1.5f extraction.
  {
    files: ["app/src/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        __APP_VERSION__: "readonly",
        __APP_NAME__: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: { react: { version: "19.0" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...reactCompilerFindingsAsWarnings,
      ...jsxReferencesTrackedByEslint,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/jsx-no-target-blank": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/prop-types": "off",
    },
  },
  // Electron (main process + preload)
  {
    files: ["electron/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser, // preload has access to some browser APIs
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Every linted file. n/no-extraneous-import: each import names a package that
  // its own package.json or the workspace root declares, so nothing works only
  // because another package happens to pull it in.
  { plugins: { n }, rules: { ...mistakeGuards, "n/no-extraneous-import": "error" } },
  { files: ["server.js", "app/server-common.js"], plugins: { n }, rules: devOnlyInProduction() },
  // What the desktop app runs. Its build tooling (*.cjs, builder.config.mjs) may
  // use dev packages; the app gets electron from Electron itself.
  {
    files: ["electron/*.js"],
    ignores: ["**/*.test.js"],
    plugins: { n },
    rules: devOnlyInProduction({ allowModules: ["electron"] }),
  },
  ...["packages/builder-server", "packages/adapters-local", "packages/core", "packages/render-engine"].map(
    devOnlyImportsRefused,
  ),
];
