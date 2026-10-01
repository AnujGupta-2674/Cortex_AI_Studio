import { Schema, model } from "mongoose";

const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

// Compound index for fast chronological message retrieval in a conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = model("Message", messageSchema);
export default Message;