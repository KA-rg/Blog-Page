const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: { type: String, required: true },        // username or userId
  action: { type: String, required: true },      // e.g., "Deleted blog", "Reset password"
  target: { type: String },                      // optional, e.g., blog title
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);