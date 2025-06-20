/**
 * LMS Backend Server Entry Point
 *
 * This file initializes and starts the Express server with all necessary
 * configurations including database connection, middleware, and routes.
 */

import "dotenv/config";
import app from "./app.js";
import db from "./config/database.js";

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

/**
 * Start the server
 */
async function startServer() {
  try {
    // Test database connection
    await db.raw("SELECT 1");
    console.log("✅ Database connection established successfully");

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 LMS Backend Server running on port ${PORT}`);
      console.log(`📊 Environment: ${NODE_ENV}`);
      console.log(`🔗 API Documentation: http://localhost:${PORT}/api-docs`);

      if (NODE_ENV === "development") {
        console.log(`🌐 Server URL: http://localhost:${PORT}`);
      }
    });

    // Graceful shutdown handling
    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received. Shutting down gracefully...");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server
startServer();
