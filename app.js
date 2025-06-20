/**
 * LMS Backend Express Application Configuration
 *
 * This file sets up the Express application with all middleware,
 * security configurations, routes, and error handling.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";

// Import middleware
import errorMiddleware from "./middleware/error.middleware.js";
import notFoundHandler from "./middleware/notFound.middleware.js";
import requestLogger from "./middleware/requestLogger.middleware.js";

const { errorHandler } = errorMiddleware;

// Import routes
import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import modulesRoutes from "./routes/modules.routes.js";
import lessonsRoutes from "./routes/lessons.routes.js";
import quizzesRoutes from "./routes/quizzes.routes.js";
import quizAttemptRoutes from "./routes/quiz-attempt.routes.js";
import assignmentsRoutes from "./routes/assignments.routes.js";
import enrollmentsRoutes from "./routes/enrollments.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import assignmentSubmissionRoutes from "./routes/assignment-submission.routes.js";

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil(
      (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000
    ),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Initialize passport for OAuth
app.use(passport.initialize());

// Auth Routes
app.use("/api/auth", authRoutes);
// User Routes
app.use("/api/users", usersRoutes);
// Course Routes
app.use("/api/courses", coursesRoutes);
// Module Routes
app.use("/api/modules", modulesRoutes);
// Lesson Routes
app.use("/api/lessons", lessonsRoutes);
// Quiz Routes
app.use("/api/quizzes", quizzesRoutes);
// Quiz Attempt Routes
app.use("/api/quiz-attempts", quizAttemptRoutes);
// Assignment Routes
app.use("/api/assignments", assignmentsRoutes);
// Enrollment Routes
app.use("/api/enrollments", enrollmentsRoutes);
// Category Routes
app.use("/api/categories", categoryRoutes);
// Analytics Routes
app.use("/api/analytics", analyticsRoutes);
// Assignment Submission Routes
app.use("/api/assignment-submissions", assignmentSubmissionRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// EXPORT APP
// ============================================================================

export default app;
