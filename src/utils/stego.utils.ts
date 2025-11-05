// steg-dct.ts
import sharp from "sharp";

/**
 * 1D DCT type II for N = 8, and inverse (IDCT) type III.
 * Implement separable DCT for 8x8 blocks.
 */

// Precompute constants
const N = 8;
const PI = Math.PI;
const c: number[] = new Array(N).fill(0).map((_, i) => (i === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N)));

function dct1d(vec: number[]): number[] {
  const out = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += vec[n] * Math.cos(((2 * n + 1) * k * PI) / (2 * N));
    }
    out[k] = c[k] * sum;
  }
  return out;
}

function idct1d(vec: number[]): number[] {
  const out = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    let sum = 0;
    for (let k = 0; k < N; k++) {
      sum += c[k] * vec[k] * Math.cos(((2 * n + 1) * k * PI) / (2 * N));
    }
    out[n] = sum;
  }
}

// perform 2D DCT on 8x8 block (array of 64 numbers, row-major)
function dct2d(block: number[]): number[] {
  // rows
  const rows = new Array(8);
  for (let r = 0; r < 8; r++) {
    rows[r] = dct1d(block.slice(r * 8, r * 8 + 8));
  }
  // cols
  const tmp = new Array(8).fill(0).map(() => new Array(8).fill(0));
  for (let cidx = 0; cidx < 8; cidx++) {
    const col = rows.map(r => r[cidx]);
    const colTrans = dct1d(col);
    for (let r = 0; r < 8; r++) tmp[r][cidx] = colTrans[r];
  }
  // flatten
  const out: number[] = [];
  for (let r = 0; r < 8; r++) for (let cc = 0; cc < 8; cc++) out.push(tmp[r][cc]);
  return out;
}

function idct2d(block: number[]): number[] {
  const rows = new Array(8);
  // process columns inverse
  const tmp = new Array(8).fill(0).map(() => new Array(8).fill(0));
  for (let cidx = 0; cidx < 8; cidx++) {
    const col = new Array(8).fill(0).map((_, r) => block[r * 8 + cidx]);
    const colI = idct1d(col);
    for (let r = 0; r < 8; r++) tmp[r][cidx] = colI[r];
  }
  // now rows IDCT
  const out: number[] = [];
  for (let r = 0; r < 8; r++) {
    const rowI = idct1d(tmp[r]);
    for (let cc = 0; cc < 8; cc++) out.push(rowI[cc]);
  }
  return out;
}

/**
 * Embed payloadBuffer into imageBuffer.
 * - imageBuffer: Buffer (png/jpg)
 * - payloadBuffer: Buffer (we expect it already contains length header if you used that)
 * returns PNG buffer
 */
export async function embedDCT8x8(imageBuffer: Buffer, payloadBuffer: Buffer): Promise<Buffer> {
  // decode to grayscale raw
  const img = await sharp(imageBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = img; // data uint8, info.width, info.height
  const width = info.width;
  const height = info.height;

  // create output array (float) initialize from pixels
  const out = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i];

  // which coefficient positions to use (mid-freq) in zigzag order (avoid [0,0], avoid too high freqs)
  // We'll choose these (row,col) pairs within 8x8 for embedding bytes (one byte per block per position set)
  const embedPositions = [
    [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2], [4, 1]
  ];
  // We'll embed one byte per block by using several coefficients: pack byte across positions by replacing low 2-3 bits each? Simpler: set LSB of one coefficient per bit. But for simplicity and robustness, we will **store full byte** in the first embedPosition coefficient by setting its low 8-bit value.
  // iterate blocks
  let payloadIdx = 0;
  const totalBlocksX = Math.floor(width / N);
  const totalBlocksY = Math.floor(height / N);

  for (let by = 0; by < totalBlocksY && payloadIdx < payloadBuffer.length; by++) {
    for (let bx = 0; bx < totalBlocksX && payloadIdx < payloadBuffer.length; bx++) {
      // extract block
      const block: number[] = new Array(64);
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const px = bx * N + c;
          const py = by * N + r;
          const idx = py * width + px;
          block[r * N + c] = out[idx];
        }
      }

      // DCT
      const dct = dct2d(block);

      // embed ONE byte into selected coefficient (first chosen)
      const [er, ec] = embedPositions[0];
      const posIndex = er * N + ec;
      const coef = Math.round(dct[posIndex]);
      // preserve high part, set low 8 bits to payload byte
      const high = Math.floor(coef / 256) * 256;
      const newCoef = high + payloadBuffer[payloadIdx++];
      dct[posIndex] = newCoef;

      // inverse
      const idct = idct2d(dct);

      // write back
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const px = bx * N + c;
          const py = by * N + r;
          const idx = py * width + px;
          // clamp 0..255
          let v = Math.round(idct[r * N + c]);
          if (v < 0) v = 0;
          if (v > 255) v = 255;
          out[idx] = v;
        }
      }
    }
  }

  // create PNG from out (Uint8)
  const out8 = Buffer.from(Uint8Array.from(out.map(v => Math.round(v))));
  const png = await sharp(out8, { raw: { width, height, channels: 1 } }).png().toBuffer();
  return png;
}

/**
 * Extract payloadBuffer from imageBuffer. 
 * Will read sequentially bytes from blocks until terminatorBuffer sequence found OR until maxBytes (safety).
 * If you used length-prefixed payloadBuffer, the embedded first 4 bytes are length and you can parse from extracted bytes.
 */
export async function extractDCT8x8(imageBuffer: Buffer, maxBytes = 1024 * 16, terminator?: Buffer): Promise<Buffer> {
  const img = await sharp(imageBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = img;
  const width = info.width;
  const height = info.height;
  const inArr = new Float64Array(data.length);
  for (let i = 0; i < data.length; i++) inArr[i] = data[i];

  const totalBlocksX = Math.floor(width / N);
  const totalBlocksY = Math.floor(height / N);
  const extracted: number[] = [];

  const embedPositions = [[1,2],[2,1],[2,2],[1,3],[3,1],[2,3],[3,2],[4,1]];
  const pos = embedPositions[0];
  for (let by = 0; by < totalBlocksY && extracted.length < maxBytes; by++) {
    for (let bx = 0; bx < totalBlocksX && extracted.length < maxBytes; bx++) {
      // extract block
      const block: number[] = new Array(64);
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const px = bx * N + c;
          const py = by * N + r;
          const idx = py * width + px;
          block[r * N + c] = inArr[idx];
        }
      }

      const dct = dct2d(block);
      const [er, ec] = pos;
      const posIndex = er * N + ec;
      const coef = Math.round(dct[posIndex]);
      const byte = ((coef % 256) + 256) % 256;
      extracted.push(byte);

      // check terminator if provided
      if (terminator && terminator.length > 0 && extracted.length >= terminator.length) {
        const tail = extracted.slice(extracted.length - terminator.length);
        let match = true;
        for (let t = 0; t < terminator.length; t++) {
          if (tail[t] !== terminator[t]) { match = false; break; }
        }
        if (match) {
          // remove terminator bytes and return
          const res = Buffer.from(extracted.slice(0, extracted.length - terminator.length));
          return res;
        }
      }
    }
  }

  // if terminator not found, return what extracted (caller can parse length from first 4 bytes)
  return Buffer.from(extracted);
}
