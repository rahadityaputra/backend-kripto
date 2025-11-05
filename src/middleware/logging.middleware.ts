import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.config';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    logger.info('Incoming request received', req.body);
    // Log request details, req
    logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);

    // Log request body if present (excluding sensitive data)
    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        // Remove sensitive fields
        delete sanitizedBody.password;
        logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    // Capture the original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Override end to log response
    // res.end = function (chunk?: any, ...rest: any[]): Response {
    //     logger.info(`Response status: ${res.statusCode}`);
    //     return originalEnd.apply(res, [chunk, ...rest]);
    // };

    // Override json to log response data
    res.json = function (body: any): Response {
        logger.debug(`Response body: ${JSON.stringify(body, null, 2)}`);
        return originalJson.apply(res, [body]);
    };

    next();
};