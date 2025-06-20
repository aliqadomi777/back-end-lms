/**
 * Analytics Model
 * 
 * This model handles all database operations related to analytics and reporting,
 * including course analytics, user analytics, and system-wide statistics.
 */

import db from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { parsePaginationParams, createPaginationMeta } from '../utils/pagination.js';

class AnalyticsModel {
  /**
   * Get course analytics
   * @param {number} courseId - Course ID
   * @param {Object} options - Query options
   * @returns {Object} Course analytics data
   */
  static async getCourseAnalytics(courseId, options = {}) {
    try {
      const { timeframe = '30' } = options; // timeframe in days
      const dateFilter = db.raw(`created_at >= NOW() - INTERVAL '${timeframe} days'`);

      // Basic course info
      const courseInfo = await db('courses')
        .select('id', 'title', 'created_at', 'is_published', 'is_approved')
        .where('id', courseId)
        .first();

      if (!courseInfo) {
        throw AppError.notFound('Course not found');
      }

      // Enrollment statistics
      const enrollmentStats = await db('course_enrollments')
        .where('course_id', courseId)
        .select(
          db.raw('COUNT(*) as total_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'active\') as active_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'completed\') as completed_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'dropped\') as dropped_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL \'30 days\') as recent_enrollments')
        )
        .first();

      // Lesson completion statistics
      const lessonStats = await db('lesson_completions')
        .join('course_lessons', 'lesson_completions.lesson_id', 'course_lessons.id')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .where('course_modules.course_id', courseId)
        .select(
          db.raw('COUNT(*) as total_completions'),
          db.raw('COUNT(DISTINCT lesson_completions.user_id) as unique_students'),
          db.raw('COUNT(DISTINCT lesson_completions.lesson_id) as lessons_with_completions')
        )
        .first();

      // Quiz performance
      const quizStats = await db('quiz_attempts')
        .join('quizzes', 'quiz_attempts.quiz_id', 'quizzes.id')
        .where('quizzes.course_id', courseId)
        .where('quiz_attempts.attempt_status', 'completed')
        .select(
          db.raw('COUNT(*) as total_attempts'),
          db.raw('COUNT(*) FILTER (WHERE is_passed = true) as passed_attempts'),
          db.raw('AVG(percentage_score) as average_score'),
          db.raw('MAX(percentage_score) as highest_score'),
          db.raw('MIN(percentage_score) as lowest_score'),
          db.raw('COUNT(DISTINCT user_id) as unique_quiz_takers')
        )
        .first();

      // Assignment performance
      const assignmentStats = await db('assignment_submissions')
        .join('assignments', 'assignment_submissions.assignment_id', 'assignments.id')
        .where('assignments.course_id', courseId)
        .select(
          db.raw('COUNT(*) as total_submissions'),
          db.raw('COUNT(*) FILTER (WHERE submission_status = \'graded\') as graded_submissions'),
          db.raw('AVG(points_earned) FILTER (WHERE points_earned IS NOT NULL) as average_score'),
          db.raw('COUNT(DISTINCT user_id) as unique_submitters')
        )
        .first();

      // Engagement metrics
      const engagementStats = await db('lesson_views')
        .join('course_lessons', 'lesson_views.lesson_id', 'course_lessons.id')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .where('course_modules.course_id', courseId)
        .select(
          db.raw('COUNT(*) as total_views'),
          db.raw('COUNT(DISTINCT lesson_views.user_id) as unique_viewers'),
          db.raw('AVG(duration_seconds) as average_view_duration'),
          db.raw('SUM(duration_seconds) as total_view_time')
        )
        .first();

      // Recent activity (last 7 days)
      const recentActivity = await db('lesson_views')
        .join('course_lessons', 'lesson_views.lesson_id', 'course_lessons.id')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .where('course_modules.course_id', courseId)
        .where('lesson_views.viewed_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .select(
          db.raw('DATE(lesson_views.viewed_at) as date'),
          db.raw('COUNT(*) as views'),
          db.raw('COUNT(DISTINCT lesson_views.user_id) as unique_students')
        )
        .groupBy(db.raw('DATE(lesson_views.viewed_at)'))
        .orderBy('date', 'desc')
        .limit(7);

      return {
        course: courseInfo,
        enrollments: {
          total: parseInt(enrollmentStats.total_enrollments),
          active: parseInt(enrollmentStats.active_enrollments),
          completed: parseInt(enrollmentStats.completed_enrollments),
          dropped: parseInt(enrollmentStats.dropped_enrollments),
          recent: parseInt(enrollmentStats.recent_enrollments),
          completion_rate: enrollmentStats.total_enrollments > 0 
            ? Math.round((enrollmentStats.completed_enrollments / enrollmentStats.total_enrollments) * 100) 
            : 0
        },
        lessons: {
          total_completions: parseInt(lessonStats.total_completions),
          unique_students: parseInt(lessonStats.unique_students),
          lessons_with_completions: parseInt(lessonStats.lessons_with_completions)
        },
        quizzes: {
          total_attempts: parseInt(quizStats.total_attempts),
          passed_attempts: parseInt(quizStats.passed_attempts),
          unique_takers: parseInt(quizStats.unique_quiz_takers),
          pass_rate: quizStats.total_attempts > 0 
            ? Math.round((quizStats.passed_attempts / quizStats.total_attempts) * 100) 
            : 0,
          average_score: quizStats.average_score ? Math.round(parseFloat(quizStats.average_score)) : 0,
          highest_score: parseInt(quizStats.highest_score) || 0,
          lowest_score: parseInt(quizStats.lowest_score) || 0
        },
        assignments: {
          total_submissions: parseInt(assignmentStats.total_submissions),
          graded_submissions: parseInt(assignmentStats.graded_submissions),
          unique_submitters: parseInt(assignmentStats.unique_submitters),
          average_score: assignmentStats.average_score ? Math.round(parseFloat(assignmentStats.average_score)) : 0
        },
        engagement: {
          total_views: parseInt(engagementStats.total_views),
          unique_viewers: parseInt(engagementStats.unique_viewers),
          average_view_duration: Math.round(parseFloat(engagementStats.average_view_duration) || 0),
          total_view_time: parseInt(engagementStats.total_view_time) || 0
        },
        recent_activity: recentActivity.map(day => ({
          date: day.date,
          views: parseInt(day.views),
          unique_students: parseInt(day.unique_students)
        }))
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get instructor analytics
   * @param {number} instructorId - Instructor ID
   * @param {Object} options - Query options
   * @returns {Object} Instructor analytics data
   */
  static async getInstructorAnalytics(instructorId, options = {}) {
    try {
      const { timeframe = '30' } = options;
      const params = parsePaginationParams(options);
      // Course statistics
      const courseStats = await db('courses')
        .where('instructor_id', instructorId)
        .select(
          db.raw('COUNT(*) as total_courses'),
          db.raw('COUNT(*) FILTER (WHERE is_published = true) as published_courses'),
          db.raw('COUNT(*) FILTER (WHERE is_approved = true) as approved_courses')
        )
        .first();
      // Student statistics across all courses
      const studentStats = await db('course_enrollments')
        .join('courses', 'course_enrollments.course_id', 'courses.id')
        .where('courses.instructor_id', instructorId)
        .select(
          db.raw('COUNT(*) as total_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'active\') as active_students'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'completed\') as completed_students'),
          db.raw('COUNT(DISTINCT user_id) as unique_students')
        )
        .first();
      // Revenue statistics (if applicable)
      const revenueStats = await db('course_enrollments')
        .join('courses', 'course_enrollments.course_id', 'courses.id')
        .where('courses.instructor_id', instructorId)
        .select(
          db.raw('COUNT(*) as total_sales'),
          db.raw('COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL \'30 days\') as recent_sales')
        )
        .first();
      // Top performing courses (paginated)
      let topCoursesQuery = db('courses')
        .select(
          'courses.id',
          'courses.title',
          db.raw('COUNT(course_enrollments.id) as enrollment_count'),
          db.raw('AVG(CASE WHEN quiz_attempts.percentage_score IS NOT NULL THEN quiz_attempts.percentage_score END) as avg_quiz_score')
        )
        .leftJoin('course_enrollments', 'courses.id', 'course_enrollments.course_id')
        .leftJoin('quizzes', 'courses.id', 'quizzes.course_id')
        .leftJoin('quiz_attempts', function() {
          this.on('quizzes.id', '=', 'quiz_attempts.quiz_id')
              .andOn('quiz_attempts.attempt_status', '=', db.raw("'completed'"));
        })
        .where('courses.instructor_id', instructorId)
        .where('courses.is_published', true)
        .groupBy('courses.id', 'courses.title')
        .orderBy('enrollment_count', 'desc');
      const totalTopCoursesQuery = topCoursesQuery.clone();
      const [{ count: totalTopCourses }] = await totalTopCoursesQuery.count('courses.id as count');
      const topCourses = await topCoursesQuery.limit(params.limit).offset(params.offset);
      // Recent activity (paginated)
      let recentActivityQuery = db('lesson_views')
        .join('course_lessons', 'lesson_views.lesson_id', 'course_lessons.id')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .join('courses', 'course_modules.course_id', 'courses.id')
        .where('courses.instructor_id', instructorId)
        .where('lesson_views.viewed_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .select(
          db.raw('DATE(lesson_views.viewed_at) as date'),
          db.raw('COUNT(*) as total_views'),
          db.raw('COUNT(DISTINCT lesson_views.user_id) as unique_students')
        )
        .groupBy(db.raw('DATE(lesson_views.viewed_at)'))
        .orderBy('date', 'desc');
      const totalRecentActivityQuery = recentActivityQuery.clone();
      const [{ count: totalRecentActivity }] = await totalRecentActivityQuery.count('* as count');
      const recentActivity = await recentActivityQuery.limit(params.limit).offset(params.offset);
      return {
        courses: {
          total: parseInt(courseStats.total_courses),
          published: parseInt(courseStats.published_courses),
          approved: parseInt(courseStats.approved_courses)
        },
        students: {
          total_enrollments: parseInt(studentStats.total_enrollments),
          active_students: parseInt(studentStats.active_students),
          completed_students: parseInt(studentStats.completed_students),
          unique_students: parseInt(studentStats.unique_students)
        },
        revenue: {
          total_sales: parseInt(revenueStats.total_sales),
          recent_sales: parseInt(revenueStats.recent_sales)
        },
        top_courses: {
          data: topCourses,
          pagination: createPaginationMeta(parseInt(totalTopCourses), params)
        },
        recent_activity: {
          data: recentActivity,
          pagination: createPaginationMeta(parseInt(totalRecentActivity), params)
        }
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get student analytics
   * @param {number} studentId - Student ID
   * @param {Object} options - Query options
   * @returns {Object} Student analytics data
   */
  static async getStudentAnalytics(studentId, options = {}) {
    try {
      const { timeframe = '30', page = 1, limit = 5 } = options;

      // Enrollment statistics
      const enrollmentStats = await db('course_enrollments')
        .where('user_id', studentId)
        .select(
          db.raw('COUNT(*) as total_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'active\') as active_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'completed\') as completed_enrollments')
        )
        .first();

      // Learning progress
      const progressStats = await db('lesson_completions')
        .where('user_id', studentId)
        .select(
          db.raw('COUNT(*) as total_lessons_completed'),
          db.raw('COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL \'7 days\') as recent_completions')
        )
        .first();

      // Quiz performance
      const quizStats = await db('quiz_attempts')
        .where('user_id', studentId)
        .where('attempt_status', 'completed')
        .select(
          db.raw('COUNT(*) as total_attempts'),
          db.raw('COUNT(*) FILTER (WHERE is_passed = true) as passed_attempts'),
          db.raw('AVG(percentage_score) as average_score'),
          db.raw('MAX(percentage_score) as best_score')
        )
        .first();

      // Assignment performance
      const assignmentStats = await db('assignment_submissions')
        .where('user_id', studentId)
        .select(
          db.raw('COUNT(*) as total_submissions'),
          db.raw('COUNT(*) FILTER (WHERE submission_status = \'graded\') as graded_submissions'),
          db.raw('AVG(points_earned) FILTER (WHERE points_earned IS NOT NULL) as average_score')
        )
        .first();

      // Study time
      const studyTimeStats = await db('lesson_views')
        .where('user_id', studentId)
        .select(
          db.raw('SUM(duration_seconds) as total_study_time'),
          db.raw('AVG(duration_seconds) as average_session_time'),
          db.raw('COUNT(*) as total_sessions')
        )
        .first();

      // Recent courses (paginated)
      let recentCoursesQuery = db('course_enrollments')
        .select(
          'courses.id',
          'courses.title',
          'course_enrollments.enrolled_at',
          'course_enrollments.enrollment_status'
        )
        .join('courses', 'course_enrollments.course_id', 'courses.id')
        .where('course_enrollments.user_id', studentId)
        .orderBy('course_enrollments.enrolled_at', 'desc');
      const totalRecentCourses = await db('course_enrollments').where('user_id', studentId).count('id as count').first();
      const recentCourses = await parsePaginationParams({ page, limit });
      // Learning streak (consecutive days with activity, paginated)
      let recentActivityQuery = db('lesson_views')
        .where('user_id', studentId)
        .where('viewed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
        .select(db.raw('DATE(viewed_at) as date'))
        .groupBy(db.raw('DATE(viewed_at)'))
        .orderBy('date', 'desc');
      const totalRecentActivity = await recentActivityQuery.clone().count('* as count').first();
      const recentActivity = await recentActivityQuery.limit(params.limit).offset(params.offset);
      // Calculate streak
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      
      for (let i = 0; i < recentActivity.length; i++) {
        const activityDate = new Date(recentActivity[i].date);
        const daysDiff = Math.floor((today - activityDate) / (1000 * 60 * 60 * 24));
        
        if (i === 0 && daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;
        } else if (i > 0) {
          const prevDate = new Date(recentActivity[i-1].date);
          const daysBetween = Math.floor((prevDate - activityDate) / (1000 * 60 * 60 * 24));
          
          if (daysBetween === 1) {
            tempStreak++;
            if (i === 1 && currentStreak > 0) currentStreak = tempStreak;
          } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

      return {
        enrollments: {
          total: parseInt(enrollmentStats.total_enrollments),
          active: parseInt(enrollmentStats.active_enrollments),
          completed: parseInt(enrollmentStats.completed_enrollments),
          completion_rate: enrollmentStats.total_enrollments > 0 
            ? Math.round((enrollmentStats.completed_enrollments / enrollmentStats.total_enrollments) * 100) 
            : 0
        },
        progress: {
          total_lessons_completed: parseInt(progressStats.total_lessons_completed),
          recent_completions: parseInt(progressStats.recent_completions)
        },
        quizzes: {
          total_attempts: parseInt(quizStats.total_attempts),
          passed_attempts: parseInt(quizStats.passed_attempts),
          pass_rate: quizStats.total_attempts > 0 
            ? Math.round((quizStats.passed_attempts / quizStats.total_attempts) * 100) 
            : 0,
          average_score: quizStats.average_score ? Math.round(parseFloat(quizStats.average_score)) : 0,
          best_score: parseInt(quizStats.best_score) || 0
        },
        assignments: {
          total_submissions: parseInt(assignmentStats.total_submissions),
          graded_submissions: parseInt(assignmentStats.graded_submissions),
          average_score: assignmentStats.average_score ? Math.round(parseFloat(assignmentStats.average_score)) : 0
        },
        study_time: {
          total_seconds: parseInt(studyTimeStats.total_study_time) || 0,
          total_hours: Math.round((parseInt(studyTimeStats.total_study_time) || 0) / 3600),
          average_session_seconds: Math.round(parseFloat(studyTimeStats.average_session_time) || 0),
          total_sessions: parseInt(studyTimeStats.total_sessions)
        },
        streaks: {
          current: currentStreak,
          longest: maxStreak
        },
        recent_courses: {
          data: recentCourses.map(AnalyticsModel.sanitizeAnalytics),
          pagination: createPaginationMeta(parseInt(totalRecentCourses.count), params)
        },
        recent_activity: {
          data: recentActivity.map(AnalyticsModel.sanitizeAnalytics),
          pagination: createPaginationMeta(parseInt(totalRecentActivity), params)
        }
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get system-wide analytics
   * @param {Object} options - Query options
   * @returns {Object} System analytics data
   */
  static async getSystemAnalytics(options = {}) {
    try {
      const { timeframe = '30', page = 1, limit = 10 } = options;

      // User statistics
      const userStats = await db('users')
        .whereNull('deleted_at')
        .select(
          db.raw('COUNT(*) as total_users'),
          db.raw('COUNT(*) FILTER (WHERE role = \'student\') as students'),
          db.raw('COUNT(*) FILTER (WHERE role = \'instructor\') as instructors'),
          db.raw('COUNT(*) FILTER (WHERE role = \'admin\') as admins'),
          db.raw('COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL \'30 days\') as new_users')
        )
        .first();

      // Course statistics
      const courseStats = await db('courses')
        .select(
          db.raw('COUNT(*) as total_courses'),
          db.raw('COUNT(*) FILTER (WHERE is_published = true) as published_courses'),
          db.raw('COUNT(*) FILTER (WHERE is_approved = true) as approved_courses'),
          db.raw('COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL \'30 days\') as new_courses')
        )
        .first();

      // Enrollment statistics
      const enrollmentStats = await db('course_enrollments')
        .select(
          db.raw('COUNT(*) as total_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'active\') as active_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrollment_status = \'completed\') as completed_enrollments'),
          db.raw('COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL \'30 days\') as new_enrollments')
        )
        .first();

      // Content statistics
      const contentStats = await db.raw(`
        SELECT 
          (SELECT COUNT(*) FROM course_modules) as total_modules,
          (SELECT COUNT(*) FROM course_lessons) as total_lessons,
          (SELECT COUNT(*) FROM quizzes WHERE is_published = true) as published_quizzes,
          (SELECT COUNT(*) FROM assignments WHERE is_published = true) as published_assignments
      `);

      // Activity statistics
      const activityStats = await db('lesson_views')
        .where('viewed_at', '>=', db.raw(`NOW() - INTERVAL '${timeframe} days'`))
        .select(
          db.raw('COUNT(*) as total_views'),
          db.raw('COUNT(DISTINCT user_id) as active_learners'),
          db.raw('SUM(duration_seconds) as total_watch_time')
        )
        .first();

      // Popular courses (paginated)
      let popularCoursesQuery = db('courses')
        .select(
          'courses.id',
          'courses.title',
          'users.name as instructor_name',
          db.raw('COUNT(course_enrollments.id) as enrollment_count')
        )
        .leftJoin('course_enrollments', 'courses.id', 'course_enrollments.course_id')
        .leftJoin('users', 'courses.instructor_id', 'users.id')
        .where('courses.is_published', true)
        .where('courses.is_approved', true)
        .groupBy('courses.id', 'courses.title', 'users.name')
        .orderBy('enrollment_count', 'desc');
      const totalPopularCourses = await db('courses').where('is_published', true).where('is_approved', true).count('id as count').first();
      const popularCourses = await parsePaginationParams({ page, limit });
      // Growth trends (paginated, still uses db.raw for generate_series)
      // Note: Pagination for growthTrends is limited by SQL, so we keep db.raw and document it.
      const growthTrends = await db.raw(`
        SELECT 
          DATE(date_series.date) as date,
          COALESCE(user_signups.count, 0) as new_users,
          COALESCE(course_enrollments.count, 0) as new_enrollments,
          COALESCE(course_creations.count, 0) as new_courses
        FROM (
          SELECT generate_series(
            NOW() - INTERVAL '29 days',
            NOW(),
            INTERVAL '1 day'
          )::date as date
        ) date_series
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM users 
          WHERE created_at >= NOW() - INTERVAL '30 days'
          AND deleted_at IS NULL
          GROUP BY DATE(created_at)
        ) user_signups ON date_series.date = user_signups.date
        LEFT JOIN (
          SELECT DATE(enrolled_at) as date, COUNT(*) as count
          FROM course_enrollments 
          WHERE enrolled_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(enrolled_at)
        ) course_enrollments ON date_series.date = course_enrollments.date
        LEFT JOIN (
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM courses 
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
        ) course_creations ON date_series.date = course_creations.date
        ORDER BY date_series.date
        OFFSET ${(page - 1) * limit} LIMIT ${limit}
      `);

      return {
        users: {
          total: parseInt(userStats.total_users),
          students: parseInt(userStats.students),
          instructors: parseInt(userStats.instructors),
          admins: parseInt(userStats.admins),
          new_users: parseInt(userStats.new_users)
        },
        courses: {
          total: parseInt(courseStats.total_courses),
          published: parseInt(courseStats.published_courses),
          approved: parseInt(courseStats.approved_courses),
          new_courses: parseInt(courseStats.new_courses)
        },
        enrollments: {
          total: parseInt(enrollmentStats.total_enrollments),
          active: parseInt(enrollmentStats.active_enrollments),
          completed: parseInt(enrollmentStats.completed_enrollments),
          new_enrollments: parseInt(enrollmentStats.new_enrollments)
        },
        content: {
          total_modules: parseInt(contentStats.rows[0].total_modules),
          total_lessons: parseInt(contentStats.rows[0].total_lessons),
          published_quizzes: parseInt(contentStats.rows[0].published_quizzes),
          published_assignments: parseInt(contentStats.rows[0].published_assignments)
        },
        activity: {
          total_views: parseInt(activityStats.total_views),
          active_learners: parseInt(activityStats.active_learners),
          total_watch_hours: Math.round((parseInt(activityStats.total_watch_time) || 0) / 3600)
        },
        popular_courses: {
          data: popularCourses.map(AnalyticsModel.sanitizeAnalytics),
          pagination: createPaginationMeta(parseInt(totalPopularCourses.count), params)
        },
        growth_trends: {
          data: growthTrends.rows.map(AnalyticsModel.sanitizeAnalytics),
          pagination: {
            page,
            limit,
            total: 30 // 30 days window
          }
        }
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Export analytics data to CSV format
   * @param {string} type - Export type ('courses', 'users', 'enrollments')
   * @param {Object} options - Export options
   * @returns {string} CSV data
   */
  static async exportToCsv(type, options = {}) {
    try {
      const { page = 1, limit = 100 } = options;
      let data = [];
      let headers = [];
      switch (type) {
        case 'courses':
          headers = ['ID', 'Title', 'Instructor', 'Category', 'Enrollments', 'Published', 'Approved', 'Created At'];
          let coursesQuery = db('courses')
            .select(
              'courses.id',
              'courses.title',
              'users.name as instructor_name',
              'course_categories.name as category_name',
              db.raw('COUNT(course_enrollments.id) as enrollment_count'),
              'courses.is_published',
              'courses.is_approved',
              'courses.created_at'
            )
            .leftJoin('users', 'courses.instructor_id', 'users.id')
            .leftJoin('course_categories', 'courses.category_id', 'course_categories.id')
            .leftJoin('course_enrollments', 'courses.id', 'course_enrollments.course_id')
            .groupBy('courses.id', 'users.name', 'course_categories.name')
            .orderBy('courses.created_at', 'desc');
          data = await parsePaginationParams(coursesQuery, { page, limit });
          break;
        case 'users':
          headers = ['ID', 'Name', 'Email', 'Role', 'Verified', 'Created At', 'Last Login'];
          let usersQuery = db('users')
            .select(
              'id',
              'name',
              'email',
              'role',
              'is_verified',
              'created_at',
              'last_login_at'
            )
            .whereNull('deleted_at')
            .orderBy('created_at', 'desc');
          data = await parsePaginationParams(usersQuery, { page, limit });
          break;
        case 'enrollments':
          headers = ['ID', 'Student', 'Course', 'Status', 'Enrolled At', 'Completed At'];
          let enrollmentsQuery = db('course_enrollments')
            .select(
              'course_enrollments.id',
              'users.name as student_name',
              'courses.title as course_title',
              'course_enrollments.enrollment_status',
              'course_enrollments.enrolled_at',
              'course_enrollments.completed_at'
            )
            .leftJoin('users', 'course_enrollments.user_id', 'users.id')
            .leftJoin('courses', 'course_enrollments.course_id', 'courses.id')
            .orderBy('course_enrollments.enrolled_at', 'desc');
          data = await parsePaginationParams(enrollmentsQuery, { page, limit });
          break;
        default:
          throw new Error('Invalid export type');
      }
      // Convert to CSV format
      const csvRows = [headers.join(',')];
      for (const row of data.map(AnalyticsModel.sanitizeAnalytics)) {
        const values = headers.map(header => {
          const key = header.toLowerCase().replace(/ /g, '_');
          let value = row[key] || '';
          if (typeof value === 'boolean') {
            value = value ? 'Yes' : 'No';
          } else if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      }
      return csvRows.join('\n');
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  /**
   * Get real-time dashboard data
   * @returns {Object} Real-time dashboard metrics
   */
  static async getDashboardMetrics() {
    try {
      // Current online users (based on recent activity)
      const onlineUsers = await db('lesson_views')
        .where('viewed_at', '>=', db.raw("NOW() - INTERVAL '5 minutes'"))
        .countDistinct('user_id as count')
        .first();
      // Today's activity
      const todayActivity = await db('lesson_views')
        .where('viewed_at', '>=', db.raw("DATE_TRUNC('day', NOW())"))
        .select(
          db.raw('COUNT(*) as total_views'),
          db.raw('COUNT(DISTINCT user_id) as unique_learners'),
          db.raw('SUM(duration_seconds) as total_time')
        )
        .first();
      // Recent enrollments (last 24 hours)
      const recentEnrollments = await db('course_enrollments')
        .where('enrolled_at', '>=', db.raw("NOW() - INTERVAL '24 hours'"))
        .count('id as count')
        .first();
      // System health metrics
      const systemHealth = await db.raw(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
          (SELECT COUNT(*) FROM courses WHERE is_published = true) as active_courses,
          (SELECT COUNT(*) FROM course_enrollments WHERE enrollment_status = 'active') as active_enrollments
      `);
      return {
        online_users: parseInt(onlineUsers.count),
        today_activity: AnalyticsModel.sanitizeAnalytics({
          total_views: parseInt(todayActivity.total_views),
          unique_learners: parseInt(todayActivity.unique_learners),
          total_hours: Math.round((parseInt(todayActivity.total_time) || 0) / 3600)
        }),
        recent_enrollments: parseInt(recentEnrollments.count),
        system_health: AnalyticsModel.sanitizeAnalytics({
          total_users: parseInt(systemHealth.rows[0].total_users),
          active_courses: parseInt(systemHealth.rows[0].active_courses),
          active_enrollments: parseInt(systemHealth.rows[0].active_enrollments)
        }),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw AppError.internal(error.message);
    }
  }

  static sanitizeAnalytics(row) {
    // Remove or mask any internal fields if needed
    return row;
  }

  static async getTopCourses({ page = 1, limit = 10 } = {}) {
    let query = db('courses')
      .select('courses.id', 'courses.title')
      .count('enrollments.id as enrollment_count')
      .leftJoin('enrollments', 'courses.id', 'enrollments.course_id')
      .groupBy('courses.id')
      .orderBy('enrollment_count', 'desc');
    const total = await db('courses').count('id as count').first();
    const data = await parsePaginationParams(query, { page, limit });
    return {
      data: data.map(AnalyticsModel.sanitizeAnalytics),
      pagination: {
        page,
        limit,
        total: parseInt(total.count, 10)
      }
    };
  }

  // --- BEGIN: Finalized analytics methods ---

  static async getInstructorStats(instructorId, options = {}) {
    // Aggregate stats for instructor dashboard
    const courses = await db('courses').where('instructor_id', instructorId);
    const courseIds = courses.map(c => c.id);
    const totalCourses = courses.length;
    const totalEnrollments = courseIds.length > 0
      ? parseInt((await db('course_enrollments').whereIn('course_id', courseIds).count('id as count').first()).count)
      : 0;
    const totalStudents = courseIds.length > 0
      ? parseInt((await db('course_enrollments').whereIn('course_id', courseIds).distinct('user_id').count('user_id as count').first()).count)
      : 0;
    // Average completion rate (across all courses)
    let averageCompletionRate = 0;
    if (courseIds.length > 0) {
      const completions = await db('lesson_completions')
        .join('course_lessons', 'lesson_completions.lesson_id', 'course_lessons.id')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .whereIn('course_modules.course_id', courseIds)
        .count('lesson_completions.id as count')
        .first();
      const totalLessons = await db('course_lessons')
        .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
        .whereIn('course_modules.course_id', courseIds)
        .count('course_lessons.id as count')
        .first();
      averageCompletionRate = totalLessons.count > 0 ? Math.round((completions.count / totalLessons.count) * 100) : 0;
    }
    return {
      total_courses: totalCourses,
      total_enrollments: totalEnrollments,
      total_students: totalStudents,
      average_completion_rate: averageCompletionRate
    };
  }

  static async getInstructorRecentActivity(instructorId, options = {}) {
    // Recent lesson views for instructor's courses (last 7 days)
    const { limit = 10 } = options;
    const courses = await db('courses').where('instructor_id', instructorId);
    const courseIds = courses.map(c => c.id);
    if (courseIds.length === 0) return [];
    const activity = await db('lesson_views')
      .join('course_lessons', 'lesson_views.lesson_id', 'course_lessons.id')
      .join('course_modules', 'course_lessons.module_id', 'course_modules.id')
      .whereIn('course_modules.course_id', courseIds)
      .select('lesson_views.*', 'course_lessons.title as lesson_title')
      .orderBy('lesson_views.viewed_at', 'desc')
      .limit(limit);
    return activity.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getUserStatistics(options = {}) {
    // User stats: total, active (last 30 days), by role
    const total = parseInt((await db('users').whereNull('deleted_at').count('id as count').first()).count);
    const active = parseInt((await db('users').where('last_login_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .whereNull('deleted_at').count('id as count').first()).count);
    const byRole = await db('users')
      .select('role')
      .count('id as count')
      .whereNull('deleted_at')
      .groupBy('role');
    return { total, active, byRole };
  }

  static async getCourseStatistics(options = {}) {
    // Course stats: total, published, by category
    const total = parseInt((await db('courses').count('id as count').first()).count);
    const published = parseInt((await db('courses').where('is_published', true).count('id as count').first()).count);
    const byCategory = await db('courses')
      .select('category_id')
      .count('id as count')
      .groupBy('category_id');
    return { total, published, byCategory };
  }

  static async getEnrollmentTrends(options = {}) {
    // Enrollment trends: count by day for last 30 days
    const { period = 'day', limit = 30 } = options;
    const trends = await db('course_enrollments')
      .select(db.raw(`DATE_TRUNC('${period}', enrolled_at) as date`))
      .count('id as count')
      .groupBy(db.raw(`DATE_TRUNC('${period}', enrolled_at)`))
      .orderBy('date', 'desc')
      .limit(limit);
    return trends.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getPopularCourses(options = {}) {
    // Popular courses by enrollments (last 30 days)
    const { limit = 10 } = options;
    const courses = await db('courses')
      .select('courses.id', 'courses.title')
      .leftJoin('course_enrollments', 'courses.id', 'course_enrollments.course_id')
      .where('course_enrollments.enrolled_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .groupBy('courses.id')
      .orderByRaw('COUNT(course_enrollments.id) DESC')
      .limit(limit);
    return courses.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getInstructorPerformance(options = {}) {
    // Instructor performance: top instructors by enrollments
    const { limit = 10 } = options;
    const instructors = await db('users')
      .select('users.id', 'users.name')
      .leftJoin('courses', 'users.id', 'courses.instructor_id')
      .leftJoin('course_enrollments', 'courses.id', 'course_enrollments.course_id')
      .where('users.role', 'instructor')
      .groupBy('users.id')
      .orderByRaw('COUNT(course_enrollments.id) DESC')
      .limit(limit);
    return instructors.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getSystemHealthMetrics() {
    // System health: user count, course count, active enrollments
    const totalUsers = parseInt((await db('users').whereNull('deleted_at').count('id as count').first()).count);
    const totalCourses = parseInt((await db('courses').count('id as count').first()).count);
    const activeEnrollments = parseInt((await db('course_enrollments').where('enrollment_status', 'active').count('id as count').first()).count);
    return { totalUsers, totalCourses, activeEnrollments };
  }

  static async getTopStudents(options = {}) {
    // Top students by completions (last 30 days)
    const { limit = 10 } = options;
    const students = await db('users')
      .select('users.id', 'users.name')
      .leftJoin('lesson_completions', 'users.id', 'lesson_completions.user_id')
      .where('users.role', 'student')
      .where('lesson_completions.completed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .groupBy('users.id')
      .orderByRaw('COUNT(lesson_completions.id) DESC')
      .limit(limit);
    return students.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getEngagementTrends(options = {}) {
    // Engagement trends: lesson views by day for last 30 days
    const { period = 'day', limit = 30 } = options;
    const trends = await db('lesson_views')
      .select(db.raw(`DATE_TRUNC('${period}', viewed_at) as date`))
      .count('id as count')
      .groupBy(db.raw(`DATE_TRUNC('${period}', viewed_at)`))
      .orderBy('date', 'desc')
      .limit(limit);
    return trends.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getStudentOverallStats(studentId, options = {}) {
    // Student overall stats: enrollments, completions, average score
    const enrollments = parseInt((await db('course_enrollments').where('user_id', studentId).count('id as count').first()).count);
    const completions = parseInt((await db('lesson_completions').where('user_id', studentId).count('id as count').first()).count);
    const avgScore = Math.round(parseFloat((await db('quiz_attempts').where('user_id', studentId).where('attempt_status', 'completed').avg('percentage_score as avg').first()).avg) || 0);
    return { enrollments, completions, avgScore };
  }

  static async getStudentCourseProgress(studentId, options = {}) {
    // Student course progress: lessons completed per course
    const progress = await db('lesson_completions')
      .select('course_modules.course_id')
      .count('lesson_completions.id as completed_lessons')
      .leftJoin('course_lessons', 'lesson_completions.lesson_id', 'course_lessons.id')
      .leftJoin('course_modules', 'course_lessons.module_id', 'course_modules.id')
      .where('lesson_completions.user_id', studentId)
      .groupBy('course_modules.course_id');
    return progress.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getStudentQuizPerformance(studentId, options = {}) {
    // Student quiz performance: average score, attempts, pass rate
    const attempts = await db('quiz_attempts').where('user_id', studentId).where('attempt_status', 'completed');
    const total = attempts.length;
    const passed = attempts.filter(a => a.is_passed).length;
    const avgScore = total > 0 ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage_score || 0), 0) / total) : 0;
    return { total, passed, avgScore };
  }

  static async getStudentAssignmentPerformance(studentId, options = {}) {
    // Student assignment performance: total, graded, avg grade
    const total = parseInt((await db('assignment_submissions').where('user_id', studentId).count('id as count').first()).count);
    const graded = parseInt((await db('assignment_submissions').where('user_id', studentId).where('submission_status', 'graded').count('id as count').first()).count);
    const avgGrade = Math.round(parseFloat((await db('assignment_submissions').where('user_id', studentId).where('submission_status', 'graded').avg('grade as avg').first()).avg) || 0);
    return { total, graded, avgGrade };
  }

  static async getLessonCompletionHeatmap(courseId, options = {}) {
    // Heatmap: completions by lesson and date (last 30 days)
    const completions = await db('lesson_completions')
      .select('lesson_id', db.raw('DATE(completed_at) as date'))
      .count('id as count')
      .leftJoin('course_lessons', 'lesson_completions.lesson_id', 'course_lessons.id')
      .leftJoin('course_modules', 'course_lessons.module_id', 'course_modules.id')
      .where('course_modules.course_id', courseId)
      .where('completed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .groupBy('lesson_id', db.raw('DATE(completed_at)'));
    return completions.map(AnalyticsModel.sanitizeAnalytics);
  }

  static async getAssessmentStatistics(options = {}) {
    // Assessment stats: quiz/assignment grades, attempts, pass rates
    // For now, return quiz stats for all quizzes
    const totalAttempts = parseInt((await db('quiz_attempts').count('id as count').first()).count);
    const passed = parseInt((await db('quiz_attempts').where('is_passed', true).count('id as count').first()).count);
    const avgScore = Math.round(parseFloat((await db('quiz_attempts').where('attempt_status', 'completed').avg('percentage_score as avg').first()).avg) || 0);
    return { totalAttempts, passed, avgScore };
  }

  static async getUserActivitySummary(userId, options = {}) {
    // User activity: logins, views, completions (last 30 days)
    const logins = parseInt((await db('user_sessions').where('user_id', userId).where('created_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count('id as count').first()).count);
    const views = parseInt((await db('lesson_views').where('user_id', userId).where('viewed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count('id as count').first()).count);
    const completions = parseInt((await db('lesson_completions').where('user_id', userId).where('completed_at', '>=', db.raw("NOW() - INTERVAL '30 days'"))
      .count('id as count').first()).count);
    return { logins, views, completions };
  }

  static async exportAnalytics(options = {}) {
    // Export analytics as CSV (default: users)
    const { type = 'users', ...rest } = options;
    return await AnalyticsModel.exportToCsv(type, rest);
  }

  static async getRealtimeDashboard(options = {}) {
    // Real-time dashboard: online users, recent activity, system health
    return await AnalyticsModel.getDashboardMetrics();
  }

  // --- END: Finalized analytics methods ---
}

export default AnalyticsModel;