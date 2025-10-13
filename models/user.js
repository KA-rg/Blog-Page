const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  blogs: [{ type: Schema.Types.ObjectId, ref: "Blog" }],
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
  email: { type: String, required: true, unique: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // --- For Email Verification ---
  isVerified: { type: Boolean, default: false },
  emailVerificationToken: String,

  // --- For Google OAuth ---
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
