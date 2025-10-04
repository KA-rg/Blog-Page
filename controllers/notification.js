const Notification = require("../models/notification");

// Render notifications page
module.exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({})
    .sort({ createdAt: -1 })
    .populate("blog review");

  res.render("admin/notifications", { notifications });
};

// Mark a single notification as read
module.exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { read: true });
  res.redirect("/admin/notifications");
};

// Mark all notifications as read
module.exports.markAllAsRead = async (req, res) => {
  await Notification.updateMany({}, { read: true });
  res.redirect("/admin/notifications");
};

// ✅ Delete a single notification
module.exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndDelete(id);
  req.flash("success", "Notification deleted.");
  res.redirect("/admin/notifications");
};

// ✅ Delete all notifications
module.exports.deleteAllNotifications = async (req, res) => {
  await Notification.deleteMany({});
  req.flash("success", "All notifications deleted.");
  res.redirect("/admin/notifications");
};