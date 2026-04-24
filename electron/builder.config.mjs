const isWinUnsigned = process.env.WIN_UNSIGNED === "1";

export default {
  appId: "com.widgetizer.app",
  productName: "Widgetizer",
  npmRebuild: false,
  directories: {
    output: "dist-electron",
    buildResources: "electron/resources",
  },
  files: ["dist", "server", "src/core", "src/utils", "src/locales", "themes", "electron", "package.json"],
  asar: true,
  asarUnpack: [
    "themes/**",
    "dist/**",
    "src/core/assets/**",
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
