// Renders the SolarFlow PWA home-screen icons from the brand sun mark
// (src/assets/solarflow-logo-blue.svg: amber ring r=23, eight round-capped
// rays from 41 to 51 units out, stroke width 7; drawn at 9 here). Pure Node, no dependencies:
// shapes are drawn analytically with supersampled anti-aliasing and encoded
// as PNG via node:zlib.
//
//   node scripts/generate-pwa-icons.mjs
//
// Output (committed, so the build does not need to run this):
//   public/icons/icon-192.png            purpose "any"      (rounded tile, transparent corners)
//   public/icons/icon-512.png            purpose "any"
//   public/icons/icon-maskable-512.png   purpose "maskable" (full bleed, art inside 80% safe zone)
//   public/icons/apple-touch-icon-180.png  opaque, iOS rounds it
//   public/apple-touch-icon.png          copy of the 180px icon

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

const AMBER = [0xff, 0x8a, 0x00];
const TILE = [0xff, 0xff, 0xff];

// Sun geometry in logo units, centred on (0, 0).
const RING_R = 23;
// Stroke is a little heavier than the logo (7) so the mark reads at 48px.
const HALF_STROKE = 4.5;
const RAY_IN = 41;
const RAY_OUT = 51;
const SUN_EXTENT = RAY_OUT + HALF_STROKE; // 55.5

const rays = [];
for (let i = 0; i < 8; i += 1) {
  const a = (i * Math.PI) / 4;
  const c = Math.cos(a);
  const s = Math.sin(a);
  rays.push([c * RAY_IN, s * RAY_IN, c * RAY_OUT, s * RAY_OUT]);
}

function distToSegment(px, py, [ax, ay, bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inSun(x, y) {
  if (Math.abs(Math.hypot(x, y) - RING_R) <= HALF_STROKE) return true;
  return rays.some(ray => distToSegment(x, y, ray) <= HALF_STROKE);
}

function inRoundedSquare(x, y, half, radius) {
  const qx = Math.abs(x) - (half - radius);
  const qy = Math.abs(y) - (half - radius);
  if (qx <= 0 || qy <= 0) return Math.abs(x) <= half && Math.abs(y) <= half;
  return Math.hypot(qx, qy) <= radius;
}

/**
 * @param {number} size        output px
 * @param {number} sunRadius   sun's outer extent as a fraction of size
 * @param {number|null} tileRadius  null = full-bleed opaque tile; else corner radius fraction
 * @param {number} tileInset   tile half-size as a fraction of size (only for rounded tiles)
 */
function render(size, { sunRadius, tileRadius = null, tileInset = 0.5 }) {
  const SS = 5; // 5x5 supersampling
  const scale = (sunRadius * size) / SUN_EXTENT; // px per logo unit
  const half = size / 2;
  const opaque = tileRadius === null;
  const channels = opaque ? 3 : 4;
  const pixels = Buffer.alloc(size * size * channels);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let sun = 0;
      let tile = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const x = px + (sx + 0.5) / SS - half;
          const y = py + (sy + 0.5) / SS - half;
          const onTile = opaque || inRoundedSquare(x, y, tileInset * size, tileRadius * size);
          if (!onTile) continue;
          tile += 1;
          if (inSun(x / scale, y / scale)) sun += 1;
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * channels;
      if (opaque) {
        const t = sun / n;
        for (let c = 0; c < 3; c += 1) pixels[o + c] = Math.round(TILE[c] * (1 - t) + AMBER[c] * t);
      } else {
        const alpha = tile / n;
        const t = tile ? sun / tile : 0;
        for (let c = 0; c < 3; c += 1) pixels[o + c] = alpha ? Math.round(TILE[c] * (1 - t) + AMBER[c] * t) : 0;
        pixels[o + 3] = Math.round(alpha * 255);
      }
    }
  }
  return encodePng(size, size, pixels, channels);
}

// ---- PNG encoding ---------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function encodePng(width, height, pixels, channels) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  const candidate = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y ? pixels.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    let bestFilter = 0;
    let bestScore = Infinity;
    let best = null;
    // Pick the filter with the smallest sum of absolute residuals per row.
    for (let f = 0; f < 5; f += 1) {
      let score = 0;
      for (let i = 0; i < stride; i += 1) {
        const a = i >= channels ? row[i - channels] : 0;
        const b = prev[i];
        const c = i >= channels ? prev[i - channels] : 0;
        const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][f];
        const v = (row[i] - pred) & 0xff;
        candidate[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = f;
        best = Buffer.from(candidate);
      }
    }
    const o = y * (stride + 1);
    raw[o] = bestFilter;
    best.copy(raw, o + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = channels === 4 ? 6 : 2; // RGBA or RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Output ---------------------------------------------------------------

mkdirSync(outDir, { recursive: true });

// "any": white rounded tile (full canvas, ~22% corner radius) so the amber
// sun stays visible on dark launchers and desktop docks.
const anyIcon = { sunRadius: 0.38, tileRadius: 0.22, tileInset: 0.5 };
// "maskable": full bleed; sun extent 0.33 of size keeps it well inside the
// 80% safe-zone circle (radius 0.40), even under circular masks.
const maskable = { sunRadius: 0.33 };
// Apple: opaque full bleed; iOS applies its own corner rounding.
const apple = { sunRadius: 0.38 };

const outputs = [
  ['icon-192.png', 192, anyIcon],
  ['icon-512.png', 512, anyIcon],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon-180.png', 180, apple],
];

for (const [name, size, opts] of outputs) {
  const png = render(size, opts);
  writeFileSync(join(outDir, name), png);
  console.log(`${name}  ${size}x${size}  ${png.length} bytes`);
}
copyFileSync(join(outDir, 'apple-touch-icon-180.png'), join(root, 'public', 'apple-touch-icon.png'));
console.log('apple-touch-icon.png  (copy of apple-touch-icon-180.png)');
