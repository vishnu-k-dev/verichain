import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { role } from "../middleware/role.js";
import {
  registerStudent,
  getStudent,
  me,
} from "../controllers/student.controller.js";

const router = Router();

router.use(auth);

router.get("/me", role(["student"]), me);
router.post("/register", role(["institution", "admin"]), registerStudent);
router.get("/:id", role(["institution", "student", "admin"]), getStudent);

export default router;
