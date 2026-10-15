const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const workspaceRoot = path.join(__dirname, "..");
const sharp = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "node_modules/sharp/package.json"), "utf8"));
const packages = ["x64", "arm64"].flatMap((arch) =>
  [`@img/sharp-linux-${arch}`, `@img/sharp-libvips-linux-${arch}`].map((name) => {
    const version = sharp.optionalDependencies?.[name];
    if (!version) throw new Error(`Installed Sharp does not declare ${name}`);
    return `${name}@${version}`;
  }),
);

// Resolve only these prebuilt packages in a temporary project. Installing them
// in the workspace can prune another architecture or re-resolve unrelated deps.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "widgetizer-linux-sharp-"));
let exitCode = 0;
try {
  fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify({ private: true }));
  const result = spawnSync("npm", [
    "install", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund", "--force", "--os=linux", ...packages,
  ], { cwd: temp, stdio: "inherit" });
  exitCode = result.status ?? 1;
  if (exitCode === 0) {
    for (const spec of packages) {
      const name = spec.slice(0, spec.lastIndexOf("@"));
      const destination = path.join(workspaceRoot, "node_modules", name);
      fs.rmSync(destination, { recursive: true, force: true });
      fs.cpSync(path.join(temp, "node_modules", name), destination, { recursive: true });
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
process.exit(exitCode);
