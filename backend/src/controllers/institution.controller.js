import { Institution } from "../models/Institution.js";
import { Student } from "../models/Student.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as provision from "../services/provision.service.js";

/**
 * POST /api/institutions/register  (admin)
 * Create an institution record. Pass `approve: true` to whitelist it on-chain
 * immediately, otherwise approve later via PATCH /:id/approve.
 */
export const createInstitution = asyncHandler(async (req, res) => {
  const { name, email, institutionCode, approve } = req.body;
  let institution = await provision.createInstitution({ name, email, institutionCode });
  if (approve) {
    institution = await provision.approveInstitution(institution.institutionId);
  }
  return res.status(201).json({ success: true, institution });
});

/**
 * GET /api/institutions  (admin) — list all institutions.
 */
export const listInstitutions = asyncHandler(async (_req, res) => {
  const institutions = await Institution.find().sort({ createdAt: -1 });
  return res.json({ success: true, count: institutions.length, institutions });
});

/**
 * PATCH /api/institutions/:id/approve  (admin)
 */
export const approveInstitution = asyncHandler(async (req, res) => {
  const institution = await provision.approveInstitution(req.params.id);
  return res.json({ success: true, institution });
});

/**
 * GET /api/institutions/:id/students  (institution self / admin)
 */
export const listInstitutionStudents = asyncHandler(async (req, res) => {
  const institutionId = req.params.id;

  // An institution user may only read its own roster.
  if (req.user.role === "institution" && req.user.linkedId !== institutionId) {
    throw ApiError.forbidden("You can only view your own students");
  }

  const institution = await Institution.findOne({ institutionId });
  if (!institution) throw ApiError.notFound("Institution not found");

  const students = await Student.find({ institutionId }).sort({ createdAt: -1 });
  return res.json({ success: true, count: students.length, students });
});

/**
 * GET /api/institutions/me  (institution) — the caller's own institution.
 */
export const myInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findOne({ institutionId: req.user.linkedId });
  if (!institution) throw ApiError.notFound("Institution profile not found");
  return res.json({ success: true, institution });
});

/**
 * GET /api/institutions/admin/users  (admin) — all users, for the admin panel.
 */
export const listAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ success: true, count: users.length, users });
});
