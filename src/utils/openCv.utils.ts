import cv from "@techstark/opencv-js";
import { createCanvas, Image } from "canvas";

// Simpan promise supaya tidak load ulang
let cvPromise: Promise<typeof cv> | null = null;

export function loadCV() {
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve) => {
    // Jika runtime sudah siap → langsung resolve
    if ((cv as any).onRuntimeInitialized === undefined) {
      resolve(cv);
      return;
    }

    // Jika belum siap → tunggu event initialized
    cv.onRuntimeInitialized = () => {
      resolve(cv);
    };
  });

  return cvPromise;
}

export function bufferToMat(buffer: Buffer) {
    const img = new Image();
    img.src = buffer;
  
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
  
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
    // ✅ Buat Mat manual (RGBA = 4 channel)
    const mat = new cv.Mat(img.height, img.width, cv.CV_8UC4);
    mat.data.set(imageData.data);
  
    // ✅ Konversi ke grayscale (CV_8UC1)
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
  
    mat.delete();
    return gray;
  }
  