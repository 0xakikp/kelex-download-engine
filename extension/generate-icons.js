import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const iconsDir = join(__dirname, 'icons');
mkdirSync(iconsDir, { recursive: true });

function createPNG(width, height) {
  // RGBA raw pixels with signature Kelex gradient (#0A84FF to #AF52DE)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let p = 0;
  for (let y = 0; y < height; y++) {
    rawData[p++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const ratio = (x + y) / (width + height);
      // Gradient interpolation: R: 10->175, G: 132->82, B: 255->222
      const r = Math.round(10 + ratio * (175 - 10));
      const g = Math.round(132 + ratio * (82 - 132));
      const b = Math.round(255 + ratio * (222 - 255));
      rawData[p++] = r;
      rawData[p++] = g;
      rawData[p++] = b;
      rawData[p++] = 255; // Alpha
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcBuf);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC-32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size, size);
  const filePath = join(iconsDir, `icon${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Generated ${filePath}`);
});
