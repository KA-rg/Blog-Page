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
  res.redirect("/notifications");
};

// Mark all notifications as read
module.exports.markAllAsRead = async (req, res) => {
  await Notification.updateMany({}, { read: true });
  res.redirect("/notifications");
};

module.exports.redirectPage = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      req.flash("error", "Notification not found!");
      return res.redirect("/notifications");
    }

    // Mark as read
    notification.read = true;
    await notification.save();

    // Redirect to stored link
    if (notification.link) {
      return res.redirect(notification.link);
    } else {
      return res.redirect("/notifications");
    }
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong!");
    res.redirect("/notifications");
  }
};

// ✅ Delete a single notification
module.exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndDelete(id);
  req.flash("success", "Notification deleted.");
  res.redirect("/notifications");
};

// ✅ Delete all notifications
module.exports.deleteAllNotifications = async (req, res) => {
  await Notification.deleteMany({});
  req.flash("success", "All notifications deleted.");
  res.redirect("/notifications");
};