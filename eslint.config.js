import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import requireScopeArg from "./eslint-rules/require-scope-arg.js";

// Local-only plugin housing repo-specific lint rules.
const local = { rules: { "require-scope-arg": requireScopeArg } };

export default [
  { ignores: ["dist", "dist-electron"] },
  // Frontend (React) - src/, components, pages, etc.
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        __APP_VERSION__: "readonly",
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
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react/jsx-no-target-blank": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/prop-types": "off",
    },
  },
  // Node packages: the Express backend (@widgetizer/builder-server) and the
  // OSS local adapters (@widgetizer/adapters-local).
  {
    files: [
      "packages/builder-server/src/**/*.js",
      "packages/adapters-local/src/**/*.js",
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
];
