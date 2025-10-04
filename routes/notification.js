const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification");
const { isAdmin } = require("../middleware.js");

// Admin notifications page
router.get("/", isAdmin, notificationController.getNotifications);

// Mark one as read
router.post("/:id/read", isAdmin, notificationController.markAsRead);

// Mark all as read
router.post("/read-all", isAdmin, notificationController.markAllAsRead);

// ✅ Delete one notification
router.post("/:id/delete", isAdmin, notificationController.deleteNotification);

// ✅ Delete all notifications
router.post("/delete-all", isAdmin, notificationController.deleteAllNotifications);

module.exports = router;