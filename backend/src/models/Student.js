import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { baseToJSON } from "./baseTransform.js";

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    institutionId: { type: String, required: true, index: true },
    // Linked auth account (a User with role "student").
    userId: { type: String, default: null },
    onChain: { type: Boolean, default: false },
    registrationTxHash: { type: String, default: null },
  },
  { timestamps: true, toJSON: baseToJSON }
);

export const Student = mongoose.model("Student", studentSchema);
export default Student;
