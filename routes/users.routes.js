import express from "express";
import { UsersController } from "../controllers/users.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordReset,
} from "../validators/users.validator.js";
import { apiLimiter as rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// Public routes
router.post(
  "/register",
  rateLimit,
  validateUserRegistration,
  UsersController.register
);
router.post("/login", rateLimit, validateUserLogin, UsersController.login);
router.post(
  "/forgot-password",
  rateLimit,
  validatePasswordReset,
  UsersController.forgotPassword
);
router.post(
  "/reset-password",
  rateLimit,
  validatePasswordReset,
  UsersController.resetPassword
);

// Protected routes
router.get("/profile", authenticate, UsersController.getProfile);
router.put(
  "/profile",
  authenticate,
  validateUserUpdate,
  UsersController.updateProfile
);

// Admin only routes
router.get("/", authenticate, requireAdmin, UsersController.getAllUsers);
router.get("/:id", authenticate, requireAdmin, UsersController.getUserById);
router.delete("/:id", authenticate, requireAdmin, UsersController.deleteUser);
router.put(
  "/:id/approve",
  authenticate,
  requireAdmin,
  UsersController.approveInstructor
);
router.put(
  "/:id/reject",
  authenticate,
  requireAdmin,
  UsersController.rejectInstructor
);

export default router;
