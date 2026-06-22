import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { role } from "../middleware/role.js";
import { upload, handleUploadErrors } from "../middleware/upload.js";
import {
  issueTranscript,
  getTranscript,
  getStudentTranscripts,
  listTranscripts,
  revokeTranscript,
  downloadTranscript,
} from "../controllers/transcript.controller.js";

const router = Router();

router.use(auth);

router.post(
  "/issue",
  role(["institution"]),
  upload.single("file"),
  handleUploadErrors,
  issueTranscript
);

router.get("/", role(["institution", "student", "admin"]), listTranscripts);
router.get("/student/:studentId", role(["institution", "student", "admin"]), getStudentTranscripts);
router.get("/:id", role(["institution", "student", "admin"]), getTranscript);
router.get("/:id/download", role(["institution", "student", "admin"]), downloadTranscript);
router.post("/:id/revoke", role(["institution"]), revokeTranscript);

export default router;
