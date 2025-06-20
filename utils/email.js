import nodemailer from "nodemailer";
import { AppError } from "./AppError.js";

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.NODE_ENV === "production") {
    // Production: Use actual email service (Gmail, SendGrid, etc.)
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      secure: true,
    });
  } else {
    // Development: Use Ethereal Email for testing
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.ethereal.email",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
};

const transporter = createTransporter();

/**
 * Send basic email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} Send result
 */
export const sendEmail = async (options) => {
  try {
    const {
      to,
      subject,
      text,
      html,
      from = process.env.EMAIL_FROM || process.env.EMAIL_USER,
      cc,
      bcc,
      attachments,
    } = options;

    if (!to || !subject || (!text && !html)) {
      throw new AppError(
        "Missing required email fields: to, subject, and text/html",
        400
      );
    }

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
    };

    // Add optional fields
    if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(", ") : cc;
    if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(", ") : bcc;
    if (attachments) mailOptions.attachments = attachments;

    const result = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", result.messageId);

    // In development, log the preview URL
    if (process.env.NODE_ENV !== "production") {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(result));
    }

    return {
      success: true,
      messageId: result.messageId,
      previewUrl:
        process.env.NODE_ENV !== "production"
          ? nodemailer.getTestMessageUrl(result)
          : null,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new AppError(`Failed to send email: ${error.message}`, 500);
  }
};

/**
 * Send welcome email to new users
 * @param {Object} user - User object
 * @param {string} tempPassword - Temporary password (optional)
 * @returns {Promise<Object>} Send result
 */
export const sendWelcomeEmail = async (user, tempPassword = null) => {
  const { email, firstName, lastName, role } = user;
  const fullName = `${firstName} ${lastName}`.trim();

  let subject, html;

  if (tempPassword) {
    // Email for users created by admin
    subject = "Welcome to LMS - Your Account Has Been Created";
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Learning Management System!</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created with the role of <strong>${role}</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #e74c3c;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>You can access the platform at: <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}">${process.env.FRONTEND_URL || "http://localhost:3000"}</a></p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `;
  } else {
    // Email for self-registered users
    subject = "Welcome to LMS - Registration Successful";
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Learning Management System!</h2>
        <p>Hello ${fullName},</p>
        <p>Thank you for registering with us! Your account has been successfully created.</p>
        <p>You can now access the platform and start your learning journey.</p>
        <p>Access the platform at: <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}">${process.env.FRONTEND_URL || "http://localhost:3000"}</a></p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The LMS Team</p>
      </div>
    `;
  }

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} Send result
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const { email, firstName, lastName } = user;
  const fullName = `${firstName} ${lastName}`.trim();
  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  const subject = "Password Reset Request";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello ${fullName},</p>
      <p>You have requested to reset your password. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p style="color: #e74c3c;"><strong>Note:</strong> This link will expire in 1 hour for security purposes.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <p>Best regards,<br>The LMS Team</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send course enrollment notification
 * @param {Object} user - User object
 * @param {Object} course - Course object
 * @returns {Promise<Object>} Send result
 */
export const sendEnrollmentEmail = async (user, course) => {
  const { email, firstName, lastName } = user;
  const fullName = `${firstName} ${lastName}`.trim();
  const courseUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/courses/${course.id}`;

  const subject = `Enrollment Confirmation - ${course.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Course Enrollment Confirmation</h2>
      <p>Hello ${fullName},</p>
      <p>You have been successfully enrolled in the following course:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">${course.title}</h3>
        <p><strong>Instructor:</strong> ${course.instructor?.firstName} ${course.instructor?.lastName}</p>
        <p><strong>Description:</strong> ${course.description}</p>
        <p><strong>Duration:</strong> ${course.duration} hours</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${courseUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Learning</a>
      </div>
      <p>You can access your course anytime from your dashboard.</p>
      <p>Happy learning!</p>
      <p>Best regards,<br>The LMS Team</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send assignment notification
 * @param {Object} user - User object
 * @param {Object} assignment - Assignment object
 * @param {Object} course - Course object
 * @returns {Promise<Object>} Send result
 */
export const sendAssignmentNotification = async (user, assignment, course) => {
  const { email, firstName, lastName } = user;
  const fullName = `${firstName} ${lastName}`.trim();
  const assignmentUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/courses/${course.id}/assignments/${assignment.id}`;
  const dueDate = new Date(assignment.dueDate).toLocaleDateString();

  const subject = `New Assignment: ${assignment.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Assignment Available</h2>
      <p>Hello ${fullName},</p>
      <p>A new assignment has been posted in your course:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">${assignment.title}</h3>
        <p><strong>Course:</strong> ${course.title}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
        <p><strong>Points:</strong> ${assignment.totalPoints}</p>
        <p><strong>Description:</strong> ${assignment.description}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${assignmentUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Assignment</a>
      </div>
      <p style="color: #e74c3c;"><strong>Don't forget:</strong> Submit your assignment before the due date!</p>
      <p>Best regards,<br>The LMS Team</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send grade notification
 * @param {Object} user - User object
 * @param {Object} assignment - Assignment object
 * @param {Object} submission - Submission object
 * @param {Object} course - Course object
 * @returns {Promise<Object>} Send result
 */
export const sendGradeNotification = async (
  user,
  assignment,
  submission,
  course
) => {
  const { email, firstName, lastName } = user;
  const fullName = `${firstName} ${lastName}`.trim();
  const submissionUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/courses/${course.id}/assignments/${assignment.id}/submission`;
  const percentage = Math.round(
    (submission.pointsEarned / assignment.totalPoints) * 100
  );

  const subject = `Grade Posted: ${assignment.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Assignment Graded</h2>
      <p>Hello ${fullName},</p>
      <p>Your assignment has been graded:</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #007bff;">${assignment.title}</h3>
        <p><strong>Course:</strong> ${course.title}</p>
        <p><strong>Grade:</strong> ${submission.pointsEarned}/${assignment.totalPoints} (${percentage}%)</p>
        ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ""}
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${submissionUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>
      </div>
      <p>Keep up the great work!</p>
      <p>Best regards,<br>The LMS Team</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send bulk email to multiple recipients
 * @param {Array} recipients - Array of email addresses
 * @param {Object} emailData - Email content
 * @returns {Promise<Array>} Array of send results
 */
export const sendBulkEmail = async (recipients, emailData) => {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        ...emailData,
        to: recipient,
      });
      results.push({ recipient, success: true, result });
    } catch (error) {
      console.error(`Failed to send email to ${recipient}:`, error);
      results.push({ recipient, success: false, error: error.message });
    }
  }

  return results;
};

/**
 * Verify email configuration
 * @returns {Promise<boolean>} Configuration is valid
 */
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log("Email configuration is valid");
    return true;
  } catch (error) {
    console.error("Email configuration error:", error);
    return false;
  }
};

/**
 * Create email template
 * @param {string} template - Template name
 * @param {Object} data - Template data
 * @returns {string} HTML content
 */
export const createEmailTemplate = (template, data) => {
  const baseStyle = `
    <style>
      .email-container {
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #007bff;
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 5px 5px 0 0;
      }
      .content {
        background-color: #ffffff;
        padding: 30px;
        border: 1px solid #ddd;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 15px;
        text-align: center;
        border-radius: 0 0 5px 5px;
        color: #666;
        font-size: 12px;
      }
      .button {
        background-color: #007bff;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;
        margin: 20px 0;
      }
      .alert {
        background-color: #f8d7da;
        color: #721c24;
        padding: 10px;
        border-radius: 5px;
        margin: 15px 0;
      }
    </style>
  `;

  const templates = {
    basic: `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          <h1>${data.title || "LMS Notification"}</h1>
        </div>
        <div class="content">
          ${data.content}
        </div>
        <div class="footer">
          <p>© 2024 Learning Management System. All rights reserved.</p>
        </div>
      </div>
    `,
    notification: `
      ${baseStyle}
      <div class="email-container">
        <div class="header">
          <h1>${data.title}</h1>
        </div>
        <div class="content">
          <p>Hello ${data.userName},</p>
          ${data.content}
          ${data.actionUrl ? `<div style="text-align: center;"><a href="${data.actionUrl}" class="button">${data.actionText || "View Details"}</a></div>` : ""}
        </div>
        <div class="footer">
          <p>© 2024 Learning Management System. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  return templates[template] || templates.basic;
};

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEnrollmentEmail,
  sendAssignmentNotification,
  sendGradeNotification,
  sendBulkEmail,
  verifyEmailConfig,
  createEmailTemplate,
};
