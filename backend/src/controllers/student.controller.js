import { Student } from "../models/Student.js";
import { Institution } from "../models/Institution.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as provision from "../services/provision.service.js";

/**
 * Resolve the institutionId an institution user is allowed to act on.
 * Admins may target any institution via body.institutionId.
 */
function resolveInstitutionId(req) {
  if (req.user.role === "institution") return req.user.linkedId;
  return req.body.institutionId; // admin path
}

/**
 * POST /api/students/register  (institution / admin)
 * An institution can only register students under itself.
 */
export const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const institutionId = resolveInstitutionId(req);
  if (!institutionId) throw ApiError.badRequest("institutionId is required");

  if (req.user.role === "institution" && institutionId !== req.user.linkedId) {
    throw ApiError.forbidden("You can only register students to your own institution");
  }

  const { student, user } = await provision.provisionStudent({
    name,
    email,
    institutionId,
    password, // optional initial login password
  });

  return res.status(201).json({
    success: true,
    student,
    account: user ? { id: user.id, email: user.email, role: user.role } : null,
  });
});

/**
 * GET /api/students/:id  (institution / student-self / admin)
 */
export const getStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const student = await Student.findOne({ studentId });
  if (!student) throw ApiError.notFound("Student not found");

  // Authorisation rules.
  if (req.user.role === "student" && req.user.linkedId !== studentId) {
    throw ApiError.forbidden("Students can only access their own profile");
  }
  if (req.user.role === "institution" && student.institutionId !== req.user.linkedId) {
    throw ApiError.forbidden("Student does not belong to your institution");
  }

  const institution = await Institution.findOne({ institutionId: student.institutionId });
  return res.json({
    success: true,
    student,
    institution: institution ? { name: institution.name, code: institution.institutionCode } : null,
  });
});

/**
 * GET /api/students/me  (student) — the caller's own profile.
 */
export const me = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ studentId: req.user.linkedId });
  if (!student) throw ApiError.notFound("Student profile not found");
  return res.json({ success: true, student });
});
