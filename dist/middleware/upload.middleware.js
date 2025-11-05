"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = exports.uploadIdentityCard = void 0;
const multer_1 = __importDefault(require("multer"));
// Configure storage to use memory storage instead of disk
const storage = multer_1.default.memoryStorage();
// File filter for jpg/jpeg only
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only jpg/jpeg files are allowed'));
    }
};
// Create multer upload instance
exports.uploadIdentityCard = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB in bytes
    },
    fileFilter: fileFilter
}).single('identityCard');
// Middleware wrapper for error handling
const uploadMiddleware = (req, res, next) => {
    (0, exports.uploadIdentityCard)(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            // Multer error (e.g., file too large)
            return res.status(400).json({
                status: false,
                message: 'File upload error',
                error: err.message
            });
        }
        else if (err) {
            // Other errors (e.g., invalid file type)
            return res.status(400).json({
                status: false,
                message: err.message
            });
        }
        // If everything is fine, proceed
        next();
    });
};
exports.uploadMiddleware = uploadMiddleware;
