import mongoose from "mongoose";

const connectToDB = async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error("FATAL: MONGODB_URI is not defined in environment variables.");
        process.exit(1);
    }

    // Connection configuration for production stability & performance
    const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2,  // Keep at least 2 socket connections open
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5s before timing out
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    // Connection lifecycle listeners for runtime monitoring
    mongoose.connection.on("connected", () => {
        console.log(`[MongoDB] Connected successfully to database: "${mongoose.connection.name}"`);
    });

    mongoose.connection.on("error", (err) => {
        console.error("[MongoDB] Connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("[MongoDB] Disconnected from database");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("[MongoDB] Reconnected to database");
    });

    try {
        await mongoose.connect(mongoUri, options);
    } catch (error) {
        console.error("[MongoDB] Initial connection failed:", error.message || error);
        process.exit(1);
    }
};

export default connectToDB;
