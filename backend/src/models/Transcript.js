import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { baseToJSON } from "./baseTransform.js";

const transcriptSchema = new mongoose.Schema(
  {
    transcriptId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true,
    },
    studentId: { type: String, required: true, index: true },
    institutionId: { type: String, required: true, index: true },
    title: { type: String, default: "Academic Transcript" },

    // IPFS pointers for the QR-stamped, final PDF.
    ipfsHash: { type: String, required: true },
    ipfsCid: { type: String, required: true },

    // SHA-256 of the ORIGINAL uploaded PDF (this is what is anchored on-chain
    // and what verifiers re-compute). Indexed for upload-based verification.
    sha256Hash: { type: String, required: true, index: true },

    // Blockchain anchoring metadata.
    transactionHash: { type: String, default: null },
    blockNumber: { type: Number, default: null },

    // QR data.
    qrCodeUrl: { type: String, default: null }, // data URL (base64 PNG)
    qrCodeData: { type: String, default: null }, // the encoded verify URL

    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revocationTxHash: { type: String, default: null },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: baseToJSON }
);

export const Transcript = mongoose.model("Transcript", transcriptSchema);
export default Transcript;
