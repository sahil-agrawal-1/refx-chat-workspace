/**
 * Generate a Windows .ico app icon from src assets/app_logo.svg.
 *
 * This script rasterizes the two white SVG paths onto a transparent canvas
 * at multiple sizes (16, 32, 48, 256), encodes each as a PNG, and wraps
 * them into a single multi-image .ico file at build/icon.ico.
 *
 * No external image libraries are used — PNG and ICO are written from
 * scratch using only Node.js built-ins (zlib for PNG compression).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Minimal SVG path parser + rasterizer
// ---------------------------------------------------------------------------

// Parse the 'd' attribute into a list of commands.
// Each command: { type: 'M'|'L'|'C'|'Z', args: number[] }
function parsePath(d) {
  const tokens = d.match(/[MLCZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/gi);
  const cmds = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L' || t === 'C' || t === 'Z') {
      cmds.push({ type: t, args: [] });
      i++;
    } else {
      // Numeric token — belongs to the most recent command
      const last = cmds[cmds.length - 1];
      if (last) {
        last.args.push(parseFloat(t));
      }
      i++;
    }
  }
  return cmds;
}

// Adaptive cubic bezier subdivision into line segments.
function bezierToLineSegments(p0, p1, p2, p3, depth = 0, maxDepth = 6) {
  // Approximate flatness: distance of control points from the chord p0->p3
  const ax = p3.x - p0.x;
  const ay = p3.y - p0.y;
  const d1 = Math.abs((p1.x - p0.x) * ay - (p1.y - p0.y) * ax);
  const d2 = Math.abs((p2.x - p0.x) * ay - (p2.y - p0.y) * ax);
  const maxDist = Math.max(d1, d2) / (Math.sqrt(ax * ax + ay * ay) || 1);

  if (depth >= maxDepth || maxDist < 0.5) {
    return [{ x: p0.x, y: p0.y }, { x: p3.x, y: p3.y }];
  }

  // De Casteljau split at t=0.5
  const pa = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const pb = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const pc = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
  const pd = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
  const pe = { x: (pb.x + pc.x) / 2, y: (pb.y + pc.y) / 2 };
  const pf = { x: (pd.x + pe.x) / 2, y: (pd.y + pe.y) / 2 };

  const left = bezierToLineSegments(p0, pa, pd, pf, depth + 1, maxDepth);
  const right = bezierToLineSegments(pf, pe, pc, p3, depth + 1, maxDepth);
  // left ends at pf, right starts at pf — skip duplicate
  return left.slice(0, -1).concat(right);
}

// Convert parsed path commands into a flat list of line segments.
function pathToSegments(cmds) {
  const segments = [];
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };

  for (const cmd of cmds) {
    const a = cmd.args;
    if (cmd.type === 'M') {
      current = { x: a[0], y: a[1] };
      start = { x: current.x, y: current.y };
    } else if (cmd.type === 'L') {
      segments.push({ from: current, to: { x: a[0], y: a[1] } });
      current = { x: a[0], y: a[1] };
    } else if (cmd.type === 'C') {
      const segs = bezierToLineSegments(
        current,
        { x: a[0], y: a[1] },
        { x: a[2], y: a[3] },
        { x: a[4], y: a[5] }
      );
      for (let k = 0; k < segs.length - 1; k++) {
        segments.push({ from: segs[k], to: segs[k + 1] });
      }
      current = { x: a[4], y: a[5] };
    } else if (cmd.type === 'Z') {
      segments.push({ from: current, to: start });
      current = { x: start.x, y: start.y };
    }
  }
  return segments;
}

// Even-odd fill: for a given y, find x-intersections with all segments,
// sort, and fill between pairs.
function computeFilledXAtY(segments, y) {
  const xs = [];
  for (const seg of segments) {
    const y0 = seg.from.y;
    const y1 = seg.to.y;
    if (y0 === y1) continue; // horizontal edge
    const ymin = Math.min(y0, y1);
    const ymax = Math.max(y0, y1);
    if (y < ymin || y >= ymax) continue;
    const t = (y - ymin) / (ymax - ymin);
    const x = seg.from.x + t * (seg.to.x - seg.from.x);
    xs.push(x);
  }
  xs.sort((a, b) => a - b);
  return xs;
}

// ---------------------------------------------------------------------------
// PNG encoder
// ---------------------------------------------------------------------------

function crc32(buf, start, end) {
  // Simple CRC32 table-based implementation
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf, 4, 4 + len);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA (width * height * 4)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Filter each scanline (filter type 0 = none) and prepend filter byte
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0; // filter type: none
    pixels.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });

  const idat = writeChunk('IDAT', compressed);
  const iend = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, writeChunk('IHDR', ihdr), idat, iend]);
}

// ---------------------------------------------------------------------------
// ICO encoder
// ---------------------------------------------------------------------------

function encodeIco(images) {
  // images: [{ width, height, pngBuffer }]
  const count = images.length;
  const header = Buffer.alloc(6);
  // reserved
  header.writeUInt16LE(0, 0);
  // type: 1 = icon
  header.writeUInt16LE(1, 2);
  // count
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirs = [];
  const imagePayloads = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.width >= 256 ? 0 : img.width;   // width (0 = 256)
    entry[1] = img.height >= 256 ? 0 : img.height; // height (0 = 256)
    entry[2] = 0; // color count
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4);  // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(img.pngBuffer.length, 8); // bytes in res
    entry.writeUInt32LE(offset, 12); // image offset
    dirs.push(entry);
    imagePayloads.push(img.pngBuffer);
    offset += img.pngBuffer.length;
  }

  const parts = [header, ...dirs, ...imagePayloads];
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const svgPath = path.resolve('public/assets/app_logo.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract the two <path d="..." /> strings
const pathMatches = svgContent.match(/d="([^"]+)"/g);
if (!pathMatches || pathMatches.length < 2) {
  console.error('Could not find two path elements in SVG');
  process.exit(1);
}

const allSegments = [];
for (const m of pathMatches) {
  const d = m.slice(3, -1); // strip d=" and "
  const cmds = parsePath(d);
  const segs = pathToSegments(cmds);
  allSegments.push(...segs);
}

// Compute bounding box of all segments
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const seg of allSegments) {
  for (const p of [seg.from, seg.to]) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
}

const svgW = maxX - minX;
const svgH = maxY - minY;

// Normalize segments into [0,1] coordinate space
const normSegments = allSegments.map((seg) => ({
  from: {
    x: (seg.from.x - minX) / svgW,
    y: (seg.from.y - minY) / svgH,
  },
  to: {
    x: (seg.to.x - minX) / svgW,
    y: (seg.to.y - minY) / svgH,
  },
}));

const sizes = [16, 32, 48, 256];
const images = [];

for (const size of sizes) {
  const W = size;
  const H = size;
  const pixels = Buffer.alloc(W * H * 4, 0); // transparent black

  const scale = Math.min(W, H) / 1.0; // normalize to unit square
  const offsetX = (W - scale) / 2;
  const offsetY = (H - scale) / 2;

  // Rasterize each scanline
  for (let y = 0; y < H; y++) {
    // Map pixel center to normalized [0,1] Y
    const ny = (y + 0.5 - offsetY) / scale;
    const xs = computeFilledXAtY(normSegments, ny);
    // Fill between pairs (even-odd rule)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xStart = Math.max(0, Math.ceil((xs[k] * scale + offsetX) - 0.5));
      const xEnd = Math.min(W - 1, Math.floor((xs[k + 1] * scale + offsetX) + 0.5));
      for (let x = xStart; x <= xEnd; x++) {
        const idx = (y * W + x) * 4;
        pixels[idx] = 255;     // R
        pixels[idx + 1] = 255; // G
        pixels[idx + 2] = 255; // B
        pixels[idx + 3] = 255; // A (white logo)
      }
    }
  }

  const png = encodePNG(W, H, pixels);
  images.push({ width: W, height: H, pngBuffer: png });
  console.log(`Rendered ${size}x${size}`);
}

const ico = encodeIco(images);

const outDir = path.resolve('build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'icon.ico');
fs.writeFileSync(outPath, ico);

console.log(`\nWrote ${outPath} (${ico.length} bytes)`);
