"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const logging_middleware_1 = require("./middleware/logging.middleware");
const logger_config_1 = require("./config/logger.config");
const auth_middleware_1 = require("./middleware/auth.middleware");
const membership_middleware_1 = require("./middleware/membership.middleware");
const news_routes_1 = __importDefault(require("./routes/news.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(logger_config_1.morganMiddleware);
app.use(logging_middleware_1.loggingMiddleware);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/user', auth_middleware_1.authMiddleware, user_routes_1.default);
app.use('/api/news', auth_middleware_1.authMiddleware, membership_middleware_1.membershipMiddleware, news_routes_1.default);
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
exports.default = app;
