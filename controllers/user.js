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
      res.redirect("/blogs");
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
  const redirectUrl = res.locals.redirect || "/blogs";
  res.redirect(redirectUrl);
};

// Logout
module.exports.logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success", "Logged you out!");
    res.redirect("/blogs");
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
