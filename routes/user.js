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

module.exports = router;
