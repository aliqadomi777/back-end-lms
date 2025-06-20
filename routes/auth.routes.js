import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

// Google OAuth login
router.get("/google", AuthController.googleAuth);

// Google OAuth callback
router.get("/google/callback", AuthController.googleCallback);

// Token refresh endpoint
router.post("/refresh", AuthController.refreshToken);

export default router;
