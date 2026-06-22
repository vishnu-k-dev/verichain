import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Institution } from "../models/Institution.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import * as chain from "./blockchain.service.js";

const BCRYPT_ROUNDS = 12;

/**
 * Allocate the next custodial HD-wallet index for an institution.
 * Index 0 is reserved for the operator/owner wallet, so institutions start at 1.
 */
async function nextWalletIndex() {
  const count = await Institution.countDocuments({ walletIndex: { $ne: null } });
  return count + 1;
}

/**
 * Create an Institution record (off-chain). On-chain whitelisting happens at
 * approval time via {@link approveInstitution}.
 */
export async function createInstitution({ name, email, institutionCode }) {
  const code = institutionCode?.trim().toUpperCase();
  if (!name || !email || !code) {
    throw ApiError.badRequest("name, email and institutionCode are required");
  }

  const existing = await Institution.findOne({ institutionCode: code });
  if (existing) throw ApiError.conflict("Institution code already in use", "CODE_TAKEN");

  const institutionId = uuidv4();
  const walletIndex = await nextWalletIndex();
  const walletAddress = chain.isConfigured() ? chain.addressForIndex(walletIndex) : null;

  const institution = await Institution.create({
    institutionId,
    name,
    email,
    institutionCode: code,
    walletIndex,
    walletAddress,
  });

  logger.info(`Institution created: ${name} (${code}) index=${walletIndex}`);
  return institution;
}

/**
 * Approve an institution and whitelist its wallet on-chain.
 * @param {string} institutionId
 */
export async function approveInstitution(institutionId) {
  const institution = await Institution.findOne({ institutionId });
  if (!institution) throw ApiError.notFound("Institution not found");
  if (institution.isApproved && institution.onChain) return institution;

  institution.isApproved = true;
  institution.approvedAt = new Date();

  // Anchor on-chain (best-effort: if chain isn't configured we still approve
  // in the DB so local dev without a node keeps working).
  if (chain.isConfigured()) {
    if (!institution.walletAddress) {
      institution.walletAddress = chain.addressForIndex(institution.walletIndex);
    }
    const already = await chain
      .isInstitutionRegistered(institution.walletAddress)
      .catch(() => false);
    if (!already) {
      const { txHash } = await chain.registerInstitution({
        institutionId: institution.institutionId,
        name: institution.name,
        walletAddress: institution.walletAddress,
      });
      institution.registrationTxHash = txHash;
    }
    institution.onChain = true;
  }

  await institution.save();
  logger.info(`Institution approved: ${institution.name}`);
  return institution;
}

/**
 * Provision a student: create the Student record, an optional auth User, and
 * anchor the student on-chain under the institution's custodial wallet.
 *
 * @returns {{ student, user }}
 */
export async function provisionStudent({ name, email, institutionId, password }) {
  if (!name || !email || !institutionId) {
    throw ApiError.badRequest("name, email and institutionId are required");
  }

  const institution = await Institution.findOne({ institutionId });
  if (!institution) throw ApiError.notFound("Institution not found");
  if (!institution.isApproved) {
    throw ApiError.forbidden("Institution is not approved yet", "INSTITUTION_NOT_APPROVED");
  }

  const emailLower = email.toLowerCase().trim();
  if (await User.findOne({ email: emailLower })) {
    throw ApiError.conflict("An account with that email already exists", "EMAIL_TAKEN");
  }

  const studentId = uuidv4();
  const student = await Student.create({ studentId, name, email: emailLower, institutionId });

  // Anchor on-chain using the institution's custodial signer.
  if (chain.isConfigured() && institution.onChain) {
    try {
      const { txHash } = await chain.registerStudent({
        walletIndex: institution.walletIndex,
        studentId,
        name,
        email: emailLower,
        institutionId,
      });
      student.onChain = true;
      student.registrationTxHash = txHash;
      await student.save();
    } catch (err) {
      // Roll back the half-created student so the caller can retry cleanly.
      await Student.deleteOne({ studentId });
      throw err;
    }
  }

  // Create the linked login if a password was provided (self-service signup or
  // institution-set initial password).
  let user = null;
  if (password) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user = await User.create({
      email: emailLower,
      passwordHash,
      role: "student",
      linkedId: studentId,
    });
    student.userId = user.id;
    await student.save();
  }

  return { student, user };
}

export default { createInstitution, approveInstitution, provisionStudent };
