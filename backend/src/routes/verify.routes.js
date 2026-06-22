import { Router } from "express";
import { upload, handleUploadErrors } from "../middleware/upload.js";
import { verifyById, verifyByUpload, viewDocument } from "../controllers/verify.controller.js";

// PUBLIC routes — no auth. Used by employers / verifiers.
const router = Router();

router.post("/upload", upload.single("file"), handleUploadErrors, verifyByUpload);
router.get("/:transcriptId/document", viewDocument);
router.get("/:transcriptId", verifyById);

export default router;
