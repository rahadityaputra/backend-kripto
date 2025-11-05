"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCV = loadCV;
exports.bufferToMat = bufferToMat;
const opencv_js_1 = __importDefault(require("@techstark/opencv-js"));
const canvas_1 = require("canvas");
// Simpan promise supaya tidak load ulang
let cvPromise = null;
function loadCV() {
    if (cvPromise)
        return cvPromise;
    cvPromise = new Promise((resolve) => {
        // Jika runtime sudah siap → langsung resolve
        if (opencv_js_1.default.onRuntimeInitialized === undefined) {
            resolve(opencv_js_1.default);
            return;
        }
        // Jika belum siap → tunggu event initialized
        opencv_js_1.default.onRuntimeInitialized = () => {
            resolve(opencv_js_1.default);
        };
    });
    return cvPromise;
}
function bufferToMat(buffer) {
    const img = new canvas_1.Image();
    img.src = buffer;
    const canvas = (0, canvas_1.createCanvas)(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    // ✅ Buat Mat manual (RGBA = 4 channel)
    const mat = new opencv_js_1.default.Mat(img.height, img.width, opencv_js_1.default.CV_8UC4);
    mat.data.set(imageData.data);
    // ✅ Konversi ke grayscale (CV_8UC1)
    const gray = new opencv_js_1.default.Mat();
    opencv_js_1.default.cvtColor(mat, gray, opencv_js_1.default.COLOR_RGBA2GRAY);
    mat.delete();
    return gray;
}
