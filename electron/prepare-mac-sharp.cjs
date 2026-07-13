const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

function installMacSharpPackages() {
  const sharpPackagePath = path.join(__dirname, "..", "node_modules", "sharp", "package.json");
  const sharpPackage = JSON.parse(fs.readFileSync(sharpPackagePath, "utf8"));
  const optionalDeps = sharpPackage.optionalDependencies || {};
  const workspaceRoot = path.join(__dirname, "..");

  // Both macOS arches must end up in node_modules so electron-builder can
  // package universal/per-arch apps. They MUST be installed in a SINGLE npm
  // invocation: a second `npm install` of the other arch treats the first
  // arch's (--no-save, so extraneous-looking) binaries as prunable and removes
  // them, leaving node_modules with only the last-installed arch — which then
  // fails to load sharp in a packaged app of the other arch.
  const packages = [
    `@img/sharp-darwin-arm64@${optionalDeps["@img/sharp-darwin-arm64"]}`,
    `@img/sharp-libvips-darwin-arm64@${optionalDeps["@img/sharp-libvips-darwin-arm64"]}`,
    `@img/sharp-darwin-x64@${optionalDeps["@img/sharp-darwin-x64"]}`,
    `@img/sharp-libvips-darwin-x64@${optionalDeps["@img/sharp-libvips-darwin-x64"]}`,
  ];

  const result = spawnSync(
    "npm",
    [
      "install",
      "--no-save",
      // --force bypasses EBADPLATFORM for the non-host arch; requesting all
      // four explicitly in one command keeps npm from pruning any of them.
      "--force",
      "--os=darwin",
      ...packages,
    ],
    {
      stdio: "inherit",
      cwd: workspaceRoot,
      shell: process.platform === "win32",
    },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

installMacSharpPackages();
