const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin");
const { isAdmin } = require("../middleware");

// Admin dashboard
router.get("/", isAdmin, adminController.dashboard);

// Analytics
router.get("/analytics", isAdmin, adminController.getAnalytics);
router.get("/analytics/export", isAdmin, adminController.exportAnalytics);

// Users
router.get("/users", isAdmin, adminController.listUsers);
router.post("/users/:id/reset-password", isAdmin, adminController.resetUserPassword);
router.post("/users/:id/disable", isAdmin, adminController.disableUser);

//blog moderation
// List all blogs
router.get("/blogs", isAdmin, adminController.listBlogs);

// Approve blog
router.post("/blogs/:id/approve", isAdmin, adminController.approveBlog);

// Undo approval
router.post("/blogs/:id/undoApprove", isAdmin, adminController.undoApproveBlog);

// Reject blog
router.post("/blogs/:id/reject", isAdmin, adminController.rejectBlog);

// Undo reject
router.post("/blogs/:id/undoReject", isAdmin, adminController.undoRejectBlog);

// Delete permanently
router.post("/blogs/:id/delete", isAdmin, adminController.deleteBlog);

// Activity Logs
router.get("/logs", isAdmin, adminController.viewLogs);

// Settings
router.get("/settings", isAdmin, adminController.viewSettings);
router.post("/settings", isAdmin, adminController.updateSettings);

module.exports = router;