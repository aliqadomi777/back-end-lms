/**
 * User Model
 *
 * This model handles all database operations related to users,
 * including authentication and profile management.
 */

import db from "../config/database.js";
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import {
  sanitizeString,
  sanitizeEmail,
  validatePassword,
} from "../utils/validation.js";
import {
  parsePaginationParams,
  createPaginationMeta,
} from "../utils/pagination.js";

class UserModel {
  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Object|null} User object or null
   */
  static async findById(id) {
    try {
      const user = await db("users")
        .where({ id })
        .whereNull("deleted_at")
        .first();
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    try {
      const user = await db("users")
        .where({ email: email.toLowerCase() })
        .whereNull("deleted_at")
        .first();
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async create(userData) {
    const trx = await db.transaction();
    try {
      let {
        name,
        email,
        password,
        role = "student",
        approval_status = null,
        oauth_provider = null,
        oauth_id = null,
        theme_preference = "light",
        language_preference = "en",
        is_active = true,
        is_verified = false,
        verified_at = null,
        verification_token = null,
        reset_token = null,
        reset_token_expiry = null,
      } = userData;

      // Validate and sanitize required fields
      name = sanitizeString(name, {
        trim: true,
        maxLength: 100,
        allowEmpty: false,
      });
      email = sanitizeEmail(email);
      if (!name || !email) {
        throw AppError.badRequest("Name and email are required");
      }

      // Validate role
      const validRoles = ["student", "instructor", "admin"];
      if (!validRoles.includes(role)) {
        throw AppError.badRequest("Invalid role");
      }

      // Check if email already exists
      const existingUser = await trx("users")
        .where({ email })
        .whereNull("deleted_at")
        .first();
      if (existingUser) {
        throw AppError.conflict("Email already exists");
      }

      // Hash password if provided
      let password_hash = null;
      if (password) {
        validatePassword(password);
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        password_hash = await bcrypt.hash(password, saltRounds);
      }

      // Set approval_status for instructors
      let finalApprovalStatus = approval_status;
      if (role === "instructor" && !approval_status) {
        finalApprovalStatus = "pending";
      } else if (role !== "instructor") {
        finalApprovalStatus = null;
      }

      const [user] = await trx("users")
        .insert({
          name,
          email,
          password_hash,
          role,
          approval_status: finalApprovalStatus,
          oauth_provider,
          oauth_id,
          theme_preference,
          language_preference,
          is_active,
          is_verified,
          verified_at,
          verification_token,
          reset_token,
          reset_token_expiry,
          deleted_at: null,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return UserModel.sanitizeUser(user);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async update(id, updateData) {
    const trx = await db.transaction();
    try {
      // Remove sensitive fields that shouldn't be updated directly
      let {
        password,
        id: userId,
        created_at,
        name,
        email,
        role,
        ...safeUpdateData
      } = updateData;

      // Validate user exists
      const user = await trx("users")
        .where({ id })
        .whereNull("deleted_at")
        .first();
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Validate and sanitize fields if being updated
      if (name) {
        name = sanitizeString(name, {
          trim: true,
          maxLength: 100,
          allowEmpty: false,
        });
        safeUpdateData.name = name;
      }
      if (email) {
        email = sanitizeEmail(email);
        // Check email uniqueness if being updated
        const existingUser = await trx("users")
          .where({ email })
          .where("id", "!=", id)
          .whereNull("deleted_at")
          .first();
        if (existingUser) {
          throw AppError.conflict("Email already exists");
        }
        safeUpdateData.email = email;
      }
      if (role) {
        const validRoles = ["student", "instructor", "admin"];
        if (!validRoles.includes(role)) {
          throw AppError.badRequest("Invalid role");
        }
        safeUpdateData.role = role;
        // Set approval_status for instructors
        if (role === "instructor" && !safeUpdateData.approval_status) {
          safeUpdateData.approval_status = "pending";
        } else if (role !== "instructor") {
          safeUpdateData.approval_status = null;
        }
      }
      // Hash password if provided
      if (password) {
        validatePassword(password);
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        safeUpdateData.password_hash = await bcrypt.hash(password, saltRounds);
      }

      const [updatedUser] = await trx("users")
        .where({ id })
        .whereNull("deleted_at")
        .update({
          ...safeUpdateData,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return UserModel.sanitizeUser(updatedUser);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Soft delete user
   * @param {number} id - User ID
   * @returns {boolean} Success status
   */
  static async softDelete(id) {
    const trx = await db.transaction();
    try {
      // Validate user exists
      const user = await trx("users")
        .where({ id })
        .whereNull("deleted_at")
        .first();
      if (!user) {
        throw AppError.notFound("User not found");
      }
      await trx("users").where({ id }).whereNull("deleted_at").update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  /**
   * Verify password
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {boolean} Password match status
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} Users and pagination info
   */
  static async getAll(options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("users").select("*").whereNull("deleted_at");
      if (options.role) {
        query = query.where("role", options.role);
      }
      if (options.search) {
        query = query.where(function () {
          this.where("name", "ilike", `%${options.search}%`).orWhere(
            "email",
            "ilike",
            `%${options.search}%`
          );
        });
      }
      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("id as count");
      const total = parseInt(count);
      // Apply pagination
      const users = await query
        .orderBy(params.sortBy || "created_at", params.sortOrder || "DESC")
        .limit(params.limit)
        .offset(params.offset);
      return {
        data: users.map(UserModel.sanitizeUser),
        pagination: createPaginationMeta(total, params),
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Update instructor approval status
   * @param {number} id - User ID
   * @param {string} status - Approval status (pending, approved, rejected)
   * @returns {Object} Updated user
   */
  static async updateApprovalStatus(id, status) {
    const trx = await db.transaction();
    try {
      // Validate status
      const validStatuses = ["pending", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        throw AppError.badRequest("Invalid approval status");
      }
      // Validate user exists and is an instructor
      const user = await trx("users")
        .where({ id, role: "instructor" })
        .whereNull("deleted_at")
        .first();
      if (!user) {
        throw AppError.notFound("Instructor not found");
      }
      const [updatedUser] = await trx("users")
        .where({ id, role: "instructor" })
        .whereNull("deleted_at")
        .update({
          approval_status: status,
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return UserModel.sanitizeUser(updatedUser);
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }

  static sanitizeUser(user) {
    if (!user) return null;
    const {
      password_hash,
      reset_token,
      reset_token_expiry,
      verification_token,
      ...safeUser
    } = user;
    return safeUser;
  }

  /**
   * Set password reset token and expiry
   * @param {number} userId
   * @param {string} token
   * @param {Date} expiry
   * @returns {boolean}
   */
  static async setResetToken(userId, token, expiry) {
    return await db("users").where({ id: userId }).update({
      reset_token: token,
      reset_token_expiry: expiry,
      updated_at: db.fn.now(),
    });
  }

  /**
   * Find user by reset token
   * @param {string} token
   * @returns {Object|null}
   */
  static async findByResetToken(token) {
    return await db("users")
      .where({ reset_token: token })
      .whereNull("deleted_at")
      .first();
  }

  /**
   * Update user password
   * @param {number} userId
   * @param {string} passwordHash
   * @returns {boolean}
   */
  static async updatePassword(userId, passwordHash) {
    return await db("users")
      .where({ id: userId })
      .update({ password_hash: passwordHash, updated_at: db.fn.now() });
  }

  /**
   * Clear reset token and expiry
   * @param {number} userId
   * @returns {boolean}
   */
  static async clearResetToken(userId) {
    return await db("users").where({ id: userId }).update({
      reset_token: null,
      reset_token_expiry: null,
      updated_at: db.fn.now(),
    });
  }

  /**
   * Create a new user session (for JWT)
   * @param {number} userId
   * @param {string} token
   * @returns {Object} Created session
   */
  static async createSession(userId, token) {
    const [session] = await db("user_sessions")
      .insert({
        user_id: userId,
        token,
        created_at: db.fn.now(),
        expires_at: db.raw(`CURRENT_TIMESTAMP + INTERVAL '7 days'`),
      })
      .returning("*");
    return session;
  }

  /**
   * Find user by OAuth provider and ID
   */
  static async findByOAuth(provider, oauthId) {
    try {
      const user = await db("users")
        .where({ oauth_provider: provider, oauth_id: oauthId })
        .whereNull("deleted_at")
        .first();
      return user || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new user from OAuth
   */
  static async createOAuthUser(provider, oauthId, userData) {
    const trx = await db.transaction();
    try {
      const {
        name,
        email,
        role = "student",
        theme_preference = "light",
        language_preference = "en",
        is_active = true,
        is_verified = true,
        verified_at = new Date(),
      } = userData;
      // Check if email already exists
      const existingUser = await trx("users")
        .where({ email })
        .whereNull("deleted_at")
        .first();
      if (existingUser) {
        throw AppError.conflict("Email already exists");
      }
      const [user] = await trx("users")
        .insert({
          name,
          email,
          role,
          oauth_provider: provider,
          oauth_id: oauthId,
          theme_preference,
          language_preference,
          is_active,
          is_verified,
          verified_at,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      await trx.commit();
      return user;
    } catch (error) {
      await trx.rollback();
      throw AppError.internal(error.message);
    }
  }
}

export default UserModel;
