import Razorpay from "razorpay";
import crypto from "crypto";
import redis from "../../../shared/redis/redis.js";
import User from "../models/user.model.js";
import CreditLedger from "../models/creditLedger.model.js";

// Initialize Razorpay with environment keys or test fallback
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_YourTestKeyHere",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YourTestSecretHere",
});

export const CREDIT_PACKAGES = {
  starter: { id: "starter", name: "Starter Pack", credits: 100, priceInPaise: 9900, priceFormatted: "₹99" },
  pro: { id: "pro", name: "Pro Creator", credits: 500, priceInPaise: 39900, priceFormatted: "₹399" },
  creator: { id: "creator", name: "Studio Ultra", credits: 1500, priceInPaise: 99900, priceFormatted: "₹999" },
};

/**
 * 1. Create a Razorpay Order
 * POST /payments/create-order or POST /api/payments/create-order
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { packageId } = req.body;
    const pack = CREDIT_PACKAGES[packageId];

    if (!pack) {
      return res.status(400).json({ success: false, message: "Invalid credit package ID" });
    }

    const userId = req.user?.userId || req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, message: "User identification missing" });
    }

    const options = {
      amount: pack.priceInPaise,
      currency: "INR",
      receipt: `cortex_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        packageId,
        credits: pack.credits,
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_YourTestKeyHere",
      credits: pack.credits,
    });
  } catch (err) {
    console.error("[Razorpay createPaymentOrder Error]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 2. Cryptographic Signature Verification & Atomic Top-up
 * POST /payments/verify or POST /api/payments/verify
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
    const userId = req.user?.userId || req.headers["x-user-id"];
    const pack = CREDIT_PACKAGES[packageId];

    if (!pack) {
      return res.status(400).json({ success: false, message: "Invalid package specified" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "User identification missing" });
    }

    // Step A: Cryptographic HMAC SHA256 Signature Verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "YourTestSecretHere")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid cryptographic signature",
      });
    }

    // Step B: Idempotency Protection (prevent double-crediting if replayed)
    const idempotencyKey = `payment:processed:${razorpay_payment_id}`;
    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) {
      const current = await redis.get(`user:${userId}:credits`);
      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        credits: Number(current || 0),
      });
    }
    // Mark payment processed for 7 days
    await redis.set(idempotencyKey, "1", "EX", 86400 * 7);

    // Step C: Atomically increment Redis credit balance
    const redisKey = `user:${userId}:credits`;
    const newBalance = await redis.incrby(redisKey, pack.credits);

    // Step D: Write to MongoDB User & CreditLedger
    await Promise.all([
      User.findByIdAndUpdate(userId, { $inc: { credits: pack.credits } }),
      CreditLedger.create({
        userId,
        amount: pack.credits,
        balanceAfter: newBalance,
        action: "purchase",
        orderId: razorpay_order_id,
        metadata: {
          paymentId: razorpay_payment_id,
          amountPaise: pack.priceInPaise,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: `Payment verified! Added ${pack.credits} credits to your account.`,
      credits: newBalance,
    });
  } catch (err) {
    console.error("[Razorpay verifyPayment Error]", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 3. Fetch User Credits (Used by Agent Service for Redis Hydration and Frontend)
 * GET /users/:userId/credits or GET /payments/balance
 */
export const getUserCredits = async (req, res) => {
  try {
    const userId = req.params?.userId || req.user?.userId || req.headers["x-user-id"];

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const redisKey = `user:${userId}:credits`;
    const cachedBalance = await redis.get(redisKey);

    if (cachedBalance !== null) {
      return res.status(200).json({
        success: true,
        credits: Number(cachedBalance),
        source: "redis",
      });
    }

    // Cache miss -> Fetch from MongoDB
    const user = await User.findById(userId).select("credits");
    const credits = user?.credits ?? 50;

    // Repopulate in Redis
    await redis.set(redisKey, credits);

    return res.status(200).json({
      success: true,
      credits,
      source: "mongodb",
    });
  } catch (err) {
    console.error("[getUserCredits Error]", err);
    return res.status(500).json({ success: false, error: err.message, credits: 50 });
  }
};

/**
 * 4. Asynchronous Write-Behind Ledger Recording
 * POST /payments/ledger
 */
export const recordLedger = async (req, res) => {
  try {
    const { userId, amount, balanceAfter, action, agentType, orderId, metadata } = req.body;

    if (!userId || amount === undefined || balanceAfter === undefined || !action) {
      return res.status(400).json({ success: false, message: "Missing required ledger fields" });
    }

    await Promise.all([
      CreditLedger.create({
        userId,
        amount,
        balanceAfter,
        action,
        agentType: agentType || null,
        orderId: orderId || null,
        metadata: metadata || {},
      }),
      // Keep MongoDB user document synchronized with current balance
      User.findByIdAndUpdate(userId, { credits: balanceAfter }),
    ]);

    return res.status(200).json({ success: true, message: "Ledger recorded" });
  } catch (err) {
    console.error("[recordLedger Error]", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 5. Get Packages List
 * GET /payments/packages
 */
export const getPackages = (req, res) => {
  return res.status(200).json({
    success: true,
    packages: Object.values(CREDIT_PACKAGES),
  });
};
