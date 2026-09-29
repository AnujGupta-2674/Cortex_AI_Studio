import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => {
    console.log("Redis client connected");
});

redis.on("ready", () => {
    console.log("Redis client ready to receive operations");
});

redis.on("error", (err) => {
    console.error("Redis client error:", err.message);
});

export default redis;