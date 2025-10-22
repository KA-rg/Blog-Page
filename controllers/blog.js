const { isOwner } = require("../middleware");
const Blog = require("../models/blog");
const Notification = require("../models/notification");
const cloudinary = require("cloudinary").v2;

// 📂 Show blogs by tag
module.exports.category = async (req, res) => {
  try {
    const tag = req.params.tag;
    const blogs = await Blog.find({ tags: tag }).sort({ createdAt: -1 });

    res.render("blogs/category", { tag, blogs });
  } catch (err) {
    console.error("Category page error:", err);
    req.flash("error", "Failed to load category blogs");
    res.redirect("/blogs");
  }
};

// ------------------ Home Page ------------------
module.exports.home = async (req, res, next) => {
  let { search } = req.query;

  // Search only among approved blogs
  let filter = { status: "approved" };

  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { headContent: new RegExp(search, "i") }
    ];
  }

  // Fetch approved blogs
  const allBlog = await Blog.find(filter).populate("owner");

  // Fetch trending/most read/popular (approved only)
  const trending = await Blog.find({ status: "approved" })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("owner");

  const mostReads = await Blog.find({ status: "approved" })
    .sort({ views: -1 })
    .limit(8)
    .populate("owner");

  const popular = await Blog.find({ status: "approved" })
    .sort({ likes: -1 })
    .limit(8)
    .populate("owner");

  const blogs = await Blog.find({ status: "approved" });
  const allTags = [...new Set(blogs.flatMap(blog => blog.tags))];

  res.render("blogs/index", {
    allBlog,
    blogs,
    search,
    trending,
    mostReads,
    popular,
    allTags
  });
};

// ------------------ All Blogs Page ------------------
module.exports.index = async (req, res, next) => {
  let { search } = req.query;

  // Filter for approved blogs only
  let filter = { status: "approved" };

  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { headContent: new RegExp(search, "i") }
    ];
  }

  const allBlog = await Blog.find(filter).populate("owner");
  const blogs = await Blog.find({ status: "approved" }).populate("owner");

  res.render("blogs/allBlogs", { allBlog, blogs, search });
};

module.exports.saveBlog = async (req, res) => {
 try {
    if (!req.user) {
      return res.status(401).json({ error: "You must be logged in to save blogs" });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: "Blog not found" });

    const userId = req.user._id;
    const alreadySaved = blog.savedBy.some(id => id.toString() === userId.toString());

    if (alreadySaved) {
      // Unsave
      blog.savedBy = blog.savedBy.filter(id => id.toString() !== userId.toString());
      await blog.save();
      return res.json({ saved: false });
    } else {
      // Save
      blog.savedBy.push(userId);
      await blog.save();
      return res.json({ saved: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports.savedBlog = async (req,res) => {
   try {
    if (!req.user) {
      req.flash("error", "You must be logged in to view saved blogs.");
      return res.redirect("/login");
    }

    // Fetch saved blogs
    const blogs = await Blog.find({ savedBy: req.user._id });

    // Fetch most liked blogs for suggestions
    const suggestions = await Blog.find({})
      .sort({ likes: -1 }) // highest likes first
      .limit(4); // limit to 4 suggestions

    res.render("blogs/saved", { blogs, suggestions, currUser: req.user });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong!");
    res.redirect("/blogs");
  }
};

module.exports.renderNewForm = async (req,res) => { 
   const tagEnum = Blog.schema.path("tags").caster.enumValues;
res.render("blogs/new", { tagEnum, blog: { tags: [] } });

};

module.exports.likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      console.log("❌ Blog not found");
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    if (!req.user) {
      console.log("❌ User not logged in");
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const userId = req.user._id;
    const alreadyLiked = blog.likedBy.some(id => id.toString() === userId.toString());

    console.log("Already liked:", alreadyLiked);

    if (alreadyLiked) {
      blog.likes = Math.max(0, blog.likes - 1);
      blog.likedBy = blog.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      blog.likes += 1;
      blog.likedBy.push(userId);
    }

    await blog.save();

    console.log("✅ Blog updated. Likes:", blog.likes);

    res.json({
      success: true,
      liked: !alreadyLiked,
      likes: blog.likes
    });

  } catch (err) {
    console.error("💥 Error in likeBlog:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports.showBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id)
      .populate({
        path: "reviews",
        populate: { path: "author" },
      })
      .populate("owner")
      .populate("author")
      .populate("likedBy", "username"); // 👈 only bring username

    if (!blog) {
      req.flash("error", "Blog not found!");
      return res.redirect("/blogs");
    }
    
    blog.views += 1; // increment views
    await blog.save();

    // Step 1: Try to fetch related blogs
  let relatedBlogs = await Blog.find({
    _id: { $ne: id },
    tags: { $in: blog.tags }
  }).limit(8);

  // Step 2: If not enough, fetch random blogs to fill
  if (relatedBlogs.length < 8) {
    const moreBlogs = await Blog.find({ _id: { $ne: id } })
      .limit(8 - relatedBlogs.length);

    // merge related + random (avoid duplicates)
    const existingIds = relatedBlogs.map(b => b._id.toString());
    moreBlogs.forEach(b => {
      if (!existingIds.includes(b._id.toString())) {
        relatedBlogs.push(b);
      }
    });
  }



  // // Fetch related blogs for sidebar
  // let relatedBlogs = await Blog.find({
  //   _id: { $ne: blog._id },
  //   tags: { $in: blog.tags }
  // }).limit(8);

  // if (relatedBlogs.length < 8) {
  //   const extra = await Blog.find({ _id: { $ne: blog._id } })
  //     .limit(8 - relatedBlogs.length);
  //   relatedBlogs = relatedBlogs.concat(extra);
  // }

  // // Find previous and next blogs (based on createdAt)
  // const prevBlog = await Blog.findOne({ createdAt: { $lt: blog.createdAt } })
  //   .sort({ createdAt: -1 });
  // const nextBlog = await Blog.findOne({ createdAt: { $gt: blog.createdAt } })
  //   .sort({ createdAt: 1 });



  // All blogs (sorted by date for navigation)
  const blogs = await Blog.find().sort({ createdAt: 1 });

  // Find index of current blog
  const index = blogs.findIndex(b => b._id.toString() === blog._id.toString());

  // Previous and next blogs
  const prevBlog = index > 0 ? blogs[index - 1] : null;
  const nextBlog = index < blogs.length - 1 ? blogs[index + 1] : null;
  // console.log(req.user._id.toString());
  // console.log(process.env.ADMIN_ID);
    res.render("blogs/show", { blog, blogs, prevBlog, nextBlog, currUser: req.user, ADMIN_ID: process.env.ADMIN_ID});
  } catch (err) {
    next(err);
  }
};

module.exports.renderEditForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      req.flash("error", "Blog not found!");
      return res.redirect("/blogs");
    }

    // Get existing enum values from schema
    const tagEnum = Blog.schema.path("tags").caster.enumValues;

    // Include any existing tags that are not in tagEnum (dynamic tags)
    blog.tags.forEach(tag => {
      if (!tagEnum.includes(tag)) tagEnum.push(tag);
    });

    let originalImageUrl = blog.image?.url || "";
    if (originalImageUrl) {
      originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_25,h_25");
    }

    res.render("blogs/edit", { blog, tagEnum, originalImageUrl });
  } catch (err) {
    next(err);
  }
};

module.exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { blog, newTag } = req.body;

    // Ensure tags array exists
    if (!blog.tags) blog.tags = [];
    else if (!Array.isArray(blog.tags)) blog.tags = [blog.tags];

    // Parse new tags from JSON string
    let newTagsArray = [];
    try {
      newTagsArray = JSON.parse(newTag || "[]");
    } catch (err) {
      newTagsArray = [];
    }

    // Merge new tags into blog.tags and update enum
    newTagsArray.forEach(tag => {
      tag = tag.trim();
      if (tag && !blog.tags.includes(tag)) {
        blog.tags.push(tag);

        const tagPath = Blog.schema.path("tags").caster;
        if (!tagPath.enumValues.includes(tag)) {
          tagPath.enumValues.push(tag);
        }
      }
    });

    // Update blog
    let updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true });

    // Handle new image if uploaded
    if (req.file) {
      const url = req.file.path;
      const filename = req.file.filename;
      updatedBlog.image = { url, filename };
      await updatedBlog.save();
    }

    // Admin notification
    await Notification.create({
      type: "BLOG_EDITED",
      message: `${req.user.username} updated the blog: ${updatedBlog.title}`,
      blog: updatedBlog._id,
      link: `/blogs/${updatedBlog._id}`,
      createdAt: new Date(),
      isRead: false
    });

    req.flash("success", "Blog Updated!");
    res.redirect(`/blogs/${id}`);
  } catch (err) {
    console.error("Error updating blog:", err);
    req.flash("error", "Failed to update blog. Please try again.");
    res.redirect(`/blogs/${req.params.id}/edit`);
  }
};

module.exports.createBlog = async (req, res) => {
  try {
    const { blog, newTag } = req.body;

    // Ensure tags are always in array format
    if (!blog.tags) blog.tags = [];
    else if (!Array.isArray(blog.tags)) blog.tags = [blog.tags];

    // Parse new tags (JSON string sent from hidden input)
    let newTagsArray = [];
    try {
      newTagsArray = JSON.parse(newTag || "[]");
    } catch (err) {
      newTagsArray = [];
    }

    // Merge new tags into existing tags
    newTagsArray.forEach(tag => {
      tag = tag.trim();
      if (tag && !blog.tags.includes(tag)) {
        blog.tags.push(tag);

        // Dynamically extend enum for current session
        const tagPath = Blog.schema.path("tags").caster;
        if (!tagPath.enumValues.includes(tag)) {
          tagPath.enumValues.push(tag);
        }
      }
    });
    let url = req.file.path;
    let filename = req.file.filename;
    // Create a new blog document with pending status
    const newBlog = new Blog({
  ...blog,
  image: { url, filename },
  owner: req.user._id,
  status: req.user._id.toString() === process.env.ADMIN_ID ? "approved" : "pending" // ✅ auto-approve if admin
});

    await newBlog.save();
    
    // Create admin notification for approval
    await Notification.create({
      type: "blog_approval",
      message: `New blog "${newBlog.title}" is awaiting your approval.`,
      blog: newBlog._id,
      createdAt: new Date(),
      isRead: false,
      // link: `/blogs/${_.id}`,
    });
    req.flash(
  "success",
  newBlog.status === "approved"
    ? "Blog created and automatically approved!"
    : "Blog submitted for admin approval!"
);
    res.redirect("/blogs");
  } catch (err) {
    console.error("Error creating blog:", err);
    req.flash("error", "Failed to create blog. Please try again.");
    res.redirect("/blogs/new");
  }
};

module.exports.destroyBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBlog = await Blog.findById(id);

    if (!deletedBlog) {
      req.flash("error", "Blog not found!");
      return res.redirect("/blogs");
    }

    // 🧹 Delete image from Cloudinary if exists
    if (deletedBlog.image && deletedBlog.image.filename) {
      await cloudinary.uploader.destroy(deletedBlog.image.filename);
    }

    // 🗑️ Delete blog from database
    await Blog.findByIdAndDelete(id);

    // 📨 Create admin notification
    await Notification.create({
      type: "BLOG_DELETED",
      message: `Blog titled "${deletedBlog.title}" was deleted`,
      blog: deletedBlog._id,
      link: `/notifications`,
    });

    req.flash("success", "Blog deleted successfully!");
    res.redirect("/blogs");
  } catch (err) {
    console.error("Error deleting blog:", err);
    req.flash("error", "Failed to delete blog. Please try again.");
    res.redirect("/blogs");
  }
};