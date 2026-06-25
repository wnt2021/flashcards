// Generates pwa-192.png and pwa-512.png using only built-in Node modules
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(width, height, pixels) {
  // pixels: flat Uint8Array of [R,G,B,A, R,G,B,A, ...] length = width*height*4
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const combined = Buffer.concat([t, data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawRows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  const raw = Buffer.from(rawRows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const pad = size * 0.12;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded background: #6366f1
      const rx = size / 2 - pad, ry = size / 2 - pad;
      const r = size * 0.22; // corner radius
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const inRect = dx <= rx && dy <= ry;
      const inCorner = dx > rx - r && dy > ry - r;
      const inRounded = inRect && (!inCorner || Math.hypot(dx - (rx - r), dy - (ry - r)) <= r);

      if (inRounded) {
        pixels[i]   = 99;  // R  #6366f1
        pixels[i+1] = 102; // G
        pixels[i+2] = 241; // B
        pixels[i+3] = 255;
      } else {
        pixels[i]   = 15;  // dark bg #0f172a
        pixels[i+1] = 23;
        pixels[i+2] = 42;
        pixels[i+3] = 255;
      }

      // White card shape in center
      const cardW = size * 0.36, cardH = size * 0.28;
      const cardR = size * 0.04;
      const cdx = Math.abs(x - cx), cdy = Math.abs(y - (cy - size * 0.04));
      const inCard = cdx <= cardW/2 && cdy <= cardH/2;
      const inCardCorner = cdx > cardW/2 - cardR && cdy > cardH/2 - cardR;
      const inCardRounded = inCard && (!inCardCorner || Math.hypot(cdx - (cardW/2 - cardR), cdy - (cardH/2 - cardR)) <= cardR);

      if (inRounded && inCardRounded) {
        pixels[i] = pixels[i+1] = pixels[i+2] = 255; pixels[i+3] = 255;
      }

      // Small second card offset below-right
      const cdx2 = Math.abs(x - (cx + size*0.06)), cdy2 = Math.abs(y - (cy + size*0.07));
      const inCard2 = cdx2 <= cardW/2 && cdy2 <= cardH/2;
      const inC2corner = cdx2 > cardW/2 - cardR && cdy2 > cardH/2 - cardR;
      const inCard2Rounded = inCard2 && (!inC2corner || Math.hypot(cdx2-(cardW/2-cardR), cdy2-(cardH/2-cardR)) <= cardR);

      if (inRounded && inCard2Rounded && !inCardRounded) {
        pixels[i]   = 180;
        pixels[i+1] = 181;
        pixels[i+2] = 246;
        pixels[i+3] = 255;
      }
    }
  }
  return pixels;
}

const outDir = path.join(__dirname, 'public');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const pixels = generateIcon(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(path.join(outDir, `pwa-${size}.png`), png);
  console.log(`Generated pwa-${size}.png`);
}
