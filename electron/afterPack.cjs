const fs = require("fs");
const path = require("path");

/**
 * electron-builder afterPack hook.
 *
 * Problem: electron-builder re-installs dependencies during packaging,
 * which triggers better-sqlite3's prebuild-install to download a prebuilt
 * binary for the system Node.js instead of Electron's Node.js.
 *
 * Solution: After packaging, overwrite the binary with the one that
 * @electron/rebuild compiled for Electron (run earlier in the build script).
 */
exports.default = async function afterPack(context) {
  const binaryName = "better_sqlite3.node";
  const relativePath = path.join(
    "node_modules",
    "better-sqlite3",
    "build",
    "Release",
    binaryName,
  );

  // Source: the binary rebuilt by @electron/rebuild in the project root
  const src = path.join(__dirname, "..", relativePath);

  // Destination: the unpacked binary in the packaged app
  const dest = path.join(
    context.appOutDir,
    "resources",
    "app.asar.unpacked",
    relativePath,
  );

  if (!fs.existsSync(src)) {
    console.warn(`afterPack: Source binary not found at ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    console.warn(`afterPack: Destination path not found at ${dest}`);
    return;
  }

  const srcSize = fs.statSync(src).size;
  const destSize = fs.statSync(dest).size;

  console.log(`afterPack: Replacing better-sqlite3 native binary`);
  console.log(`  packaged binary: ${destSize} bytes (system Node)`);
  console.log(`  rebuilt binary:  ${srcSize} bytes (Electron)`);

  fs.copyFileSync(src, dest);
  console.log(`afterPack: Done`);
};
