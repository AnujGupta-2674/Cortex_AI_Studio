import { Schema, model } from "mongoose";

const userSchema = new Schema({
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String },
}, { timestamps: true });

const User = model('User', userSchema);

export default User;
