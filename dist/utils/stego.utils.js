"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedDCT8x8 = embedDCT8x8;
exports.extractDCT8x8 = extractDCT8x8;
exports.embedLSB = embedLSB;
exports.extractLSB = extractLSB;
const sharp_1 = __importDefault(require("sharp"));
/**
 * 1D DCT type II for N = 8, and inverse (IDCT) type III.
 * Implement separable DCT for 8x8 blocks.
 */
// Precompute constants
const N = 8;
const PI = Math.PI;
// c[k] = sqrt(1/N) for k=0, sqrt(2/N) for k>0
const c = new Array(N).fill(0).map((_, i) => (i === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N)));
function dct1d(vec) {
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
// 🛑 KOREKSI KRITIS: Menambahkan return out
function idct1d(vec) {
    const out = new Array(N).fill(0);
    for (let n = 0; n < N; n++) {
        let sum = 0;
        for (let k = 0; k < N; k++) {
            sum += c[k] * vec[k] * Math.cos(((2 * n + 1) * k * PI) / (2 * N));
        }
        out[n] = sum;
    }
    return out; // WAJIB ADA
}
// perform 2D DCT on 8x8 block (array of 64 numbers, row-major)
function dct2d(block) {
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
        for (let r = 0; r < 8; r++)
            tmp[r][cidx] = colTrans[r];
    }
    // flatten
    const out = [];
    for (let r = 0; r < 8; r++)
        for (let cc = 0; cc < 8; cc++)
            out.push(tmp[r][cc]);
    return out;
}
function idct2d(block) {
    // 1. Ubah array datar menjadi matriks 8x8
    const blockMatrix = [];
    for (let r = 0; r < N; r++) {
        blockMatrix.push(block.slice(r * N, (r + 1) * N));
    }
    // 2. IDCT pada kolom
    const tmp = new Array(8).fill(0).map(() => new Array(8).fill(0));
    for (let cidx = 0; cidx < 8; cidx++) {
        const col = blockMatrix.map(r => r[cidx]);
        const colI = idct1d(col);
        for (let r = 0; r < 8; r++)
            tmp[r][cidx] = colI[r];
    }
    // 3. IDCT pada baris
    const out = [];
    for (let r = 0; r < 8; r++) {
        const rowI = idct1d(tmp[r]);
        for (let cc = 0; cc < 8; cc++)
            out.push(rowI[cc]);
    }
    return out;
}
/**
 * Embed payloadBuffer into imageBuffer.
 * - imageBuffer: Buffer (png/jpg)
 * - payloadBuffer: Buffer (we expect it already contains length header if you used that)
 * returns PNG buffer
 */
async function embedDCT8x8(imageBuffer, payloadBuffer) {
    // decode to grayscale raw
    const img = await (0, sharp_1.default)(imageBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = img; // data uint8, info.width, info.height
    const width = info.width;
    const height = info.height;
    // 1. KOREKSI LEVEL SHIFT: Inisialisasi piksel dengan nilai - 128
    const out = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++)
        out[i] = data[i] - 128;
    const embedPositions = [
        [1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2], [4, 1]
    ];
    let payloadIdx = 0;
    const totalBlocksX = Math.floor(width / N);
    const totalBlocksY = Math.floor(height / N);
    for (let by = 0; by < totalBlocksY && payloadIdx < payloadBuffer.length; by++) {
        for (let bx = 0; bx < totalBlocksX && payloadIdx < payloadBuffer.length; bx++) {
            // extract block
            const block = new Array(64);
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const px = bx * N + c;
                    const py = by * N + r;
                    const idx = py * width + px;
                    block[r * N + c] = out[idx]; // Sudah di-shift
                }
            }
            // DCT
            const dct = dct2d(block);
            // embed ONE byte into selected coefficient (first chosen)
            const [er, ec] = embedPositions[0];
            const posIndex = er * N + ec;
            const coef = dct[posIndex];
            // KOREKSI LOGIKA EMBED: Ambil bagian tinggi dari koefisien terdekat kelipatan 256
            const high = Math.round(coef / 256) * 256;
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
                    // KOREKSI LEVEL SHIFT: Geser kembali + 128 sebelum clamping
                    let v = Math.round(idct[r * N + c] + 128);
                    // clamp 0..255
                    if (v < 0)
                        v = 0;
                    if (v > 255)
                        v = 255;
                    out[idx] = v;
                }
            }
        }
    }
    // create PNG from out (Uint8)
    const out8 = Buffer.from(Uint8Array.from(out.map(v => Math.round(v))));
    const png = await (0, sharp_1.default)(out8, { raw: { width, height, channels: 1 } }).png().toBuffer();
    return png;
}
/**
 * Extract payloadBuffer from imageBuffer.
 */
async function extractDCT8x8(imageBuffer, maxBytes = 1024 * 16, terminator) {
    const img = await (0, sharp_1.default)(imageBuffer).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = img;
    const width = info.width;
    const height = info.height;
    // 1. KOREKSI LEVEL SHIFT: Inisialisasi piksel dengan nilai - 128
    const inArr = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++)
        inArr[i] = data[i] - 128;
    const totalBlocksX = Math.floor(width / N);
    const totalBlocksY = Math.floor(height / N);
    const extracted = [];
    const embedPositions = [[1, 2], [2, 1], [2, 2], [1, 3], [3, 1], [2, 3], [3, 2], [4, 1]];
    const pos = embedPositions[0];
    for (let by = 0; by < totalBlocksY && extracted.length < maxBytes; by++) {
        for (let bx = 0; bx < totalBlocksX && extracted.length < maxBytes; bx++) {
            // extract block
            const block = new Array(64);
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const px = bx * N + c;
                    const py = by * N + r;
                    const idx = py * width + px;
                    block[r * N + c] = inArr[idx]; // Sudah di-shift
                }
            }
            const dct = dct2d(block);
            const [er, ec] = pos;
            const posIndex = er * N + ec;
            const coef = dct[posIndex];
            // KOREKSI EKSTRAKSI: Bulatkan (untuk mengatasi float error) lalu ambil mod 256.
            const byte = ((Math.round(coef) % 256) + 256) % 256;
            extracted.push(byte);
            // check terminator if provided
            if (terminator && terminator.length > 0 && extracted.length >= terminator.length) {
                const tail = extracted.slice(extracted.length - terminator.length);
                let match = true;
                for (let t = 0; t < terminator.length; t++) {
                    if (tail[t] !== terminator[t]) {
                        match = false;
                        break;
                    }
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
/**
 * Embed payload into image using LSB steganography.
 * Prepends 4-byte length header.
 */
async function embedLSB(imageBuffer, payloadBuffer) {
    const img = await (0, sharp_1.default)(imageBuffer).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = img;
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    // Prepend length header (4 bytes, big-endian)
    const lengthHeader = Buffer.alloc(4);
    lengthHeader.writeUInt32BE(payloadBuffer.length, 0);
    const fullPayload = Buffer.concat([lengthHeader, payloadBuffer]);
    const totalPixels = width * height;
    const maxCapacity = totalPixels * channels; // 1 bit per channel
    if (fullPayload.length * 8 > maxCapacity) {
        throw new Error('Payload too large for image capacity');
    }
    const out = Buffer.from(data); // copy
    let payloadIdx = 0;
    let bitIdx = 0;
    for (let i = 0; i < out.length && payloadIdx < fullPayload.length; i++) {
        const byte = fullPayload[payloadIdx];
        for (let b = 0; b < 8 && payloadIdx < fullPayload.length; b++) {
            if (bitIdx >= out.length)
                break;
            const bit = (byte >> (7 - b)) & 1;
            out[bitIdx] = (out[bitIdx] & 0xFE) | bit; // set LSB
            bitIdx++;
        }
        payloadIdx++;
    }
    // Convert back to PNG
    const png = await (0, sharp_1.default)(out, { raw: { width, height, channels } }).png().toBuffer();
    return png;
}
/**
 * Extract payload from image using LSB steganography.
 * Uses 4-byte length header to determine payload size.
 */
async function extractLSB(imageBuffer) {
    const img = await (0, sharp_1.default)(imageBuffer).raw().toBuffer({ resolveWithObject: true });
    const { data } = img;
    // Extract length header (first 32 bits)
    let length = 0;
    for (let i = 0; i < 32; i++) {
        const bit = data[i] & 1;
        length |= bit << (31 - i);
    }
    const payload = [];
    let bitIdx = 32; // start after header
    for (let byteIdx = 0; byteIdx < length; byteIdx++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
            if (bitIdx >= data.length)
                break;
            const bit = data[bitIdx] & 1;
            byte |= bit << (7 - b);
            bitIdx++;
        }
        payload.push(byte);
    }
    return Buffer.from(payload);
}
