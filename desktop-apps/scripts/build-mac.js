/**
 * Build script for macOS portable distribution
 * Creates the complete app bundle structure
 *
 * Run from project root: npm run build:macos
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const version = packageJson.version;
const buildName = `widgetizer-v${version}`;
const outputDir = path.join(rootDir, "desktop-apps", "builds", "macos", buildName);

console.log(`\n🍎 Building Widgetizer v${version} for macOS\n`);

// Step 1: Clean and create output directory
console.log("📁 Creating build directory...");
fs.removeSync(outputDir);
fs.ensureDirSync(outputDir);

// Step 2: Copy dist (frontend build)
console.log("📦 Copying frontend build...");
const distSrc = path.join(rootDir, "dist");
if (!fs.existsSync(distSrc)) {
  console.error('❌ Error: dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}
fs.copySync(distSrc, path.join(outputDir, "dist"));

// Step 3: Copy server
console.log("📦 Copying server...");
fs.copySync(path.join(rootDir, "server"), path.join(outputDir, "server"));

// Step 4: Copy required src folders
console.log("📦 Copying core modules...");
fs.ensureDirSync(path.join(outputDir, "src"));
["core", "utils", "config"].forEach((folder) => {
  const srcPath = path.join(rootDir, "src", folder);
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, path.join(outputDir, "src", folder));
  }
});

// Step 5: Copy themes
console.log("📦 Copying themes...");
fs.copySync(path.join(rootDir, "themes"), path.join(outputDir, "themes"));

// Step 6: Create data directory structure
console.log("📁 Creating data directories...");
fs.ensureDirSync(path.join(outputDir, "data", "projects"));

// Step 7: Create bin/node placeholder
console.log("📁 Creating Node.js placeholder...");
fs.ensureDirSync(path.join(outputDir, "bin", "node"));
fs.writeFileSync(
  path.join(outputDir, "bin", "node", "README.txt"),
  'Place the Node.js binary here.\n\nDownload from: https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-arm64.tar.gz\nOr for Intel: https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-x64.tar.gz\n\nExtract and copy the "node" binary to this folder.\n',
);

// Step 8: Create production package.json
console.log("📝 Creating production package.json...");
const prodPackageJson = {
  name: "widgetizer",
  version: version,
  type: "module",
  main: "server/index.js",
  scripts: {
    start: "node server/index.js",
  },
  dependencies: packageJson.dependencies,
};
fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify(prodPackageJson, null, 2));

// Step 9: Copy package-lock.json
console.log("📝 Copying package-lock.json...");
if (fs.existsSync(path.join(rootDir, "package-lock.json"))) {
  fs.copySync(path.join(rootDir, "package-lock.json"), path.join(outputDir, "package-lock.json"));
}

// Step 10: Create .env.example
console.log("📝 Creating .env.example...");
fs.writeFileSync(path.join(outputDir, ".env.example"), "NODE_ENV=production\nPORT=3001\n");

// Step 11: Create node_modules placeholder
fs.ensureDirSync(path.join(outputDir, "node_modules"));
fs.writeFileSync(path.join(outputDir, "node_modules", ".gitkeep"), "");

// Summary
console.log("\n✅ Build structure created!\n");
console.log(`📍 Output: ${outputDir}\n`);
console.log("Next steps:");
console.log("1. Download Node.js for macOS:");
console.log("   ARM64: https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-arm64.tar.gz");
console.log("   Intel: https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-x64.tar.gz");
console.log('2. Extract and copy "node" binary to: bin/node/');
console.log("3. Install dependencies: ./bin/node/node $(which npm) ci --omit=dev");
console.log("4. Build the menu bar app: cd desktop-apps/tray-app/macos && ./build.sh");
console.log("5. Copy WidgetizerMenu.app to the build folder");
console.log("6. Create .env file with production settings");
console.log("7. Test the build!");
console.log("");
