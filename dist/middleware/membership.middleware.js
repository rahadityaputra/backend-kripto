"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipMiddleware = void 0;
const logger_config_1 = require("../config/logger.config");
const user_service_1 = require("../services/user.service");
const userService = new user_service_1.UserService();
const membershipMiddleware = (req, res, next) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const isMemberUser = userService.isMemberUser(userId);
        if (!isMemberUser) {
            logger_config_1.logger.warn(`Access denied for non-member user ID: ${userId}`);
            return res.status(403).json({
                status: false,
                message: 'Access denied. Membership required.'
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
exports.membershipMiddleware = membershipMiddleware;
