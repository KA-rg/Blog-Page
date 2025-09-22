const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  blogs: [{ type: Schema.Types.ObjectId, ref: "Blog" }],
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }]

});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);