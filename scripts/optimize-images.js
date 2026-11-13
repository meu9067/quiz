#!/usr/bin/env node
// Compresses every image under public/images into dist/images, as a build
// step between build-static.js's plain copyDir() and the final `dist/`
// output being deployed. The originals in public/images are left untouched
// — this only shrinks the copies that get shipped.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'images');
const DEST_DIR = path.join(__dirname, '..', 'dist', 'images');

const HANDLERS = {
  '.png': (image) => image.png({ compressionLevel: 9, quality: 80 }),
  '.jpg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
  '.jpeg': (image) => image.jpeg({ quality: 80, mozjpeg: true }),
  '.webp': (image) => image.webp({ quality: 80 }),
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

async function optimizeImage(filePath) {
  const relativePath = path.relative(SOURCE_DIR, filePath);
  const destPath = path.join(DEST_DIR, relativePath);
  const ext = path.extname(filePath).toLowerCase();
  const handler = HANDLERS[ext];

  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  if (!handler) {
    // Not a format we know how to compress (e.g. .svg, .gif) — copy as-is.
    fs.copyFileSync(filePath, destPath);
    return;
  }

  const buffer = await handler(sharp(filePath)).toBuffer();
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) return;

  const files = walk(SOURCE_DIR);
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const filePath of files) {
    beforeTotal += fs.statSync(filePath).size;
    await optimizeImage(filePath);
    afterTotal += fs.statSync(path.join(DEST_DIR, path.relative(SOURCE_DIR, filePath))).size;
  }

  const saved = beforeTotal - afterTotal;
  const savedPct = beforeTotal ? ((saved / beforeTotal) * 100).toFixed(1) : '0.0';
  console.log(
    `Optimized ${files.length} images: ${(beforeTotal / 1024).toFixed(0)}KB -> ${(afterTotal / 1024).toFixed(0)}KB (-${savedPct}%)`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
