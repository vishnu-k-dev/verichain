import mongoose from "mongoose";
import { baseToJSON } from "./baseTransform.js";

export const ROLES = ["admin", "institution", "student", "verifier"];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    // institutionId or studentId this account is bound to (null for admin/verifier).
    linkedId: { type: String, default: null },
    // Hash of the current refresh token (for rotation / logout invalidation).
    refreshTokenHash: { type: String, default: null, select: false },
  },
  { timestamps: true, toJSON: baseToJSON }
);

export const User = mongoose.model("User", userSchema);
export default User;
