const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync.js");
const userController = require("../controllers/user.js");
const { isLoggedIn, saveRedirectUrl } = require("../middleware.js");

// Signup
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(wrapAsync(userController.signup));

  // Verify email (separate route)
router.get("/verify-email/:token", userController.verifyEmail);

// Login
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

// Profile
router.get("/profile", isLoggedIn, userController.showProfile);

// Edit profile
router.get("/users/edit", isLoggedIn, userController.renderEditForm);
router.post("/users/edit", isLoggedIn, userController.updateProfile);

// Logout
router.get("/logout", userController.logout);

// Forgot password form
router.get("/forgot", userController.renderForgotForm);
router.post("/forgot", userController.forgotPassword);

// Reset password form (link from email)
router.get("/reset/:token", userController.renderResetPasswordForm);
router.post("/reset/:token", userController.resetPassword);

// google auth routes
router.get("/auth/google", userController.googleAuth);
router.get("/auth/google/callback", userController.googleCallback);

module.exports = router;
