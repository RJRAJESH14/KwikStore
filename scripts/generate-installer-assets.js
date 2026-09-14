import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to write 24-bit uncompressed Windows BMP
function createBmpBuffer(width, height, pixelFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;

  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0); // Signature
  buf.writeUInt32LE(fileSize, 2); // File size
  buf.writeUInt16LE(0, 6); // Reserved 1
  buf.writeUInt16LE(0, 8); // Reserved 2
  buf.writeUInt32LE(54, 10); // Pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14); // Header size
  buf.writeInt32LE(width, 18); // Width
  buf.writeInt32LE(height, 22); // Height
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
  buf.writeUInt32LE(0, 30); // Compression (BI_RGB = 0)
  buf.writeUInt32LE(imageSize, 34); // Image size
  buf.writeInt32LE(2835, 38); // X pixels per meter (~72 DPI)
  buf.writeInt32LE(2835, 42); // Y pixels per meter
  buf.writeUInt32LE(0, 46); // Total colors
  buf.writeUInt32LE(0, 50); // Important colors

  // Pixel data (bottom-to-top, BGR order)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // flip vertically for BMP
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, srcY, width, height);
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = b;     // Blue
      buf[pxOffset + 1] = g; // Green
      buf[pxOffset + 2] = r; // Red
    }
  }

  return buf;
}

// 1. Generate Sidebar BMP (164 x 314)
// Professional deep slate/navy (#0f172a to #1e293b) gradient with emerald accent (#10b981 / #059669) banner
function generateSidebar() {
  const width = 164;
  const height = 314;

  const buf = createBmpBuffer(width, height, (x, y, w, h) => {
    const t = y / h;
    
    // Top emerald badge strip (y from 0 to 4)
    if (y < 4) {
      return [16, 185, 129]; // Emerald #10b981
    }

    // Vertical linear gradient from deep navy to slate
    let r = Math.round(15 * (1 - t) + 30 * t);
    let g = Math.round(23 * (1 - t) + 41 * t);
    let b = Math.round(42 * (1 - t) + 59 * t);

    // Diagonal glow / ambient light in the center
    const cx = w * 0.5;
    const cy = h * 0.38;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < 60) {
      const glow = (1 - dist / 60) * 0.35;
      r = Math.min(255, Math.round(r + 16 * glow + 10));
      g = Math.min(255, Math.round(g + 185 * glow));
      b = Math.min(255, Math.round(b + 129 * glow + 20));
    }

    // Accent store icon / badge in upper center
    // Draw rounded shopping bag / pos cart symbol (y: 80 to 140, x: 52 to 112)
    if (x >= 52 && x <= 112 && y >= 80 && y <= 140) {
      const relX = x - 52;
      const relY = y - 80;
      // Outer card box
      if (relX >= 4 && relX <= 56 && relY >= 14 && relY <= 56) {
        // Emerald gradient box
        const boxT = relY / 56;
        r = Math.round(5 * (1 - boxT) + 16 * boxT);
        g = Math.round(150 * (1 - boxT) + 185 * boxT);
        b = Math.round(105 * (1 - boxT) + 129 * boxT);
      }
      // Handle arch
      const hx = relX - 30;
      const hy = relY - 14;
      const hDist = Math.hypot(hx, hy);
      if (hDist >= 12 && hDist <= 16 && relY <= 14) {
        r = 255; g = 255; b = 255;
      }
    }

    // Decorative divider line at y = 190
    if (y === 190 && x >= 24 && x <= 140) {
      return [16, 185, 129];
    }

    // Bottom accent strip
    if (y >= h - 4) {
      return [5, 150, 105]; // Darker emerald #059669
    }

    return [r, g, b];
  });

  const outPath = path.join(__dirname, '..', 'build', 'installerSidebar.bmp');
  fs.writeFileSync(outPath, buf);
  console.log('Generated:', outPath, `(${buf.length} bytes)`);
}

// 2. Generate Header BMP (150 x 57)
// Clean minimalist header graphic for the top-right wizard banner
function generateHeader() {
  const width = 150;
  const height = 57;

  const buf = createBmpBuffer(width, height, (x, y, w, h) => {
    const t = x / w;
    // Gradient from transparent/light right-aligned badge
    let r = Math.round(248 * (1 - t) + 241 * t);
    let g = Math.round(250 * (1 - t) + 245 * t);
    let b = Math.round(252 * (1 - t) + 249 * t);

    // Right side accent cart/store mini icon (x: 105 to 135, y: 12 to 45)
    if (x >= 105 && x <= 135 && y >= 12 && y <= 45) {
      const relX = x - 105;
      const relY = y - 12;
      if (relX >= 3 && relX <= 27 && relY >= 8 && relY <= 30) {
        r = 16; g = 185; b = 129; // Emerald #10b981
      }
    }

    // Bottom line
    if (y === h - 1) {
      r = 226; g = 232; b = 240;
    }

    return [r, g, b];
  });

  const outPath = path.join(__dirname, '..', 'build', 'installerHeader.bmp');
  fs.writeFileSync(outPath, buf);
  console.log('Generated:', outPath, `(${buf.length} bytes)`);
}

generateSidebar();
generateHeader();
// Copy uninstaller sidebar as well
const sidebarPath = path.join(__dirname, '..', 'build', 'installerSidebar.bmp');
const uninstallerSidebarPath = path.join(__dirname, '..', 'build', 'uninstallerSidebar.bmp');
fs.copyFileSync(sidebarPath, uninstallerSidebarPath);
console.log('Generated:', uninstallerSidebarPath);
