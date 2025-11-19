// index.ts

import sharp from 'sharp';
import { applyModification, extractionFunction } from './emd';
import { base5ToByte, byteToBase5 } from './baseConverter';
import { getSafePixelPairs } from './pixelHelper';

const BASE = 5;
const DIGITS_PER_BYTE = 4;
const HEADER_SIZE_BYTES = 4;

export async function embedEMD(
  imageBuffer: Buffer,
  payloadBuffer: Buffer
): Promise<Buffer> {
  const { data: pixels, info } = await sharp(imageBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const headerBuffer = Buffer.alloc(HEADER_SIZE_BYTES);
  headerBuffer.writeUInt32BE(payloadBuffer.length, 0);
  const fullPayload = Buffer.concat([headerBuffer, payloadBuffer]);

  // Gunakan iterator yang 100% aman
  const pairIterator = getSafePixelPairs(pixels);

  for (const byte of fullPayload) {
    const base5Digits = byteToBase5(byte);

    for (const digit of base5Digits) {
      const nextPair = pairIterator.next();
      if (nextPair.done) {
        // Error ini sekarang berarti gambarnya BENAR-BENAR terlalu kecil
        // untuk kapasitas rentang [3...252]
        throw new Error(
          'Image capacity exceeded. Cannot embed full payload. Try a larger image.'
        );
      }

      const [idx1, idx2] = nextPair.value;
      const f_current = extractionFunction(pixels[idx1], pixels[idx2]);
      const diff = (digit - f_current + BASE) % BASE;

      if (diff !== 0) {
        // Modifikasi dijamin aman karena helper
        applyModification(pixels, idx1, idx2, diff);
      }
    }
  }

  return sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels as 1 | 2 | 3 | 4,
    },
  })
    .png()
    .toBuffer();
}

export async function extractEMD(
  stegoImageBuffer: Buffer
): Promise<Buffer> {
  const { data: pixels } = await sharp(stegoImageBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Gunakan iterator yang 100% aman (identik dengan embed)
  const pairIterator = getSafePixelPairs(pixels);
  const extractedBytes: number[] = [];

  // 1. Ekstrak Header
  const headerDigits: number[] = [];
  const headerDigitCount = HEADER_SIZE_BYTES * DIGITS_PER_BYTE;

  for (let i = 0; i < headerDigitCount; i++) {
    const nextPair = pairIterator.next();
    if (nextPair.done) {
      throw new Error('Invalid stego image: cannot read header.');
    }
    const [idx1, idx2] = nextPair.value;
    const digit = extractionFunction(pixels[idx1], pixels[idx2]);
    headerDigits.push(digit);
  }

  const headerBytes: number[] = [];
  for (let i = 0; i < HEADER_SIZE_BYTES; i++) {
    const byteDigits = headerDigits.slice(
      i * DIGITS_PER_BYTE,
      (i + 1) * DIGITS_PER_BYTE
    );
    headerBytes.push(base5ToByte(byteDigits));
  }

  const payloadLength = Buffer.from(headerBytes).readUInt32BE(0);

  // Cek kewajaran ukuran payload
  const maxPossibleBytes = pixels.length / 2; // Perkiraan kasar
  if (payloadLength > maxPossibleBytes || payloadLength < 0) {
    throw new Error(
      `Invalid payload size in header (${payloadLength}). Data is corrupt.`
    );
  }

  // 2. Ekstrak Payload
  for (let b = 0; b < payloadLength; b++) {
    const payloadDigits: number[] = [];
    for (let i = 0; i < DIGITS_PER_BYTE; i++) {
      const nextPair = pairIterator.next();
      if (nextPair.done) {
        // Error ini sekarang berarti header OK, tapi payload terpotong
        throw new Error('Invalid stego image: payload truncated.');
      }
      const [idx1, idx2] = nextPair.value;
      const digit = extractionFunction(pixels[idx1], pixels[idx2]);
      payloadDigits.push(digit);
    }
    extractedBytes.push(base5ToByte(payloadDigits));
  }

  return Buffer.from(extractedBytes);
}