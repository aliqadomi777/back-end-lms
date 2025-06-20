import { AuthService } from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import { passport } from "../middleware/auth.middleware.js";

export class AuthController {
  // Google OAuth login (redirect to Google)
  static googleAuth(req, res, next) {
    passport.authenticate("google", { scope: ["profile", "email"] })(
      req,
      res,
      next
    );
  }

  // Google OAuth callback
  static googleCallback(req, res, next) {
    passport.authenticate(
      "google",
      { session: false },
      async (err, user, info) => {
        if (err || !user) {
          return res
            .status(401)
            .json({ success: false, message: "Google authentication failed" });
        }
        try {
          // Generate JWT for the user
          const result = await AuthService.authenticateOAuth(
            "google",
            user.oauth_id,
            user
          );
          // Redirect or respond with token
          // For SPA: send token in response
          return res.status(200).json({ success: true, ...result });
        } catch (error) {
          next(error);
        }
      }
    )(req, res, next);
  }

  // Token refresh endpoint
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw AppError.badRequest("Refresh token required");
      const result = await AuthService.refreshToken(refreshToken);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
