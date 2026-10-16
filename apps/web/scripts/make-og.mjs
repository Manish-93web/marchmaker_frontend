// Generates a plain brand-gradient 1200x630 PNG (no text) for social previews. Replace with designed artwork.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 1200;
const H = 630;
const from = [0x4a, 0x1d, 0x3f];
const to = [0xe2, 0x72, 0x5b];
const accent = [0xf2, 0xa3, 0x3a];

const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const t = (x / W) * 0.6 + (y / H) * 0.4;
    const glow = Math.max(0, 1 - Math.hypot((x - W * 0.85) / (W * 0.45), (y - H * 0.1) / (H * 0.8)));
    const o = y * (W * 3 + 1) + 1 + x * 3;
    for (let c = 0; c < 3; c++) {
      const base = from[c] + (to[c] - from[c]) * t * t;
      raw[o + c] = Math.min(255, Math.round(base + (accent[c] - base) * glow * 0.55));
    }
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/og-default.png', import.meta.url), png);
console.log(`og-default.png ${png.length} bytes`);
