// emd.ts

const n = 2;
const BASE = 2 * n + 1; // 5

/**
 * Fungsi ekstraksi rahasia (kunci).
 * f(p1, p2) = (1*p1 + 2*p2) mod 5
 */
export function extractionFunction(p1: number, p2: number): number {
  return (p1 * 1 + p2 * 2) % BASE;
}

/**
 * Menerapkan modifikasi EMD.
 * (Diasumsikan p1, p2, dan hasilnya aman,
 * karena sudah dijamin oleh `pixelHelper` dan `index.ts`)
 */
export function applyModification(
  pixels: Buffer,
  idx1: number,
  idx2: number,
  diff: number
) {
  switch (diff) {
    case 1: // p1+1
      pixels[idx1]++;
      break;
    case 2: // p2+1
      pixels[idx2]++;
      break;
    case 3: // p2-1
      pixels[idx2]--;
      break;
    case 4: // p1-1
      pixels[idx1]--;
      break;
    // case 0: tidak perlu modifikasi
  }
}