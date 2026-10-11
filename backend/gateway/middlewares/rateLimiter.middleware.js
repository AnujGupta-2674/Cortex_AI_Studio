import redis from "../../shared/redis/redis.js";

const AGENT_LIMITS = {
  chat: 25,
  search: 15,
  coding: 12,
  vision: 10,
  pdf: 6,
  ppt: 6,
  default: 15,
};

/**
 * Sliding Window Rate Limiter using Redis Sorted Sets (ZSET)
 * Key Format: ratelimit:{userId}:{agentType}
 * 
 * Inspects user identity, agent specialization, and sliding 60-second window.
 * Operates in fail-open mode so temporary Redis interruptions do not take down services.
 */
export const agentRateLimiter = async (req, res, next) => {
  // Extract user ID from authenticated session, proxy header, or client IP
  const userId = req.user?.userId || req.headers["x-user-id"] || req.ip;
  const agentType = (
    req.headers["x-agent-type"] ||
    req.query?.agent ||
    req.body?.agent ||
    "default"
  ).toLowerCase().trim();

  const maxRequests = AGENT_LIMITS[agentType] || AGENT_LIMITS.default;
  const windowMs = 60 * 1000; // 60-second rolling window
  const now = Date.now();
  const key = `ratelimit:${userId}:${agentType}`;

  try {
    const multi = redis.multi();
    // 1. Evict entries older than (now - 60s)
    multi.zremrangebyscore(key, 0, now - windowMs);
    // 2. Add current request timestamp with unique member tag
    multi.zadd(key, now, `${now}-${Math.random().toString(36).substring(2, 7)}`);
    // 3. Count remaining entries in the rolling window
    multi.zcard(key);
    // 4. Set auto-expiry so idle keys are garbage-collected
    multi.expire(key, 65);

    const results = await multi.exec();
    const currentCount = results?.[2]?.[1] ?? 1; // Result of zcard

    // Set standard HTTP Rate Limiting headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - currentCount));
    res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));

    if (currentCount > maxRequests) {
      return res.status(429).json({
        success: false,
        error: "RateLimitExceeded",
        message: `Rate limit exceeded for ${agentType.toUpperCase()} Agent. Maximum allowed: ${maxRequests} requests per minute.`,
        retryAfter: 60,
      });
    }

    next();
  } catch (err) {
    console.error("[RateLimiter Error - Fail-Open]", err.message);
    // Fail-open: Never block legitimate users if Redis is temporarily unreachable
    next();
  }
};

export default agentRateLimiter;
