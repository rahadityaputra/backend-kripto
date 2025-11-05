import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Configure storage to use memory storage instead of disk
const storage = multer.memoryStorage();

// File filter for jpg/jpeg only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only jpg/jpeg files are allowed'));
    }
};

// Create multer upload instance
export const uploadIdentityCard = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB in bytes
    },
    fileFilter: fileFilter
}).single('identityCard');

// Middleware wrapper for error handling
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    uploadIdentityCard(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            // Multer error (e.g., file too large)
            return res.status(400).json({
                status: false,
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
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