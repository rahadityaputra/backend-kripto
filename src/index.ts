import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { loggingMiddleware } from './middleware/logging.middleware';
import { morganMiddleware } from './config/logger.config';
import { authMiddleware } from './middleware/auth.middleware';
import { membershipMiddleware } from './middleware/membership.middleware';
import membershipRoutes from './routes/news.routes';

const app = express();


app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morganMiddleware);
app.use(loggingMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/news',authMiddleware, membershipMiddleware, membershipRoutes);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;