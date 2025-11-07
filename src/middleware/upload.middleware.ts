import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only jpg/jpeg files are allowed'));
    }
};

export const uploadIdentityCard = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
    fileFilter: fileFilter
}).single('identityCard');

export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    uploadIdentityCard(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                status: false,
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                status: false,
                message: err.message
            });
        }
        next();
    });
};