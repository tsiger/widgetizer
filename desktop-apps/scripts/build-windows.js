import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const ROOT = path.resolve(__dirname, '..', '..'); // widgetizer/
const DESKTOP_APPS = path.resolve(__dirname, '..'); // desktop-apps/

// Get version from package.json
let packageJson = await fs.readJson(path.join(ROOT, 'package.json'));
const version = packageJson.version;
const OUTPUT_DIR = path.join(DESKTOP_APPS, 'builds', 'windows', `widgetizer-v${version}`);

console.log(`🚀 Building Widgetizer for Windows (v${version})...\n`);
console.log(`📂 Root: ${ROOT}`);
console.log(`📂 Output: ${OUTPUT_DIR}\n`);

// Step 1: Clean previous build
console.log('🧹 Cleaning previous build...');
await fs.remove(OUTPUT_DIR);
await fs.ensureDir(OUTPUT_DIR);

// Step 2: Copy backend
console.log('📦 Copying server files...');
await fs.copy(
  path.join(ROOT, 'server'),
  path.join(OUTPUT_DIR, 'server')
);

// Step 3: Copy frontend build
console.log('🎨 Copying frontend build...');
if (!await fs.pathExists(path.join(ROOT, 'dist'))) {
  console.error('❌ Frontend not built! Run: npm run build');
  process.exit(1);
}
await fs.copy(
  path.join(ROOT, 'dist'),
  path.join(OUTPUT_DIR, 'dist')
);

// Step 4: Copy src/core (backend dependencies)
console.log('⚙️  Copying src/core (Liquid tags, filters, widgets)...');
await fs.copy(
  path.join(ROOT, 'src', 'core'),
  path.join(OUTPUT_DIR, 'src', 'core')
);

// Step 5: Copy src/utils (helper functions)
console.log('🔧 Copying src/utils...');
await fs.copy(
  path.join(ROOT, 'src', 'utils'),
  path.join(OUTPUT_DIR, 'src', 'utils')
);

// Step 6: Copy src/config (configuration files)
console.log('📋 Copying src/config...');
await fs.copy(
  path.join(ROOT, 'src', 'config'),
  path.join(OUTPUT_DIR, 'src', 'config')
);

// Step 7: Copy themes
console.log('🎭 Copying themes...');
await fs.copy(
  path.join(ROOT, 'themes'),
  path.join(OUTPUT_DIR, 'themes')
);

// Step 8: Copy package.json (production only)
console.log('📄 Creating production package.json...');
packageJson = await fs.readJson(path.join(ROOT, 'package.json'));
const prodPackage = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  scripts: {
    start: packageJson.scripts.start
  },
  dependencies: packageJson.dependencies
};
await fs.writeJson(
  path.join(OUTPUT_DIR, 'package.json'),
  prodPackage,
  { spaces: 2 }
);

// Step 9: Copy package-lock.json
console.log('🔒 Copying package-lock.json...');
if (await fs.pathExists(path.join(ROOT, 'package-lock.json'))) {
  await fs.copy(
    path.join(ROOT, 'package-lock.json'),
    path.join(OUTPUT_DIR, 'package-lock.json')
  );
  console.log('✅ package-lock.json copied (npm ci will work)');
} else {
  console.warn('⚠️  No package-lock.json found - npm install will be needed instead of npm ci');
}

// Step 10: Create empty data folder
console.log('📁 Creating data folder...');
await fs.ensureDir(path.join(OUTPUT_DIR, 'data', 'projects'));

// Step 11: Copy .env.example (if exists)
console.log('⚙️  Copying config files...');
if (await fs.pathExists(path.join(ROOT, '.env.example'))) {
  await fs.copy(
    path.join(ROOT, '.env.example'),
    path.join(OUTPUT_DIR, '.env.example')
  );
}

// Step 12: Create bin/node folder structure
console.log('📁 Creating Node.js folder structure...');
await fs.ensureDir(path.join(OUTPUT_DIR, 'bin', 'node'));

console.log('\n✅ Build structure created!');
console.log(`📂 Output: ${OUTPUT_DIR}\n`);
console.log('⚠️  Next steps:');
console.log('1. Download: https://nodejs.org/dist/v22.13.0/node-v22.13.0-win-x64.zip');
console.log(`2. Extract to: ${path.join(OUTPUT_DIR, 'bin', 'node')}`);
console.log(`3. Run: cd "${OUTPUT_DIR}" && bin\\node\\npm.cmd ci --omit=dev`);
console.log('4. Build & copy WidgetizerTray.exe');