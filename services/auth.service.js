/**
 * Authentication Service
 *
 * This service handles all authentication-related functionality for the LMS,
 * including OAuth, email verification, and password reset.
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/app.config.js";
import UserModel from "../models/User.model.js";
import { AppError } from "../utils/AppError.js";
import UserSessionModel from "../models/UserSession.model.js";

export class AuthService {
  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} Authentication result
   */
  static async authenticate(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw AppError.unauthorized("Invalid credentials");
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) throw AppError.unauthorized("Invalid credentials");
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.security.jwtSecret,
      { expiresIn: config.security.jwtExpiration }
    );
    return {
      user: UserModel.sanitize(user),
      token,
    };
  }

  /**
   * Authenticate user with OAuth
   * @param {string} provider - OAuth provider
   * @param {string} oauthId - OAuth ID
   * @param {Object} userData - User data from OAuth provider
   * @returns {Object} Authentication result
   */
  static async authenticateOAuth(provider, oauthId, userData) {
    let user = await UserModel.findByOAuth(provider, oauthId);
    if (!user) {
      user = await UserModel.createOAuthUser(provider, oauthId, userData);
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.security.jwtSecret,
      { expiresIn: config.security.jwtExpiration }
    );
    return {
      user: UserModel.sanitize(user),
      token,
    };
  }

  /**
   * Send verification email
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  static async sendVerificationEmail(userId) {
    const user = await UserModel.findById(userId);
    if (!user) throw AppError.notFound("User not found");
    const token = jwt.sign(
      { id: user.id, email: user.email, purpose: "verification" },
      config.security.jwtSecret,
      { expiresIn: "24h" }
    );
    await UserModel.setVerificationToken(userId, token);
    // TODO: Send verification email with token
    return true;
  }

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {boolean} Success status
   */
  static async verifyEmail(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, config.security.jwtSecret);
    } catch (err) {
      throw AppError.unauthorized("Invalid or expired token");
    }
    if (decoded.purpose !== "verification")
      throw AppError.badRequest("Invalid token");
    return await UserModel.verifyEmail(decoded.id, token);
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {boolean} Success status
   */
  static async sendPasswordResetEmail(email) {
    const user = await UserModel.findByEmail(email);
    if (!user) throw AppError.notFound("User not found");
    const token = jwt.sign(
      { id: user.id, email: user.email, purpose: "password_reset" },
      config.security.jwtSecret,
      { expiresIn: "1h" }
    );
    await UserModel.setResetToken(user.id, token);
    // TODO: Send password reset email with token
    return true;
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  static async resetPassword(token, newPassword) {
    let decoded;
    try {
      decoded = jwt.verify(token, config.security.jwtSecret);
    } catch (err) {
      throw AppError.unauthorized("Invalid or expired token");
    }
    if (decoded.purpose !== "password_reset")
      throw AppError.badRequest("Invalid token");
    const password_hash = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );
    return await UserModel.resetPassword(decoded.id, token, password_hash);
  }

  /**
   * Refresh JWT using a refresh token
   * @param {string} refreshToken
   * @returns {Object} New access token and user info
   */
  static async refreshToken(refreshToken) {
    // Verify session exists for this refresh token
    const session = await UserSessionModel.findByToken(refreshToken);
    if (!session)
      throw AppError.unauthorized("Invalid or expired refresh token");
    // Optionally: check session expiry, user status, etc.
    const user = await UserModel.findById(session.user_id);
    if (!user) throw AppError.unauthorized("User not found");
    // Issue new access token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.security.jwtSecret,
      { expiresIn: config.security.jwtExpiration }
    );
    return {
      user: UserModel.sanitize(user),
      token,
    };
  }
}
