/**
 * UserWishlist Model
 *
 * Manages user course wishlists and favorites.
 */

import db from "../config/database.js";
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class UserWishlistModel {
  /**
   * Get wishlist item by ID
   * @param {number} id - Wishlist item ID
   * @returns {Object|null} Wishlist item or null
   */
  static async findById(id) {
    try {
      const item = await db("user_course_wishlist")
        .select(
          "user_course_wishlist.*",
          "courses.title as course_title",
          "courses.description as course_description",
          "courses.thumbnail_url",
          "users.name as instructor_name"
        )
        .leftJoin("courses", "user_course_wishlist.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("user_course_wishlist.id", id)
        .first();
      return UserWishlistModel.sanitizeWishlistItem(item);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get user's wishlist
   * @param {number} userId - User ID
   * @returns {Array} User's wishlist items
   */
  static async getByUser(userId) {
    try {
      const items = await db("user_course_wishlist")
        .select(
          "user_course_wishlist.*",
          "courses.title as course_title",
          "courses.description as course_description",
          "courses.thumbnail_url",
          "courses.is_published",
          "courses.is_approved",
          "users.name as instructor_name"
        )
        .leftJoin("courses", "user_course_wishlist.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("user_course_wishlist.user_id", userId)
        .orderBy("user_course_wishlist.created_at", "desc");
      return items.map(UserWishlistModel.sanitizeWishlistItem);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Check if course is in user's wishlist
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @returns {boolean} Is in wishlist
   */
  static async isInWishlist(userId, courseId) {
    try {
      const item = await db("user_course_wishlist")
        .where({
          user_id: userId,
          course_id: courseId
        })
        .first();

      return !!item;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add course to wishlist
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @returns {Object} Created wishlist item
   */
  static async addToWishlist(userId, courseId) {
    try {
      // Validate user exists
      const user = await db("users").where("id", userId).first();
      if (!user) {
        throw AppError.notFound("User not found");
      }

      // Validate course exists
      const course = await db("courses").where("id", courseId).first();
      if (!course) {
        throw AppError.notFound("Course not found");
      }

      // Check if already in wishlist
      const existing = await db("user_course_wishlist")
        .where({
          user_id: userId,
          course_id: courseId
        })
        .first();

      if (existing) {
        throw AppError.conflict("Course is already in wishlist");
      }

      const [wishlistItem] = await db("user_course_wishlist")
        .insert({
          user_id: userId,
          course_id: courseId,
          created_at: db.fn.now()
        })
        .returning("*");

      return UserWishlistModel.sanitizeWishlistItem(wishlistItem);
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Remove course from wishlist
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @returns {boolean} Success status
   */
  static async removeFromWishlist(userId, courseId) {
    try {
      const result = await db("user_course_wishlist")
        .where({
          user_id: userId,
          course_id: courseId
        })
        .del();

      return result > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove wishlist item by ID
   * @param {number} id - Wishlist item ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    try {
      // Check if wishlist item exists
      const item = await db("user_course_wishlist").where("id", id).first();
      if (!item) {
        throw AppError.notFound("Wishlist item not found");
      }

      await db("user_course_wishlist").where("id", id).del();
      return true;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Clear user's wishlist
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  static async clearWishlist(userId) {
    try {
      await db("user_course_wishlist")
        .where("user_id", userId)
        .del();

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get wishlist statistics
   * @param {number} userId - User ID
   * @returns {Object} Wishlist statistics
   */
  static async getStats(userId) {
    try {
      const totalItems = await db("user_course_wishlist")
        .where("user_id", userId)
        .count("id as count")
        .first();

      const publishedCourses = await db("user_course_wishlist")
        .select("user_course_wishlist.*")
        .leftJoin("courses", "user_course_wishlist.course_id", "courses.id")
        .where("user_course_wishlist.user_id", userId)
        .where("courses.is_published", true)
        .where("courses.is_approved", true)
        .count("user_course_wishlist.id as count")
        .first();

      return {
        total: parseInt(totalItems.count),
        published: parseInt(publishedCourses.count),
        unpublished: parseInt(totalItems.count) - parseInt(publishedCourses.count)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get wishlist with pagination
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Wishlist with pagination
   */
  static async getByUserPaginated(userId, options = {}) {
    try {
      const params = parsePaginationParams(options);
      let query = db("user_course_wishlist")
        .select(
          "user_course_wishlist.*",
          "courses.title as course_title",
          "courses.description as course_description",
          "courses.thumbnail_url",
          "courses.is_published",
          "courses.is_approved",
          "users.name as instructor_name"
        )
        .leftJoin("courses", "user_course_wishlist.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("user_course_wishlist.user_id", userId)
        .orderBy("user_course_wishlist.created_at", "desc");

      // Filter by published status if requested
      if (params.published_only) {
        query = query.where("courses.is_published", true).where("courses.is_approved", true);
      }

      // Get total count
      const totalQuery = query.clone();
      const [{ count }] = await totalQuery.count("user_course_wishlist.id as count");
      const total = parseInt(count);

      // Apply pagination
      const items = await query.limit(params.limit).offset(params.offset);

      return {
        data: items.map(UserWishlistModel.sanitizeWishlistItem),
        pagination: createPaginationMeta(total, params)
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get popular wishlisted courses
   * @param {number} limit - Number of courses to return
   * @returns {Array} Popular wishlisted courses
   */
  static async getPopularWishlisted(limit = 10) {
    try {
      const items = await db("user_course_wishlist")
        .select("course_id")
        .count("id as wishlist_count")
        .groupBy("course_id")
        .orderBy("wishlist_count", "desc")
        .limit(limit);
      return items;
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static async add({ user_id, course_id }) {
    return UserWishlistModel.addToWishlist(user_id, course_id);
  }

  static async remove({ user_id, course_id }) {
    return UserWishlistModel.removeFromWishlist(user_id, course_id);
  }

  static async getByUser(user_id) {
    return UserWishlistModel.getByUser(user_id);
  }

  static sanitizeWishlistItem(item) {
    if (!item) return null;
    const {
      id, user_id, course_id, created_at, course_title, course_description, thumbnail_url, is_published, is_approved, instructor_name
    } = item;
    return { id, user_id, course_id, created_at, course_title, course_description, thumbnail_url, is_published, is_approved, instructor_name };
  }
}

export default UserWishlistModel; 