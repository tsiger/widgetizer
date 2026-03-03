const fs = require("fs");
const { spawnSync } = require("child_process");
const path = require("path");

function installMacSharpPackages() {
  const sharpPackagePath = path.join(__dirname, "..", "node_modules", "sharp", "package.json");
  const sharpPackage = JSON.parse(fs.readFileSync(sharpPackagePath, "utf8"));
  const optionalDeps = sharpPackage.optionalDependencies || {};
  const workspaceRoot = path.join(__dirname, "..");
  const archTargets = [
    {
      cpu: "arm64",
      packages: [
        `@img/sharp-darwin-arm64@${optionalDeps["@img/sharp-darwin-arm64"]}`,
        `@img/sharp-libvips-darwin-arm64@${optionalDeps["@img/sharp-libvips-darwin-arm64"]}`,
      ],
    },
    {
      cpu: "x64",
      packages: [
        `@img/sharp-darwin-x64@${optionalDeps["@img/sharp-darwin-x64"]}`,
        `@img/sharp-libvips-darwin-x64@${optionalDeps["@img/sharp-libvips-darwin-x64"]}`,
      ],
    },
  ];

  const currentCpu = process.arch === "arm64" ? "arm64" : "x64";

  for (const target of archTargets) {
    const isCrossArch = target.cpu !== currentCpu;
    const args = [
      "install",
      "--no-save",
      "--os=darwin",
      `--cpu=${target.cpu}`,
      // Force needed to bypass EBADPLATFORM when cross-installing
      ...(isCrossArch ? ["--force"] : []),
      ...target.packages,
    ];

    const result = spawnSync("npm", args, {
      stdio: "inherit",
      cwd: workspaceRoot,
      shell: process.platform === "win32",
    });

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

installMacSharpPackages();
