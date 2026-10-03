import express from 'express';
import "dotenv/config";
import cors from 'cors';
import proxy from 'express-http-proxy';
import cookieParser from 'cookie-parser';
import authMiddleware from './middlewares/auth.middleware.js';
import getCurrentUser from './controllers/user.controller.js';

const app = express();
const PORT = process.env.PORT || 8000;

// 1. CORS Configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'],
    credentials: true,
}));

// 2. Cookie Parser (for session authentication)
// Note: We do NOT use express.json() here in Gateway so the raw request stream
// passes directly and untouched to downstream microservices.
app.use(cookieParser());

// 3. Reverse Proxy Routes (Pure stream passthrough)
app.use(
    "/api/auth",
    proxy(process.env.AUTH_SERVICE || "http://localhost:8001")
);

app.use(
    "/api/chat",
    authMiddleware,
    proxy(process.env.CHAT_SERVICE || "http://localhost:8002", {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
                proxyReqOpts.headers["x-user"] = JSON.stringify(srcReq.user);
            }
            return proxyReqOpts;
        }
    })
);

app.use(
    "/api/agent",
    authMiddleware,
    proxy(process.env.AGENT_SERVICE || "http://localhost:8003", {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
                proxyReqOpts.headers["x-user"] = JSON.stringify(srcReq.user);
            }
            return proxyReqOpts;
        }
    })
);

// 4. Gateway-handled Endpoints
app.get('/api/me', authMiddleware, getCurrentUser);

app.listen(PORT, () => {
    console.log(`Gateway is running on port: ${PORT}`);
});
