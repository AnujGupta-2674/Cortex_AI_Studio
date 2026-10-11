import { Router } from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getUserCredits,
  recordLedger,
  getPackages,
} from "../controllers/payment.controller.js";

const router = Router();

// Package tiers
router.get("/packages", getPackages);

// Order creation & payment verification
router.post("/create-order", createPaymentOrder);
router.post("/verify", verifyPayment);

// Credit balance inquiries
router.get("/balance", getUserCredits);
router.get("/users/:userId/credits", getUserCredits);

// Write-behind ledger recording
router.post("/ledger", recordLedger);

export default router;
