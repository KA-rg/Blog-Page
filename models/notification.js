const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  type: {
    type: String,
    enum: ["BLOG_CREATED", "BLOG_EDITED", "BLOG_DELETED", "REVIEW_ADDED"],
    required: true,
  },
  message: { type: String, required: true },
  blog: { type: Schema.Types.ObjectId, ref: "Blog" },
  review: { type: Schema.Types.ObjectId, ref: "Review" },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // mark read/unread
});

module.exports = mongoose.model("Notification", notificationSchema);