import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User.js";
import { Institution } from "../models/Institution.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  issueTokenPair,
  verifyRefreshToken,
  signAccessToken,
} from "../utils/jwt.js";
import * as provision from "../services/provision.service.js";

const BCRYPT_ROUNDS = 12;
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

/** Persist the refresh-token hash so it can be rotated / revoked. */
async function persistRefresh(userId, refreshToken) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: hashToken(refreshToken) });
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, linkedId: user.linkedId };
}

/**
 * POST /api/auth/register
 * Self-service signup. Roles:
 *  - verifier   → no extra data
 *  - student    → requires a valid institutionCode (mapped to approved inst.)
 *  - institution→ creates an unapproved institution + login (admin approves)
 *  - admin      → only allowed to bootstrap the very first admin
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, role, institutionCode, name } = req.body;

  if (!email || !password || !role) {
    throw ApiError.badRequest("email, password and role are required");
  }
  if (password.length < 8) {
    throw ApiError.badRequest("Password must be at least 8 characters", "WEAK_PASSWORD");
  }

  const allowedSelfRoles = ["verifier", "student", "institution", "admin"];
  if (!allowedSelfRoles.includes(role)) {
    throw ApiError.badRequest("Invalid role", "INVALID_ROLE");
  }

  const emailLower = email.toLowerCase().trim();
  if (await User.findOne({ email: emailLower })) {
    throw ApiError.conflict("An account with that email already exists", "EMAIL_TAKEN");
  }

  // --- student: provision via the institution custodial flow ---
  if (role === "student") {
    if (!institutionCode) throw ApiError.badRequest("institutionCode is required for students");
    const institution = await Institution.findOne({
      institutionCode: institutionCode.trim().toUpperCase(),
    });
    if (!institution || !institution.isApproved) {
      throw ApiError.badRequest("Unknown or unapproved institution code", "BAD_INSTITUTION_CODE");
    }
    const { user } = await provision.provisionStudent({
      name: name || emailLower.split("@")[0],
      email: emailLower,
      institutionId: institution.institutionId,
      password,
    });
    const tokens = issueTokenPair(user);
    await persistRefresh(user.id, tokens.refreshToken);
    return res.status(201).json({ success: true, ...tokens, user: publicUser(user) });
  }

  // --- admin bootstrap: only when no admin exists yet ---
  if (role === "admin") {
    const adminExists = await User.exists({ role: "admin" });
    if (adminExists) {
      throw ApiError.forbidden("Admin already provisioned", "ADMIN_EXISTS");
    }
  }

  // --- institution: create the org record first, link the login to it ---
  let linkedId = null;
  if (role === "institution") {
    if (!name || !institutionCode) {
      throw ApiError.badRequest("name and institutionCode are required for institutions");
    }
    const institution = await provision.createInstitution({
      name,
      email: emailLower,
      institutionCode,
    });
    linkedId = institution.institutionId;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ email: emailLower, passwordHash, role, linkedId });

  const tokens = issueTokenPair(user);
  await persistRefresh(user.id, tokens.refreshToken);
  return res.status(201).json({ success: true, ...tokens, user: publicUser(user) });
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest("email and password are required");

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash"
  );
  if (!user) throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");

  const tokens = issueTokenPair(user);
  await persistRefresh(user.id, tokens.refreshToken);
  return res.json({ success: true, ...tokens, user: publicUser(user) });
});

/**
 * POST /api/auth/refresh
 * Validates the refresh token against the stored hash (rotation-safe) and
 * issues a new access token.
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest("refreshToken is required");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token", "INVALID_REFRESH");
  }

  const user = await User.findById(payload.userId).select("+refreshTokenHash");
  if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw ApiError.unauthorized("Refresh token revoked", "REFRESH_REVOKED");
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    linkedId: user.linkedId,
  });
  return res.json({ success: true, accessToken });
});

/**
 * POST /api/auth/logout
 * Clears the stored refresh-token hash.
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.user?.userId) {
    await User.findByIdAndUpdate(req.user.userId, { refreshTokenHash: null });
  }
  return res.json({ success: true, message: "Logged out" });
});

/**
 * GET /api/auth/me — current user profile.
 */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw ApiError.notFound("User not found");
  return res.json({ success: true, user: publicUser(user) });
});
