import express from 'express';
import "dotenv/config";
import cors from 'cors';
import proxy from 'express-http-proxy';
import authMiddleware from './middlewares/auth.middleware.js';
import getCurrentUser from './controllers/user.controller.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cookieParser());

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

app.use("/api/auth", proxy(process.env.AUTH_SERVICE));

app.get('/api/me', authMiddleware, getCurrentUser);

app.listen(PORT, () => {
    console.log(`Gateway is running on port: ${PORT}`);
});
