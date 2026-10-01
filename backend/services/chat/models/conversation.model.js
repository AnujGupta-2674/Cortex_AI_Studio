import { Schema, model } from "mongoose";

const conversationSchema = new Schema({
    title: {
        type: String,
        default: "New Chat",
        trim: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    }
}, { timestamps: true });

// Compound index for querying user's conversations sorted by latest activity
conversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = model("Conversation", conversationSchema);
export default Conversation;