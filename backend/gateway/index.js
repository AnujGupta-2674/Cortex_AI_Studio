import express from 'express';
import "dotenv/config";
import cors from 'cors';
import proxy from 'express-http-proxy';
import authMiddleware from './middlewares/auth.middleware.js';
import getCurrentUser from './controllers/user.controller.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 8000;

// 1. CORS handled first to resolve all preflight OPTIONS requests immediately
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'],
    credentials: true,
}));

// 2. Cookie & Body parsers
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cache parsed request body before express-http-proxy resets req.body to null
app.use((req, res, next) => {
    req._parsedBody = req.body;
    next();
});

/**
 * Creates proxy configuration that safely forwards parsed request bodies
 * Prevents "Tried to parse body after request body has already been read" error
 */
const createProxyConfig = (extraDecorators = {}) => ({
    parseReqBody: false,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        if (extraDecorators.proxyReqOptDecorator) {
            proxyReqOpts = extraDecorators.proxyReqOptDecorator(proxyReqOpts, srcReq);
        }
        if (srcReq._parsedBody && Object.keys(srcReq._parsedBody).length > 0) {
            proxyReqOpts.headers["content-type"] = "application/json";
        }
        return proxyReqOpts;
    },
    proxyReqBodyDecorator: (bodyContent, srcReq) => {
        if (srcReq._parsedBody && Object.keys(srcReq._parsedBody).length > 0) {
            return JSON.stringify(srcReq._parsedBody);
        }
        return undefined;
    },
});

app.use("/api/auth", proxy(process.env.AUTH_SERVICE, createProxyConfig()));

app.use(
    "/api/chat",
    authMiddleware,
    proxy(process.env.CHAT_SERVICE || "http://localhost:8002", createProxyConfig({
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
                proxyReqOpts.headers["x-user"] = JSON.stringify(srcReq.user);
            }
            return proxyReqOpts;
        },
    }))
);

app.use(
    "/api/agent",
    authMiddleware,
    proxy(process.env.AGENT_SERVICE || "http://localhost:8003", createProxyConfig({
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
                proxyReqOpts.headers["x-user"] = JSON.stringify(srcReq.user);
            }
            return proxyReqOpts;
        },
    }))
);

app.get('/api/me', authMiddleware, getCurrentUser);

app.listen(PORT, () => {
    console.log(`Gateway is running on port: ${PORT}`);
});
