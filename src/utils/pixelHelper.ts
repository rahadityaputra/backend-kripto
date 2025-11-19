// pixelHelper.ts

/**
 * Fungsi untuk mengecek apakah sebuah piksel 100% AMAN untuk dimodifikasi
 * TANPA menyebabkan desync.
 *
 * Rentang aman adalah [3...252].
 * - Modifikasi minimum: 3 - 1 = 2 (Aman)
 * - Modifikasi maksimum: 252 + 1 = 253 (Aman)
 *
 * Piksel [0, 1, 2, 253, 254, 255] akan dilewati (skip).
 */
function isPixelSafeForEMD(value: number): boolean {
    return value >= 3 && value <= 252;
  }
  
  /**
   * Generator yang menghasilkan indeks pasangan piksel [idx1, idx2]
   * yang 100% AMAN dan bukan Alpha.
   *
   * @param pixels - Buffer data piksel mentah (R,G,B,A, R,G,B,A, ...)
   */
  export function* getSafePixelPairs(
    pixels: Buffer
  ): Generator<[number, number]> {
    let pair: number[] = [];
  
    for (let i = 0; i < pixels.length; i++) {
      // 1. Lewati channel Alpha (selalu)
      if ((i + 1) % 4 === 0) {
        continue;
      }
  
      // 2. Lewati piksel yang TIDAK AMAN (di luar rentang [3...252])
      const value = pixels[i];
      if (!isPixelSafeForEMD(value)) {
        continue;
      }
  
      // 3. Kumpulkan piksel yang valid ke dalam pasangan
      pair.push(i);
      if (pair.length === 2) {
        yield [pair[0], pair[1]];
        pair = []; // Reset untuk pasangan berikutnya
      }
    }
  }