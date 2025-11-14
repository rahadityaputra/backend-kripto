import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    logger.info('Incoming request received', req.body);
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);

    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    const originalEnd = res.end;
    const originalJson = res.json;

    res.json = function (body: any): Response {
        logger.debug(`Response body: ${JSON.stringify(body, null, 2)}`);
        return originalJson.apply(res, [body]);
    };

    next();
};