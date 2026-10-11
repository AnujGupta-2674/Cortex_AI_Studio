import redis from "../../../shared/redis/redis.js";
import axios from "axios";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8001";

export const AGENT_CREDIT_COSTS = {
  chat: 1,      // Conversational Q&A
  search: 2,    // Real-time search with citations
  coding: 2,    // Code generation / review
  vision: 3,    // Vision & image processing
  pdf: 3,       // Print-ready A4 document
  ppt: 5,       // Complete 16:9 interactive presentation deck
  default: 1,
};

// Atomic Lua script: Checks balance >= cost. If true, subtracts cost and returns remaining balance.
// If key is missing, returns -2 (signal that hydration from DB is needed).
// If balance < cost, returns -1 without modifying balance.
const DEDUCT_CREDITS_LUA = `
  local balance = tonumber(redis.call('get', KEYS[1]) or '-1')
  local cost = tonumber(ARGV[1])
  
  if balance == -1 then
    return -2
  end

  if balance >= cost then
    local new_balance = balance - cost
    redis.call('set', KEYS[1], new_balance)
    return new_balance
  else
    return -1
  end
`;

/**
 * Hydrates credit balance from Auth Service into Redis on cache miss.
 */
export const hydrateUserCredits = async (userId) => {
  const key = `user:${userId}:credits`;
  try {
    const res = await axios.get(`${AUTH_SERVICE_URL}/users/${userId}/credits`, {
      timeout: 3000,
    });
    const credits = res.data?.credits ?? 50;
    await redis.set(key, credits);
    return credits;
  } catch (err) {
    console.warn(`[HydrateCredits] Failed for user ${userId}, defaulting to 50:`, err.message);
    await redis.set(key, 50);
    return 50;
  }
};

/**
 * Atomically checks and reserves credits before calling the agent.
 */
export const reserveCredits = async (userId, cost) => {
  const key = `user:${userId}:credits`;

  let remaining = await redis.eval(DEDUCT_CREDITS_LUA, 1, key, cost);

  // Key missing in Redis -> Hydrate from Auth service / MongoDB and retry
  if (remaining === -2) {
    await hydrateUserCredits(userId);
    remaining = await redis.eval(DEDUCT_CREDITS_LUA, 1, key, cost);
  }

  if (remaining === -1) {
    const current = await redis.get(key);
    return {
      success: false,
      currentCredits: Number(current || 0),
      requiredCredits: cost,
    };
  }

  return {
    success: true,
    remainingCredits: Number(remaining),
  };
};

/**
 * Refunds credits if the LLM invocation failed midway.
 */
export const refundCredits = async (userId, cost, reason = "agent_failure") => {
  try {
    const key = `user:${userId}:credits`;
    const newBalance = await redis.incrby(key, cost);
    console.log(`[Credits Refund] Refunded ${cost} credits to user ${userId}. New balance: ${newBalance} (${reason})`);

    // Write-behind ledger entry for refund
    recordLedgerAsync({
      userId,
      amount: cost,
      balanceAfter: newBalance,
      action: "refund",
      metadata: { reason },
    });

    return newBalance;
  } catch (err) {
    console.error("[Credits Refund Error]", err.message);
  }
};

/**
 * Asynchronously persists audit ledger entries to Auth Service / MongoDB
 * (Non-blocking write-behind pattern)
 */
export const recordLedgerAsync = async ({
  userId,
  amount,
  balanceAfter,
  action,
  agentType = null,
  orderId = null,
  metadata = {},
}) => {
  try {
    axios
      .post(
        `${AUTH_SERVICE_URL}/payments/ledger`,
        {
          userId,
          amount,
          balanceAfter,
          action,
          agentType,
          orderId,
          metadata,
        },
        { timeout: 3000 }
      )
      .catch((err) => {
        console.warn("[RecordLedger Async Warning]:", err.message);
      });
  } catch (err) {
    // Write-behind should never crash runtime
  }
};
