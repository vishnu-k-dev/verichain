import crypto from "crypto";

/**
 * SHA-256 of a Buffer, returned as lowercase hex.
 * This is the canonical fingerprint anchored on-chain and re-computed by
 * verifiers to prove a document is byte-for-byte unmodified.
 *
 * @param {Buffer} buffer
 * @returns {string} 64-char hex digest
 */
export const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

export default { sha256 };
