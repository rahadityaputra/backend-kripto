import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { loggingMiddleware } from './middleware/logging.middleware';
import { morganMiddleware } from './config/logger.config';
import { authMiddleware } from './middleware/auth.middleware';
import { membershipMiddleware } from './middleware/membership.middleware';
import membershipRoutes from './routes/news.routes';
import { errorHandler } from './middleware/errorHandler';
import fs from "fs"
import https from "https"
const app = express();

app.use(cors({
    origin: "https://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morganMiddleware);
app.use(loggingMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/news', authMiddleware, membershipMiddleware, membershipRoutes);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const options = {
    key: fs.readFileSync('/home/rahadityaputra/certs/localhost+2-key.pem'),
    cert: fs.readFileSync('/home/rahadityaputra/certs/localhost+2.pem')
};

if (require.main === module) {
    https.createServer(options, app).listen(PORT, () => {

    });
}

export default app;