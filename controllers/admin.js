const Blog = require("../models/blog");
const User = require("../models/user");
const Review = require("../models/review");
const Notification = require("../models/notification");
const ExcelJS = require("exceljs");

module.exports.dashboard = async (req, res) => {
  try {
    // Fetch counts for dashboard badges
    const totalUsers = await User.countDocuments();
    const pendingBlogs = await Blog.countDocuments({ approved: false });
    const unreadNotifications = await Notification.countDocuments({ read: false });

    res.render("admin/admin", { totalUsers, pendingBlogs, unreadNotifications });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to load dashboard.");
    res.redirect("/");
  }
};

// ---------------- GET ANALYTICS PAGE -----------------
module.exports.getAnalytics = async (req, res) => {
  try {
    const range = req.query.range || "all";
    let startDate;

    if (range !== "all") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(range));
    }

    // --- Blog stats per day ---
    const matchBlog = startDate ? { createdAt: { $gte: startDate } } : {};
    const blogStats = await Blog.aggregate([
      { $match: matchBlog },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalBlogs: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --- Comments per day ---
    const matchComment = startDate ? { createdAt: { $gte: startDate } } : {};
    const commentStats = await Review.aggregate([
      { $match: matchComment },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalComments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --- Category distribution ---
    const allBlogs = await Blog.find({});
    const categoryDist = allBlogs.reduce((acc, blog) => {
      blog.tags.forEach(tag => {
        const existing = acc.find(c => c._id === tag);
        if (existing) existing.count++;
        else acc.push({ _id: tag, count: 1 });
      });
      return acc;
    }, []);

    // --- Top blogs ---
    const topBlogs = await Blog.find({}).sort({ views: -1 }).limit(5);

    // --- Top authors (safe aggregation) ---
    const topAuthors = await User.aggregate([
      {
        $lookup: {
          from: "blogs",
          localField: "_id",
          foreignField: "owner",
          as: "blogs"
        }
      },
      {
        $project: {
          username: 1,
          blogsCount: { $size: { $ifNull: ["$blogs", []] } },
          totalViews: {
            $sum: { $map: { input: { $ifNull: ["$blogs", []] }, as: "b", in: "$$b.views" } }
          },
          totalLikes: {
            $sum: { $map: { input: { $ifNull: ["$blogs", []] }, as: "b", in: "$$b.likes" } }
          }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 5 }
    ]);

    // --- Top tags ---
    const tagMap = {};
    allBlogs.forEach(b => b.tags.forEach(tag => tagMap[tag] = (tagMap[tag] || 0) + 1));
    const topTags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Summary cards ---
    const totalBlogs = await Blog.countDocuments({});
    const totalUsers = await User.countDocuments({});
    const totalComments = await Review.countDocuments({});
    const totalLikes = allBlogs.reduce((acc, b) => acc + b.likes, 0);
    const totalSaves = allBlogs.reduce((acc, b) => acc + (b.savedBy?.length || 0), 0);
    const unreadNotifications = await Notification.countDocuments({ read: false });

    const alerts = [];
    if (totalBlogs === 0) alerts.push("No blogs created yet!");
    if (totalComments === 0) alerts.push("No comments yet!");
    if (totalUsers === 0) alerts.push("No users registered yet!");

    res.render("admin/analytics", {
      blogStats,
      commentStats,
      categoryDist,
      topBlogs,
      topAuthors,
      topTags,
      totalBlogs,
      totalUsers,
      totalComments,
      totalLikes,
      totalSaves,
      unreadNotifications,
      alerts,
      range
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching analytics.");
  }
};

// ---------------- EXPORT ANALYTICS TO EXCEL -----------------
module.exports.exportAnalytics = async (req, res) => {
  try {
    const range = req.query.range || "all";
    let startDate;
    if (range !== "all") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(range));
    }

    // --- Aggregations (same as above) ---
    const matchBlog = startDate ? { createdAt: { $gte: startDate } } : {};
    const blogStats = await Blog.aggregate([
      { $match: matchBlog },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalBlogs: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likes" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const commentStats = await Review.aggregate([
      { $match: startDate ? { createdAt: { $gte: startDate } } : {} },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalComments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const allBlogs = await Blog.find({});
    const topBlogs = await Blog.find({}).sort({ views: -1 }).limit(10);
    const topAuthors = await User.aggregate([
      {
        $lookup: {
          from: "blogs",
          localField: "_id",
          foreignField: "owner",
          as: "blogs"
        }
      },
      {
        $project: {
          username: 1,
          blogsCount: { $size: { $ifNull: ["$blogs", []] } },
          totalViews: { $sum: { $map: { input: { $ifNull: ["$blogs", []] }, as: "b", in: "$$b.views" } } },
          totalLikes: { $sum: { $map: { input: { $ifNull: ["$blogs", []] }, as: "b", in: "$$b.likes" } } }
        }
      },
      { $sort: { totalViews: -1 } },
      { $limit: 10 }
    ]);

    const tagMap = {};
    allBlogs.forEach(b => b.tags.forEach(tag => tagMap[tag] = (tagMap[tag] || 0) + 1));
    const topTags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Excel workbook ---
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Admin';
    workbook.created = new Date();

    // Blog Stats Sheet
    const blogSheet = workbook.addWorksheet("Blog Stats");
    blogSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Total Blogs", key: "totalBlogs", width: 15 },
      { header: "Total Views", key: "totalViews", width: 15 },
      { header: "Total Likes", key: "totalLikes", width: 15 }
    ];
    blogStats.forEach(b => blogSheet.addRow({ date: b._id, totalBlogs: b.totalBlogs, totalViews: b.totalViews, totalLikes: b.totalLikes }));

    // Comments Sheet
    const commentSheet = workbook.addWorksheet("Comments");
    commentSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Total Comments", key: "totalComments", width: 15 }
    ];
    commentStats.forEach(c => commentSheet.addRow({ date: c._id, totalComments: c.totalComments }));

    // Top Blogs Sheet
    const topBlogSheet = workbook.addWorksheet("Top Blogs");
    topBlogSheet.columns = [
      { header: "Title", key: "title", width: 30 },
      { header: "Views", key: "views", width: 10 },
      { header: "Likes", key: "likes", width: 10 },
      { header: "Comments Count", key: "commentsCount", width: 15 }
    ];
    topBlogs.forEach(b => topBlogSheet.addRow({ title: b.title, views: b.views, likes: b.likes, commentsCount: b.comments?.length || 0 }));

    // Top Authors Sheet
    const topAuthorSheet = workbook.addWorksheet("Top Authors");
    topAuthorSheet.columns = [
      { header: "Username", key: "username", width: 20 },
      { header: "Blogs Count", key: "blogsCount", width: 15 },
      { header: "Total Views", key: "totalViews", width: 15 },
      { header: "Total Likes", key: "totalLikes", width: 15 }
    ];
    topAuthors.forEach(a => topAuthorSheet.addRow(a));

    // Top Tags Sheet
    const topTagSheet = workbook.addWorksheet("Top Tags");
    topTagSheet.columns = [
      { header: "Tag", key: "tag", width: 20 },
      { header: "Count", key: "count", width: 10 }
    ];
    topTags.forEach(t => topTagSheet.addRow(t));

    // Export file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Blog_Analytics_${new Date().toISOString().slice(0,10)}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error exporting analytics.");
  }
};

// ------------------ User Management ------------------
module.exports.listUsers = async (req, res) => {
  const users = await User.find();
  res.render("admin/users", { users });
};

module.exports.resetUserPassword = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.redirect("/admin/users");
  user.password = "temporary123"; // hash in production
  await user.save();
  req.flash("success", "Password reset to temporary123");
  res.redirect("/admin/users");
};

module.exports.disableUser = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { active: false });
  req.flash("success", "User disabled.");
  res.redirect("/admin/users");
};

// ------------------ Blog Moderation ------------------
module.exports.listBlogs = async (req, res) => {
  const blogs = await Blog.find().populate("owner");
  res.render("admin/blogs", { blogs });
};

module.exports.deleteBlog = async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  req.flash("success", "Blog deleted.");
  res.redirect("/admin/blogs");
};

module.exports.approveBlog = async (req, res) => {
  await Blog.findByIdAndUpdate(req.params.id, { approved: true });
  req.flash("success", "Blog approved.");
  res.redirect("/admin/blogs");
};

// ------------------ Activity Logs ------------------
module.exports.viewLogs = async (req, res) => {
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  res.render("admin/logs", { logs });
};

// ------------------ Settings ------------------
module.exports.viewSettings = async (req, res) => {
  res.render("admin/settings", { settings: { siteName: "My Blog", adminEmail: "admin@example.com" } });
};

module.exports.updateSettings = async (req, res) => {
  const { siteName, adminEmail } = req.body;
  // Update logic, save to DB if you have a Settings model
  req.flash("success", "Settings updated.");
  res.redirect("/admin/settings");
};