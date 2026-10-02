import express from 'express';
import "dotenv/config";
import mongoose from 'mongoose';
import connectToDB from './config/db.js';
import agentRoutes from './routes/agent.routes.js';

const app = express();
const PORT = process.env.PORT || 8003;

// Middleware
app.use(express.json());

// Health check endpoint (flexible for direct calls & gateway proxying)
app.get(['/health', '/api/agent/health'], (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'UP' : 'DOWN',
        service: 'agent-service',
        database: isDbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Agent routes (mounted flexibly for proxy and direct requests)
app.use('/agent', agentRoutes);
app.use('/api/agent', agentRoutes);
app.use('/', agentRoutes);


// Start server only after establishing database connection
let server;

async function startServer() {
    try {
        await connectToDB();

        server = app.listen(PORT, () => {
            console.log(`Agent Service is running on port: ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start Agent Service:", err);
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
