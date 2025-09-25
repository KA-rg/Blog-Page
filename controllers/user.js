const User = require("../models/user.js");

// Render signup form
module.exports.renderSignupForm = (req,res) => {
  res.render("users/signup.ejs");
};

// Signup logic
module.exports.signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, err => {
      if (err) return next(err);
      req.flash("success", "Welcome to FailStory!");
      res.redirect("/");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

// Render login form
module.exports.renderLoginForm = (req,res) => {
  res.render("users/login.ejs");
};

// Login logic
module.exports.login = (req,res) => {
  req.flash("success", "Welcome back!");
  const redirectUrl = res.locals.redirect || "/";
  res.redirect(redirectUrl);
};

// Logout
module.exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success", "Logged you out!");
    res.redirect("/");
  });
};

// Show profile
module.exports.showProfile = async (req, res) => {
  if (!req.user) {
    req.flash("error", "You must be logged in to view your profile");
    return res.redirect("/login");
  }

  const user = await User.findById(req.user._id)
    .populate("blogs")
    .populate({ path: "reviews", populate: { path: "blog" } });

  res.render("users/profile", { user });
};

// Render edit profile form
module.exports.renderEditForm = (req, res) => {
  res.render("users/edit", {
    user: req.user,
    errorMessages: req.flash("error"),
    successMessages: req.flash("success"),
    usernameError: req.flash("usernameError"),
    emailError: req.flash("emailError"),
    passwordError: req.flash("passwordError"),
  });
};

// Update profile
module.exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { username, email, currentPassword, newPassword } = req.body;

    // --- Username ---
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        req.flash("usernameError", "Username already taken.");
        return res.redirect("/users/edit");
      }
      user.username = username;
    }

    // --- Email ---
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        req.flash("emailError", "Email already registered.");
        return res.redirect("/users/edit");
      }
      user.email = email;
    }

    // --- Password ---
    if (currentPassword && newPassword) {
      user.authenticate(currentPassword, async function(err, userAuth, pwErr) {
        if (err || !userAuth) {
          req.flash("passwordError", "Current password is incorrect.");
          return res.redirect("/users/edit");
        }

        await user.setPassword(newPassword);
        await user.save();
        req.flash("success", "Profile updated successfully!");
        return res.redirect("/profile");
      });
      return; // prevent double save
    }

    await user.save();
    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong!");
    res.redirect("/users/edit");
  }
};

const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Render forgot password form
module.exports.renderForgotForm = (req,res) => {
  res.render("users/forgot", {
    errorMessages: req.flash("error"),
    successMessages: req.flash("success")
  });
};

// Handle forgot password
module.exports.forgotPassword = async (req,res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    req.flash("error", "No account with that email found.");
    return res.redirect("/forgot");
  }

  // Generate token
  const token = crypto.randomBytes(20).toString("hex");

  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send email
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_USER,
    subject: "Password Reset",
    text: `You are receiving this because you requested a password reset.\n\n
      Please click the following link to reset your password:\n\n
      http://${req.headers.host}/reset/${token}\n\n
      This link will expire in 1 hour.\n`
  };

  await transporter.sendMail(mailOptions);

  req.flash("success", "An email has been sent with password reset instructions.");
  res.redirect("/forgot");
};

// render reset form
module.exports.renderResetPasswordForm = (req, res) => {
  res.render("users/reset", {
    token: req.params.token,           // your reset token
    errorMessages: req.flash("error"), // pass error flash messages
    successMessages: req.flash("success") // pass success flash messages
  });
};

// Handle reset
module.exports.resetPassword = async (req,res) => {
  const user = await User.findOne({ 
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }

  if (req.body.password !== req.body.confirm) {
    req.flash("error", "Passwords do not match.");
    return res.redirect(`/reset/${req.params.token}`);
  }

  await user.setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  req.flash("success", "Password has been reset! You can now login.");
  res.redirect("/login");
};