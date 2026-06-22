import { v4 as uuidv4 } from "uuid";
import { Transcript } from "../models/Transcript.js";
import { Student } from "../models/Student.js";
import { Institution } from "../models/Institution.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import { sha256 } from "../services/hash.service.js";
import * as ipfs from "../services/ipfs.service.js";
import * as qr from "../services/qr.service.js";
import { stampQRCode } from "../services/pdf.service.js";
import * as chain from "../services/blockchain.service.js";
import { logger } from "../utils/logger.js";

const verifyUrlFor = (transcriptId) =>
  `${env.frontendUrl.replace(/\/$/, "")}/verify/${transcriptId}`;

/**
 * POST /api/transcripts/issue  (institution)
 * multipart/form-data: { studentId, file (PDF) }
 *
 * Pipeline: QR → stamp PDF → hash stamped PDF → IPFS → anchor on-chain → save.
 * The hash anchored on-chain is of the *distributed* (QR-stamped) document, so a
 * verifier who re-hashes the file they received gets a match.
 */
export const issueTranscript = asyncHandler(async (req, res) => {
  const { studentId, title } = req.body;
  if (!req.file) throw ApiError.badRequest("A PDF file is required", "FILE_REQUIRED");
  if (!studentId) throw ApiError.badRequest("studentId is required");

  const institution = await Institution.findOne({ institutionId: req.user.linkedId });
  if (!institution) throw ApiError.notFound("Institution profile not found");

  const student = await Student.findOne({ studentId });
  if (!student) throw ApiError.notFound("Student not found");
  if (student.institutionId !== institution.institutionId) {
    throw ApiError.forbidden("Student does not belong to your institution");
  }

  // 1. Identity + QR.
  const transcriptId = uuidv4();
  const qrCodeData = verifyUrlFor(transcriptId);
  const [qrBuffer, qrCodeUrl] = await Promise.all([
    qr.generateQRBuffer(qrCodeData),
    qr.generateQRDataUrl(qrCodeData),
  ]);

  // 2. Stamp the QR onto the uploaded PDF.
  const stampedPdf = await stampQRCode(req.file.buffer, qrBuffer);

  // 3. Hash the final (stamped) document — this is the on-chain fingerprint.
  const sha256Hash = sha256(stampedPdf);

  // 4. Upload to IPFS.
  const { cid, url } = await ipfs.uploadFile(
    stampedPdf,
    `transcript-${transcriptId}.pdf`,
    { transcriptId, studentId, institutionId: institution.institutionId }
  );

  // 5. Anchor on-chain (if configured).
  let transactionHash = null;
  let blockNumber = null;
  let onChain = false;
  if (chain.isConfigured()) {
    const receipt = await chain.addTranscript({
      walletIndex: institution.walletIndex,
      transcriptId,
      studentId,
      ipfsHash: cid,
      sha256Hash,
    });
    transactionHash = receipt.txHash;
    blockNumber = receipt.blockNumber;
    onChain = true;
  } else {
    logger.warn("Blockchain not configured — transcript saved off-chain only");
  }

  // 6. Persist.
  const transcript = await Transcript.create({
    transcriptId,
    studentId,
    institutionId: institution.institutionId,
    title: title || "Academic Transcript",
    ipfsHash: cid,
    ipfsCid: cid,
    sha256Hash,
    transactionHash,
    blockNumber,
    qrCodeUrl,
    qrCodeData,
  });

  return res.status(201).json({
    success: true,
    transcript,
    onChain,
    ipfsUrl: url,
    downloadUrl: `/api/transcripts/${transcriptId}/download`,
    verifyUrl: qrCodeData,
  });
});

/**
 * GET /api/transcripts/:id  (institution / student-self / admin)
 */
export const getTranscript = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findOne({ transcriptId: req.params.id });
  if (!transcript) throw ApiError.notFound("Transcript not found");
  await assertCanRead(req, transcript);

  return res.json({ success: true, transcript });
});

/**
 * GET /api/transcripts/student/:studentId  (institution / student-self / admin)
 */
export const getStudentTranscripts = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (req.user.role === "student" && req.user.linkedId !== studentId) {
    throw ApiError.forbidden("Students can only access their own transcripts");
  }
  if (req.user.role === "institution") {
    const student = await Student.findOne({ studentId });
    if (!student || student.institutionId !== req.user.linkedId) {
      throw ApiError.forbidden("Student does not belong to your institution");
    }
  }

  const transcripts = await Transcript.find({ studentId }).sort({ createdAt: -1 });
  return res.json({ success: true, count: transcripts.length, transcripts });
});

/**
 * GET /api/transcripts  — list transcripts scoped to the caller.
 * institution → its own; student → own; admin → all.
 */
export const listTranscripts = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === "institution") filter = { institutionId: req.user.linkedId };
  else if (req.user.role === "student") filter = { studentId: req.user.linkedId };

  const transcripts = await Transcript.find(filter).sort({ createdAt: -1 }).limit(200);
  return res.json({ success: true, count: transcripts.length, transcripts });
});

/**
 * POST /api/transcripts/:id/revoke  (institution)
 */
export const revokeTranscript = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findOne({ transcriptId: req.params.id });
  if (!transcript) throw ApiError.notFound("Transcript not found");
  if (transcript.institutionId !== req.user.linkedId) {
    throw ApiError.forbidden("You can only revoke your own transcripts");
  }
  if (transcript.isRevoked) throw ApiError.conflict("Transcript already revoked");

  const institution = await Institution.findOne({ institutionId: req.user.linkedId });

  if (chain.isConfigured() && transcript.transactionHash) {
    const { txHash } = await chain.revokeTranscript({
      walletIndex: institution.walletIndex,
      transcriptId: transcript.transcriptId,
    });
    transcript.revocationTxHash = txHash;
  }

  transcript.isRevoked = true;
  transcript.revokedAt = new Date();
  await transcript.save();

  return res.json({ success: true, transcript });
});

/**
 * GET /api/transcripts/:id/download — proxy the QR-stamped PDF from IPFS.
 */
export const downloadTranscript = asyncHandler(async (req, res) => {
  const transcript = await Transcript.findOne({ transcriptId: req.params.id });
  if (!transcript) throw ApiError.notFound("Transcript not found");

  const buffer = await ipfs.fetchFile(transcript.ipfsCid);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="transcript-${transcript.transcriptId}.pdf"`
  );
  return res.send(buffer);
});

/** Authorisation helper for reading a single transcript. */
async function assertCanRead(req, transcript) {
  const { role, linkedId } = req.user;
  if (role === "admin") return;
  if (role === "institution" && transcript.institutionId === linkedId) return;
  if (role === "student" && transcript.studentId === linkedId) return;
  throw ApiError.forbidden("Not allowed to access this transcript");
}
