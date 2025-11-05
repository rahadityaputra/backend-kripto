"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.validateAuthInput = void 0;
const jwt_utils_1 = __importDefault(require("../utils/jwt.utils"));
const logger_config_1 = require("../config/logger.config");
const validateAuthInput = (req, res, next) => {
    logger_config_1.logger.info('Validating authentication input');
    console.log("fungsi ini dipanggil");
    const { email, password } = req.body;
    logger_config_1.logger.info(req.body);
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
            status: false,
            message: 'Invalid email format'
        });
    }
    // Password validation (minimum 8 characters, at least one uppercase, one lowercase, one number)
    // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    // if (!password || !passwordRegex.test(password)) {
    if (!password || password.length < 8) {
        return res.status(400).json({
            status: false,
            message: 'Password requirements not met. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
        });
    }
    next();
};
exports.validateAuthInput = validateAuthInput;
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: false,
                message: 'No token provided'
            });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt_utils_1.default.verifyAccessToken(token);
        req.user = decoded;
        // Verify user ID in params matches token (if userId param exists)
        const userIdParam = req.params.userId;
        if (userIdParam && parseInt(userIdParam) !== decoded.userId) {
            logger_config_1.logger.warn(`User ${decoded.userId} attempted to access resources of user ${userIdParam}`);
            return res.status(403).json({
                status: false,
                message: 'Unauthorized access'
            });
        }
        next();
    }
    catch (error) {
        logger_config_1.logger.error(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return res.status(401).json({
            status: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authMiddleware = authMiddleware;
