import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.js";
// import { authenticate, requireAdmin } from '../middleware/auth.middleware.js'; // Uncomment if you want to restrict access

const router = express.Router();

// Public: Get all categories
router.get("/", CategoryController.getAllCategories);
// Public: Get category by ID
router.get("/:id", CategoryController.getCategoryById);
// Admin: Create category
router.post("/", authenticate, requireAdmin, CategoryController.createCategory);
// Admin: Update category
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  CategoryController.updateCategory
);
// Admin: Delete category
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  CategoryController.deleteCategory
);

export default router;
