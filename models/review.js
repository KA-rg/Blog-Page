const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 5, // optional: ensures meaningful reviews
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  blog: {
    type: Schema.Types.ObjectId,
    ref: "Blog", // link the review to a blog post
    // required: true,
  },
});

module.exports = mongoose.model("Review", reviewSchema);