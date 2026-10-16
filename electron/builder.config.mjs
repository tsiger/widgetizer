const isWinUnsigned = process.env.WIN_UNSIGNED === "1";

// Built by scripts/build-relay.mjs. ${os}/${arch} are electron-builder macros: the mac
// build packs arm64 and x64 in one run, so each needs its own runtime. Not shipped on
// Linux (no MCP support yet).
const relayResources = (nodeBinary) => [
  { from: "build/relay/widgetizer-mcp.mjs", to: "relay/widgetizer-mcp.mjs" },
  { from: "build/relay-runtime/${os}-${arch}/" + nodeBinary, to: "relay/" + nodeBinary },
  { from: "build/mcpb/widgetizer.mcpb", to: "relay/widgetizer.mcpb" },
];

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
    // OSS shell server assembly and its helpers in app/server/ — the only backend
    // files under app/ (the rest of app/ is frontend source already bundled into
    // dist/ by Vite). They compose the @widgetizer/* backend packages, which are
    // bundled via dependencies.
    "app/server-common.js",
    "app/server",
    "!app/server/__tests__/**",
    // Core assets + preview-iframe runtime modules are supplied by
    // @widgetizer/core and ride along via that dependency.
    "themes",
    "!themes/widgetizer/**",
    // Local scratch themes (gitignored) must never ride along into an installer.
    "!themes/__*/**",
    "electron",
    "package.json",
  ],
  asar: true,
  asarUnpack: [
    "themes/**",
    "!themes/widgetizer/**",
    "!themes/__*/**",
    "dist/**",
    // Core placeholder SVGs are served via res.sendFile, which needs real files
    // on disk (not inside the asar).
    "node_modules/@widgetizer/core/src/assets/**",
    // Served raw via express.static(/runtime). previewRuntime.js imports its
    // sibling standalonePreviewTarget.js by relative URL, so every served runtime
    // module must be a real on-disk file (unpacked), not read from inside the asar.
    // Top-level *.js only — __tests__ stays packed.
    "node_modules/@widgetizer/core/src/runtime/*.js",
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
    extraResources: relayResources("node"),
  },
  afterSign: "electron/notarize.cjs",
  linux: {
    maintainer: "Widgetizer <hello@widgetizer.org>",
    // The build script selects one architecture after preparing its native libs.
    target: ["deb"],
    artifactName: "Widgetizer-${version}-${arch}.${ext}",
    category: "Development",
    icon: "electron/resources/icon.icns",
    desktop: { entry: { Name: "Widgetizer Desktop" } },
  },
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
    extraResources: relayResources("node.exe"),
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
