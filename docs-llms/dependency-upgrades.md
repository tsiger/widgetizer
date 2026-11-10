# Upgrading npm dependencies

What to watch for when upgrading OSS's npm packages. Each point below has caused a real problem.

## Where a package is declared

- **Each workspace declares what it uses.** Packages under `packages/` have their own `package.json`. An app that embeds the builder installs those workspace packages on their own and never reads the root `package.json`, so a bump must land in the workspace that uses the package. The root declares only what the shells (`app/`, `electron/`, `server.js`), the build scripts and the tooling use.
- **Install the root and a workspace in one npm command.** Installing the root first and the workspace second can leave a stale nested copy (for example `packages/editor-ui/node_modules/react-i18next`), and npm keeps restoring it from the lockfile. If that happens, delete that copy's entries from `package-lock.json` and install again.
- **Bump the range along with the lockfile** (`npm update --save`, or `npm install <pkg>@<version>`), so `package.json` states the version that runs.

## What `npm update --save` gets wrong

After every `npm update --save`, check `git diff -- '*package.json'` and restore two things by hand:

- the `@widgetizer/*` references between workspaces, which npm rewrites from `*` to `^0.0.0`;
- `editor-ui`'s `peerDependencies` (`react` and `react-dom` `>=19`, `react-router-dom` `>=7`), which npm narrows to the installed version. Narrow peers would force every app that embeds the editor onto that exact version.

## Versions npm won't pick up on its own

- **`.npmrc` sets `min-release-age=7`.** `npm install` and `npm update` only take versions published more than 7 days ago, so `npm outdated`'s "Latest" can be newer than what installs. `npm ci` ignores the setting. For an urgent fix: `npm install <pkg> --min-release-age=0`.
- **0.x packages.** A caret range on a 0.x version stops at the next minor (`^0.34.0` never takes 0.35), so a routine update skips them. Treat each 0.x minor like a major.
- **Node floor.** Before taking any version, read its `engines` field (`npm view <pkg>@<version> engines`): a minor release can raise its Node floor. OSS requires Node `>=24.22.1`, and the Docker image follows `node:24-slim`. A package needing a newer Node means raising both, or holding the package back.

## Known traps

- **Vite 8 and CommonJS-only packages.** A CommonJS-only package default-imported from an ES module now gets the whole `module.exports` object as its default import. Vitest doesn't reproduce this; only the dev server and the build do. `CodeInput` handles it for `react-simple-code-editor`. After a Vite upgrade, check in the browser that every CommonJS-only package still works.
- **ESLint plugins behind ESLint.** `eslint-plugin-react` hasn't declared support for ESLint 10, so the root `package.json` keeps it working with an `overrides` entry. Remove the entry once the plugin supports the ESLint in use.
- **`liquidjs`.** The theme skill catalog records the installed version. Regenerate it with `node scripts/build-theme-skill-contract.js` (`themeSkill.test.js` fails while it is stale).
- **Packages an embedding app shares with the editor.** `react`, `react-dom`, `react-router-dom`, `zustand`, `i18next` and `react-i18next` must exist once in the embedding app's bundle. Keep their ranges loose and move their majors deliberately.

## Before a major

Read the release notes and migration guide for every version being skipped, in full. Check peer dependencies and `engines`. One commit per package or package group, so an upgrade can be reverted or found with `git bisect`.

## Checks after an upgrade

- `npm run lint:all`, `npm test`, `npm run test:frontend`, `npm run build`, and `npm ls` (no missing or invalid packages).
- Build warnings and the bundle's file list and sizes. A sudden jump often means a second copy of a package, such as two Reacts.
- After a change to a runtime package: export a project before and after the upgrade and compare the output.
- After a change to a native module (`better-sqlite3`, `sharp`), Electron, or the root dependencies: an unsigned packaged build (`npm run electron:build:mac:unsigned`), then the Electron section of [the user test checklist](user-test-checklist.md). After a change to the Dockerfile or Node: its Docker section.
- The checklist's smoke pass ("Test Waves" item 1) in the browser, with the console and network panel open.
