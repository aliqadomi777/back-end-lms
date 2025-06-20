/**
 * UserSession Model
 *
 * Manages user authentication sessions and tokens.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class UserSessionModel {
  /**
   * Get session by token
   * @param {string} token - Session token
   * @returns {Object|null} Session or null
   */
  static async findByToken(token) {
    try {
      const session = await db("user_sessions").where({ token }).first();
      return UserSessionModel.sanitizeSession(session);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get session by ID
   * @param {number} id - Session ID
   * @returns {Object|null} Session or null
   */
  static async findById(id) {
    try {
      const session = await db("user_sessions")
        .select("user_sessions.*", "users.name as user_name", "users.email as user_email")
        .leftJoin("users", "user_sessions.user_id", "users.id")
        .where("user_sessions.id", id)
        .first();
      return UserSessionModel.sanitizeSession(session);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get active sessions for user
   * @param {number} userId - User ID
   * @returns {Array} Active sessions
   */
  static async getByUser(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("user_sessions")
        .select("*")
        .where("user_id", userId)
        .where("expires_at", ">", db.fn.now());
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      // Apply pagination
      const sessions = await query.orderBy("created_at", "desc").limit(params.limit).offset(params.offset);
      return {
        data: sessions.map(UserSessionModel.sanitizeSession),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Create a new session
   * @param {Object} data - Session data
   * @returns {Object} Created session
   */
  static async create({ user_id, token, expires_at }) {
    try {
      if (!user_id || !token) throw AppError.badRequest("user_id and token required");
      // Validate user
      const user = await db("users").where({ id: user_id }).first();
      if (!user) throw AppError.notFound("User not found");
      const [session] = await db("user_sessions")
        .insert({ user_id, token, expires_at })
        .returning("*");
      return UserSessionModel.sanitizeSession(session);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update session expiry
   * @param {number} id - Session ID
   * @param {Date} expiresAt - New expiry date
   * @returns {Object} Updated session
   */
  static async updateExpiry(id, expiresAt) {
    try {
      // Check if session exists
      const session = await db("user_sessions").where("id", id).first();
      if (!session) {
        throw AppError.notFound("Session not found");
      }
      const [updatedSession] = await db("user_sessions")
        .where("id", id)
        .update({
          expires_at: expiresAt
        })
        .returning("*");
      return UserSessionModel.sanitizeSession(updatedSession);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete session
   * @param {number} id - Session ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if session exists
      const session = await db("user_sessions").where("id", id).first();
      if (!session) {
        throw AppError.notFound("Session not found");
      }
      await db("user_sessions").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete session by token
   * @param {string} token - Session token
   * @returns {boolean} Success status
   */
  static async deleteByToken(token) {
    try {
      await db("user_sessions").where({ token }).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Delete all sessions for user
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  static async deleteByUser(userId) {
    try {
      await db("user_sessions")
        .where("user_id", userId)
        .del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Clean up expired sessions
   * @returns {number} Number of deleted sessions
   */
  static async deleteExpired() {
    try {
      return await db("user_sessions").where("expires_at", "<", db.fn.now()).del();
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  static async getStats() {
    try {
      const totalSessions = await db("user_sessions").count("id as count").first();
      const activeSessions = await db("user_sessions")
        .where("expires_at", ">", db.fn.now())
        .count("id as count")
        .first();
      const expiredSessions = await db("user_sessions")
        .where("expires_at", "<", db.fn.now())
        .count("id as count")
        .first();
      return {
        total: parseInt(totalSessions.count),
        active: parseInt(activeSessions.count),
        expired: parseInt(expiredSessions.count)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Validate session token
   * @param {string} token - Session token
   * @returns {boolean} Valid status
   */
  static async isValidToken(token) {
    try {
      const session = await db("user_sessions")
        .where("token", token)
        .where("expires_at", ">", db.fn.now())
        .first();
      return !!session;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Extend session expiry
   * @param {string} token - Session token
   * @param {number} days - Days to extend
   * @returns {Object} Updated session
   */
  static async extendSession(token, days = 7) {
    try {
      const session = await db("user_sessions")
        .where("token", token)
        .first();
      if (!session) {
        throw AppError.notFound("Session not found");
      }
      const newExpiry = db.raw(`CURRENT_TIMESTAMP + INTERVAL '${days} days'`);
      const [updatedSession] = await db("user_sessions")
        .where("token", token)
        .update({
          expires_at: newExpiry
        })
        .returning("*");
      return UserSessionModel.sanitizeSession(updatedSession);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeSession(session) {
    if (!session) return null;
    // Remove or mask any internal fields if needed (e.g., token)
    // For now, just return the session as is
    const { id, user_id, expires_at, created_at, user_name, user_email } = session;
    return { id, user_id, expires_at, created_at, user_name, user_email };
  }
}

export default UserSessionModel; 