// Generates the extension icons: a white hexagon (the ⬡ brand mark) on the brand
// violet, with 3×3 supersampled edges. Dependency-free PNG encoder.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const VIOLET = [109, 40, 217]; // #6d28d9
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Flat-top regular hexagon vertices (pointy left/right), centred at (cx,cy).
function hexVerts(cx, cy, R) {
  const v = [];
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i); v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return v;
}
function insideHex(px, py, verts) {
  let sign = 0;
  for (let i = 0; i < verts.length; i++) {
    const [ax, ay] = verts[i], [bx, by] = verts[(i + 1) % verts.length];
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cross !== 0) { const s = cross > 0 ? 1 : -1; if (sign === 0) sign = s; else if (s !== sign) return false; }
  }
  return true;
}

function png(size) {
  const cx = size / 2, cy = size / 2;
  const verts = hexVerts(cx, cy, size * 0.40);
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const ro = y * (1 + size * 4);
    raw[ro] = 0; // PNG filter byte (none)
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        if (insideHex(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3, verts)) cov++;
      }
      cov /= 9;
      const o = ro + 1 + x * 4;
      raw[o] = Math.round(VIOLET[0] * (1 - cov) + WHITE[0] * cov);
      raw[o + 1] = Math.round(VIOLET[1] * (1 - cov) + WHITE[1] * cov);
      raw[o + 2] = Math.round(VIOLET[2] * (1 - cov) + WHITE[2] * cov);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("icons", { recursive: true });
for (const s of [16, 48, 128]) writeFileSync(`icons/${s}.png`, png(s));
console.log("hexagon icons written: 16, 48, 128");
