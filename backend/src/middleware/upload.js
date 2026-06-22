import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Multer config: in-memory storage, PDF only, 10 MB max. Files arrive as
 * `req.file.buffer` ready for hashing / IPFS upload.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(ApiError.badRequest("Only PDF files are allowed", "INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

/** Translate Multer's own errors into our ApiError shape. */
export function handleUploadErrors(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(ApiError.badRequest("File exceeds 10MB limit", "FILE_TOO_LARGE"));
    }
    return next(ApiError.badRequest(err.message, "UPLOAD_ERROR"));
  }
  return next(err);
}

export default upload;
