const isWinUnsigned = process.env.WIN_UNSIGNED === "1";

export default {
  appId: "com.widgetizer.app",
  productName: "Widgetizer",
  npmRebuild: false,
  directories: {
    output: "dist-electron",
    buildResources: "electron/resources",
  },
  files: [
    "dist",
    "server",
    // OSS shell server assembly — the only backend file under app/ (the rest of
    // app/ is frontend source already bundled into dist/ by Vite). It composes
    // the @widgetizer/* backend packages, which are bundled via dependencies.
    "app/server-common.js",
    // src/core data dirs (widgets/snippets/assets) moved into @widgetizer/core
    // in Sprint 1.6 — they ride along via the @widgetizer/core dependency.
    "src/utils",
    "themes",
    "!themes/widgetizer/**",
    "electron",
    "package.json",
  ],
  asar: true,
  asarUnpack: [
    "themes/**",
    "!themes/widgetizer/**",
    "dist/**",
    // Core placeholder SVGs are served via res.sendFile, which needs real files
    // on disk (not inside the asar). They live in @widgetizer/core since 1.6.
    "node_modules/@widgetizer/core/src/assets/**",
    "src/utils/previewRuntime.js",
    "node_modules/sharp/**",
    "node_modules/@img/sharp-*/**",
    "node_modules/@img/sharp-libvips-*/**",
    "node_modules/better-sqlite3/**",
  ],
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["arm64", "x64"],
      },
      {
        target: "zip",
        arch: ["arm64", "x64"],
      },
    ],
    category: "public.app-category.productivity",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "electron/entitlements.mac.plist",
    entitlementsInherit: "electron/entitlements.mac.plist",
  },
  afterSign: "electron/notarize.cjs",
  publish: {
    provider: "github",
    owner: "tsiger",
    repo: "widgetizer",
  },
  win: {
    artifactName: "Widgetizer-Setup-${version}.${ext}",
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    ...(isWinUnsigned
      ? {}
      : {
          signtoolOptions: {
            signingHashAlgorithms: ["sha256"],
            certificateSubjectName: "Open Source Developer Gerasimos Tsiamalos",
            rfc3161TimeStampServer: "http://time.certum.pl",
          },
        }),
  },
};
