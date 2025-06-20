import { UsersService } from "../services/users.service.js";

export class UsersController {
  static async register(req, res, next) {
    try {
      const userData = req.body;
      const result = await UsersService.createUser(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: "User registered successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await UsersService.authenticateUser(email, password);

      res.status(200).json({
        success: true,
        data: result,
        message: "Login successful",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await UsersService.getUserById(userId);

      res.status(200).json({
        success: true,
        data: user,
        message: "Profile retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      const result = await UsersService.updateUser(userId, updateData);

      res.status(200).json({
        success: true,
        data: result,
        message: "Profile updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllUsers(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "created_at",
        order = "desc",
        search = "",
      } = req.query;
      const result = await UsersService.getAllUsers({
        page,
        limit,
        sort,
        order,
        search,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: "Users retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await UsersService.deleteUser(id);

      res.status(200).json({
        success: true,
        data: null,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveInstructor(req, res, next) {
    try {
      const { id } = req.params;
      const result = await UsersService.approveInstructor(id);

      res.status(200).json({
        success: true,
        data: result,
        message: "Instructor approved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectInstructor(req, res, next) {
    try {
      const { id } = req.params;
      const result = await UsersService.rejectInstructor(id);

      res.status(200).json({
        success: true,
        data: result,
        message: "Instructor rejected successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      await UsersService.initiatePasswordReset(email);

      res.status(200).json({
        success: true,
        data: null,
        message: "Password reset email sent",
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      await UsersService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        data: null,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UsersService.getUserById(id);
      res.status(200).json({
        success: true,
        data: user,
        message: "User profile retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
