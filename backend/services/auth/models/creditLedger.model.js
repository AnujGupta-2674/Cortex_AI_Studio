import { Schema, model } from "mongoose";

const creditLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true }, // Negative for spend (-5), Positive for top-up (+100)
    balanceAfter: { type: Number, required: true },
    action: {
      type: String,
      enum: ["agent_run", "purchase", "welcome_bonus", "refund"],
      required: true,
    },
    agentType: { type: String, default: null },
    orderId: { type: String, default: null }, // Populated for Razorpay transactions
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default model("CreditLedger", creditLedgerSchema);
