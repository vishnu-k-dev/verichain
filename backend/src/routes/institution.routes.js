import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { role } from "../middleware/role.js";
import {
  createInstitution,
  listInstitutions,
  approveInstitution,
  listInstitutionStudents,
  myInstitution,
  listAllUsers,
} from "../controllers/institution.controller.js";

const router = Router();

router.use(auth);

// Institution self-service.
router.get("/me", role(["institution"]), myInstitution);

// Admin panel.
router.get("/admin/users", role(["admin"]), listAllUsers);

router.post("/register", role(["admin"]), createInstitution);
router.get("/", role(["admin"]), listInstitutions);
router.patch("/:id/approve", role(["admin"]), approveInstitution);

// Institution roster (institution self / admin).
router.get("/:id/students", role(["institution", "admin"]), listInstitutionStudents);

export default router;
