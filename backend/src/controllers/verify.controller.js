import { Transcript } from "../models/Transcript.js";
import { Student } from "../models/Student.js";
import { Institution } from "../models/Institution.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sha256 } from "../services/hash.service.js";
import * as ipfs from "../services/ipfs.service.js";
import * as chain from "../services/blockchain.service.js";

/**
 * Build the public verification result for a transcript document.
 * Cross-checks the blockchain when configured; otherwise trusts the DB record.
 *
 * @param {object} transcript Mongoose Transcript doc
 * @param {string} hashToCheck SHA-256 to verify against the on-chain anchor
 */
async function buildResult(transcript, hashToCheck) {
  const [student, institution] = await Promise.all([
    Student.findOne({ studentId: transcript.studentId }),
    Institution.findOne({ institutionId: transcript.institutionId }),
  ]);

  let isValid;
  let isRevoked = transcript.isRevoked;
  let issuedAt = Math.floor(new Date(transcript.issuedAt).getTime() / 1000);
  let source = "database";

  if (chain.isConfigured() && transcript.transactionHash) {
    try {
      const onChain = await chain.verifyTranscript(transcript.transcriptId, hashToCheck);
      isValid = onChain.isValid;
      isRevoked = onChain.isRevoked;
      issuedAt = onChain.issuedAt || issuedAt;
      source = "blockchain";
    } catch {
      // Fall back to DB comparison if the node is unreachable.
      isValid = !transcript.isRevoked && transcript.sha256Hash === hashToCheck;
    }
  } else {
    isValid = !transcript.isRevoked && transcript.sha256Hash === hashToCheck;
  }

  return {
    status: isRevoked ? "REVOKED" : isValid ? "VALID" : "INVALID",
    isValid,
    isRevoked,
    issuedAt,
    transcriptId: transcript.transcriptId,
    studentName: student?.name ?? "Unknown",
    institutionName: institution?.name ?? "Unknown",
    institutionId: transcript.institutionId,
    sha256Hash: transcript.sha256Hash,
    ipfsHash: transcript.ipfsHash,
    ipfsUrl: ipfs.getFileUrl(transcript.ipfsCid),
    transactionHash: transcript.transactionHash,
    blockNumber: transcript.blockNumber,
    verifiedVia: source,
  };
}

/**
 * GET /api/verify/:transcriptId  (PUBLIC)
 * Verifies a transcript by id using its recorded hash.
 */
export const verifyById = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findOne({ transcriptId: req.params.transcriptId });
  if (!transcript) {
    return res.status(404).json({
      success: true,
      status: "NOT_FOUND",
      isValid: false,
      message: "No record found for this transcript ID",
    });
  }

  const result = await buildResult(transcript, transcript.sha256Hash);
  return res.json({ success: true, ...result });
});

/**
 * POST /api/verify/upload  (PUBLIC)
 * Verifies an uploaded PDF by hashing it and matching against stored anchors.
 */
export const verifyByUpload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("A PDF file is required", "FILE_REQUIRED");

  const hash = sha256(req.file.buffer);
  const transcript = await Transcript.findOne({ sha256Hash: hash });

  if (!transcript) {
    return res.status(404).json({
      success: true,
      status: "NOT_FOUND",
      isValid: false,
      computedHash: hash,
      message: "This document does not match any issued transcript",
    });
  }

  const result = await buildResult(transcript, hash);
  return res.json({ success: true, computedHash: hash, ...result });
});

/**
 * GET /api/verify/:transcriptId/document  (PUBLIC)
 * Streams the QR-stamped PDF so verifiers can view the original document.
 */
export const viewDocument = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findOne({ transcriptId: req.params.transcriptId });
  if (!transcript) throw ApiError.notFound("Transcript not found");

  const buffer = await ipfs.fetchFile(transcript.ipfsCid);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="transcript-${transcript.transcriptId}.pdf"`
  );
  return res.send(buffer);
});
