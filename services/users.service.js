import UserModel from "../models/User.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AppError } from "../utils/AppError.js";
import { validateEmail, validatePassword } from "../utils/validation.js";
import { paginate } from "../utils/pagination.js";
import { sendPasswordResetEmail } from "../utils/email.js";

export class UsersService {
  static async createUser(userData) {
    const {
      name,
      email,
      password,
      role = "student",
      oauth_provider,
      oauth_id,
    } = userData;

    // Validate email
    if (!validateEmail(email)) {
      throw AppError.badRequest("Invalid email format");
    }
    // Validate password if provided
    if (password && !validatePassword(password)) {
      throw AppError.badRequest("Password does not meet requirements");
    }
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw AppError.conflict("User with this email already exists");
    }

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString("hex");

    const newUser = await UserModel.create({
      name,
      email,
      password,
      role,
      oauth_provider,
      oauth_id,
      verification_token,
      approval_status: role === "instructor" ? "pending" : null,
    });

    return UsersService.sanitizeUser(newUser);
  }

  static async authenticateUser(email, password) {
    if (!validateEmail(email)) {
      throw AppError.badRequest("Invalid email format");
    }
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized("Invalid credentials");
    }

    if (!user.is_active) {
      throw AppError.forbidden("Account is deactivated");
    }

    if (user.role === "instructor" && user.approval_status !== "approved") {
      throw AppError.forbidden("Instructor account is not approved yet");
    }

    if (!user.password_hash) {
      throw AppError.badRequest("Please use OAuth login");
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Save session
    await UserModel.createSession(user.id, token);

    return {
      user: UsersService.sanitizeUser(user),
      token,
    };
  }

  static async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    return UsersService.sanitizeUser(user);
  }

  static async updateUser(id, updateData) {
    const allowedFields = ["name", "theme_preference", "language_preference"];
    const filteredData = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw AppError.badRequest("No valid fields to update");
    }

    const updatedUser = await UserModel.update(id, filteredData);
    if (!updatedUser) {
      throw AppError.notFound("User not found");
    }

    return UsersService.sanitizeUser(updatedUser);
  }

  static async getAllUsers({
    page = 1,
    limit = 10,
    sort = "created_at",
    order = "desc",
    search = "",
  }) {
    const { data: users, pagination } = await UserModel.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
    });

    return {
      data: users.map(UsersService.sanitizeUser),
      pagination,
    };
  }

  static async deleteUser(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    await UserModel.softDelete(id);
    return true;
  }

  static async approveInstructor(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.role !== "instructor") {
      throw AppError.badRequest("User is not an instructor");
    }

    if (user.approval_status === "approved") {
      throw AppError.conflict("Instructor is already approved");
    }

    const updatedUser = await UserModel.updateApprovalStatus(id, "approved");
    return UsersService.sanitizeUser(updatedUser);
  }

  static async rejectInstructor(id) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (user.role !== "instructor") {
      throw AppError.badRequest("User is not an instructor");
    }

    const updatedUser = await UserModel.updateApprovalStatus(id, "rejected");
    return UsersService.sanitizeUser(updatedUser);
  }

  static async initiatePasswordReset(email) {
    if (!validateEmail(email)) {
      return true;
    }
    const user = await UserModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await UserModel.setResetToken(user.id, resetToken, resetTokenExpiry);

    // Send email with reset token
    await sendPasswordResetEmail(user, resetToken);

    return true;
  }

  static async resetPassword(token, newPassword) {
    if (!validatePassword(newPassword)) {
      throw AppError.badRequest("Password does not meet requirements");
    }
    const user = await UserModel.findByResetToken(token);
    if (!user) {
      throw AppError.badRequest("Invalid or expired reset token");
    }

    if (new Date() > user.reset_token_expiry) {
      throw AppError.badRequest("Reset token has expired");
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(user.id, password_hash);
    await UserModel.clearResetToken(user.id);

    return true;
  }

  static async verifyEmail(token) {
    const user = await UserModel.findByVerificationToken(token);
    if (!user) {
      throw AppError.badRequest("Invalid verification token");
    }

    await UserModel.verifyUser(user.id);
    return true;
  }

  static async logout(token) {
    await UserModel.deleteSession(token);
    return true;
  }

  static sanitizeUser(user) {
    if (!user) return null;
    const {
      id,
      name,
      email,
      role,
      approval_status,
      oauth_provider,
      oauth_id,
      theme_preference,
      language_preference,
      is_active,
      is_verified,
      verified_at,
      created_at,
      updated_at,
    } = user;
    return {
      id,
      name,
      email,
      role,
      approval_status,
      oauth_provider,
      oauth_id,
      theme_preference,
      language_preference,
      is_active,
      is_verified,
      verified_at,
      created_at,
      updated_at,
    };
  }
}

export default UsersService;
