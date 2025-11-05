"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = void 0;
const logger_config_1 = require("../config/logger.config");
const loggingMiddleware = (req, res, next) => {
    logger_config_1.logger.info('Incoming request received', req.body);
    // Log request details, req
    logger_config_1.logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
    // Log request body if present (excluding sensitive data)
    if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = Object.assign({}, req.body);
        // Remove sensitive fields
        delete sanitizedBody.password;
        logger_config_1.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
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
    res.json = function (body) {
        logger_config_1.logger.debug(`Response body: ${JSON.stringify(body, null, 2)}`);
        return originalJson.apply(res, [body]);
    };
    next();
};
exports.loggingMiddleware = loggingMiddleware;
