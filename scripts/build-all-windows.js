import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function run(cmd) {
  console.log(`\n\x1b[36m[RUN]\x1b[0m ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

console.log('\x1b[32m=== Starting KwikStore Pro Windows Package Rebuild ===\x1b[0m');

// 1. Generate installer assets (BMP sidebars, headers, license)
console.log('\n\x1b[33m[Step 1/4] Ensuring Installer Assets & Brand Images...\x1b[0m');
run('node scripts/generate-installer-assets.js');

// 2. Build Vite Frontend
console.log('\n\x1b[33m[Step 2/4] Building Frontend UI Bundle (Vite)...\x1b[0m');
run('npm run build');

// 3. Build Windows 7 / 8 Legacy Edition (x64 and ia32)
console.log('\n\x1b[33m[Step 3/4] Building Windows 7 / 8 Legacy Edition (Electron 22)...\x1b[0m');
run('npm install better-sqlite3@9.6.0');
run('npx electron-builder --win --config electron-builder.win7.json');

// 4. Build Windows 10 / 11 Modern Edition (x64 and ia32)
console.log('\n\x1b[33m[Step 4/4] Building Windows 10 / 11 Modern Edition (Electron 33)...\x1b[0m');
run('npm install better-sqlite3@11.8.1');
run('npx electron-builder --win --config electron-builder.win10.json');

console.log('\n\x1b[32m=== All Windows 7 and Windows 10/11 Installers Built Successfully! ===\x1b[0m\n');
