import express from 'express';
import "dotenv/config";
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import connectToDB from './config/db.js';
import chatRoutes from './routes/chat.routes.js';

const app = express();
const PORT = process.env.PORT || 8002;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'UP' : 'DOWN',
        service: 'chat-service',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Chat routes (mounted flexibly for proxy and direct requests)
app.use('/chat', chatRoutes);
app.use('/api/chat', chatRoutes);
app.use('/', chatRoutes);


// Start server only after establishing database connection
let server;

async function startServer() {
    try {
        await connectToDB();
        
        server = app.listen(PORT, () => {
            console.log(`Chat Service is running on port: ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start Chat Service:", err);
        process.exit(1);
    }
}

// Graceful shutdown handling (SIGINT, SIGTERM)
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    if (server) {
        server.close(async () => {
            console.log("HTTP server closed.");
            try {
                await mongoose.connection.close(false);
                console.log("MongoDB connection closed.");
                process.exit(0);
            } catch (err) {
                console.error("Error closing MongoDB connection:", err);
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
