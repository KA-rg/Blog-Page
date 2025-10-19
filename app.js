if(process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const Blog = require("./models/blog.js");
const { title } = require("process");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressErrors = require("./utils/ExpressErrors.js");
const { blogSchema,reviewSchema } = require('./schema.js');
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const blogRouter = require("./routes/blog.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const notificationRouter = require("./routes/notification.js");
const adminRoutes = require("./routes/admin");

const blogController = require("./controllers/blog.js");
const { setNotificationCount } = require("./middleware");
const GoogleStrategy = require("passport-google-oauth20").Strategy;


// const dbUrl = process.env.ATLASDB_URL;
const dbUrl = "mongodb://localhost:27017/failStory";
main()
.then(() => {
  console.log("connection to DB");
})
.catch((err) => {
  console.log(err);
});

async function main() {
 await mongoose.connect(dbUrl);
}

// 1. Core setup (views, static, body-parser, method-override)
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// 2. Session + flash (MUST come before passport.session)
const sessionOptions = {
  secret: "thisshouldbeabettersecret!",
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: dbUrl, touchAfter: 24 * 3600 }),
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
};
// If you want real sessions later, uncomment your session setup here
app.use(session(sessionOptions));
app.use(flash());

// 3. Passport init
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// After you set up sessions & passport (if using)
app.use((req, res, next) => {
  res.locals.currUser = req.user; // passport sets req.user when logged in
  next();
});

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          const email = profile.emails[0].value;
          user = await User.findOne({ email });

          if (user) {
            // link google account
            user.googleId = profile.id;
            user.isVerified = true;
          } else {
            // new google user
            user = new User({
              googleId: profile.id,
              username: profile.displayName,
              email,
              isVerified: true,
            });
          }
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// 4. Flash + current user locals
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.usernameError = req.flash("usernameError");
  res.locals.emailError = req.flash("emailError");
  res.locals.passwordError = req.flash("passwordError");
  next();
});
app.use(setNotificationCount);

// 5. Dummy user middleware (ONLY FOR TESTING - remove later)
// app.use((req, res, next) => {
//   if (!req.user) {
//     req.user = {
//       _id: "66df1234567890abcdef1234",
//       username: "testuser",
//       email: "test@example.com"
//     };
//   }
//   res.locals.currUser = req.user;
//   next();
// });
let cachedTags = [];
let lastFetchTime = 0;

app.use(async (req, res, next) => {
  const now = Date.now();
  if (!cachedTags.length || now - lastFetchTime > 5 * 60 * 1000) { // refresh every 5 mins
    try {
      cachedTags = await Blog.distinct("tags");
      lastFetchTime = now;
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  }
  res.locals.tags = cachedTags;
  next();
});


app.use((req, res, next) => {
  res.locals.tags = cachedTags;
  next();
});

// 6. Routers
app.use("/blogs", blogRouter);
app.use("/blogs/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/notifications", notificationRouter);
app.use("/admin", adminRoutes);

port = 8080; 
app.listen(port, () => { 
  console.log(`app is listening to port:${port}`);
});

app.get("/", blogController.home);

// 7. Catch-all for undefined routes
app.all(/.*/, (req, res, next) => {
  next(new ExpressErrors(404, "Page not found"));
});

// 8. Final error handler
app.use((err, req, res, next) => {
  const { status = 500 } = err;
  if (status === 404) {
    return res.status(404).render("blogs/404.ejs", { err });
  }
  res.status(status).render("blogs/error.ejs", { err });
});