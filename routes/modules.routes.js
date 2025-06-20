import express from "express";
import { ModulesController } from "../controllers/modules.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireInstructor from "../middleware/requireInstructor.js";
import {
  validateModuleCreation,
  validateModuleUpdate,
  validateModuleReorder,
} from "../validators/modules.validator.js";

const router = express.Router();

// Public/Student routes (with optional authentication)
router.get(
  "/course/:course_id",
  authenticate,
  ModulesController.getCourseModules
);
router.get("/:id", authenticate, ModulesController.getModuleById);
router.get("/:id/progress", authenticate, ModulesController.getModuleProgress);

// Instructor routes
router.post(
  "/course/:course_id",
  authenticate,
  requireInstructor,
  validateModuleCreation,
  ModulesController.createModule
);
router.put(
  "/:id",
  authenticate,
  requireInstructor,
  validateModuleUpdate,
  ModulesController.updateModule
);
router.delete(
  "/:id",
  authenticate,
  requireInstructor,
  ModulesController.deleteModule
);
router.put(
  "/course/:course_id/reorder",
  authenticate,
  requireInstructor,
  validateModuleReorder,
  ModulesController.reorderModules
);
router.post(
  "/:id/duplicate",
  authenticate,
  requireInstructor,
  ModulesController.duplicateModule
);

export default router;
