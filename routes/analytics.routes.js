import express from "express";
import { AnalyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import rateLimitMiddleware from "../middleware/rateLimit.middleware.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import { analyticsValidator } from "../validators/analytics.validator.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
router.use(rateLimitMiddleware);

// Instructor Dashboard Routes
router.get(
  "/instructor/dashboard",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getDashboard),
  AnalyticsController.getInstructorDashboard
);

// Admin Dashboard Routes
router.get(
  "/admin/dashboard",
  requireRole(["admin"]),
  validateRequest(analyticsValidator.getAdminMetrics),
  AnalyticsController.getAdminDashboard
);

router.get(
  "/admin/metrics",
  requireRole(["admin"]),
  validateRequest(analyticsValidator.getAdminMetrics),
  AnalyticsController.getAdminMetrics
);

// Course Statistics Routes
router.get(
  "/courses/:courseId/stats",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getCourseStats),
  AnalyticsController.generateCourseStats
);

router.get(
  "/courses/:courseId/students",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getCourseStats),
  AnalyticsController.getCourseStudentPerformance
);

// Student Performance Routes
router.get(
  "/students/top",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getTopStudents),
  AnalyticsController.getTopStudents
);

router.get(
  "/students/:studentId/performance",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getStudentPerformance),
  AnalyticsController.getStudentPerformance
);

// Engagement and Trends Routes
router.get(
  "/engagement/weekly",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getEngagementTrends),
  AnalyticsController.getWeeklyEngagementTrends
);

router.get(
  "/trends/enrollment",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getEnrollmentTrends),
  AnalyticsController.getEnrollmentTrends
);

// Lesson Analytics Routes
router.get(
  "/lessons/completion-heatmap",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getLessonHeatmap),
  AnalyticsController.getLessonCompletionHeatmap
);

// Assessment Analytics Routes
router.get(
  "/assessments/stats",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getAssessmentStats),
  AnalyticsController.getAssessmentStats
);

// User Activity Routes
router.get(
  "/users/:userId/activity",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getUserActivity),
  AnalyticsController.getUserActivitySummary
);

// Export Routes
router.get(
  "/export",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.exportAnalytics),
  AnalyticsController.exportAnalytics
);

// Real-time Dashboard Routes
router.get(
  "/realtime/dashboard",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getRealtimeDashboard),
  AnalyticsController.getRealtimeDashboard
);

// Student's own analytics (limited access)
router.get(
  "/my/performance",
  requireRole(["student", "instructor", "admin"]),
  validateRequest(analyticsValidator.getMyPerformance),
  AnalyticsController.getMyPerformance
);

router.get(
  "/my/activity",
  requireRole(["student", "instructor", "admin"]),
  validateRequest(analyticsValidator.getMyActivity),
  AnalyticsController.getMyActivity
);

// Reporting Routes (Admin only)
router.get(
  "/admin/reports/courses",
  requireRole(["admin"]),
  validateRequest(analyticsValidator.getCoursesReport),
  AnalyticsController.getCoursesReport
);

router.get(
  "/instructor/:instructorId/reports/students",
  requireRole(["admin"]),
  validateRequest(analyticsValidator.getInstructorStudentsReport),
  AnalyticsController.getInstructorStudentsReport
);

router.get(
  "/reports/grades",
  requireRole(["instructor", "admin"]),
  validateRequest(analyticsValidator.getGradesReport),
  AnalyticsController.getGradesReport
);

// System Health Routes (Admin only)
router.get(
  "/admin/system/health",
  requireRole(["admin"]),
  AnalyticsController.getSystemHealth
);

export default router;
