import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { baseToJSON } from "./baseTransform.js";

const institutionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Short human-friendly code students use at signup (e.g. "ALPHA-UNI").
    institutionCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    walletAddress: { type: String, default: null },
    // HD wallet derivation index for this institution's custodial signer.
    walletIndex: { type: Number, default: null },
    isApproved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    // True once the on-chain registerInstitution tx has confirmed.
    onChain: { type: Boolean, default: false },
    registrationTxHash: { type: String, default: null },
  },
  { timestamps: true, toJSON: baseToJSON }
);

export const Institution = mongoose.model("Institution", institutionSchema);
export default Institution;
