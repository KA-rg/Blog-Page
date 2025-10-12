const { isOwner } = require("../middleware");
const Blog = require("../models/blog");
const Notification = require("../models/notification");

module.exports.home = async (req, res, next) => {
  let { search } = req.query;

  let allBlog;
  if (search) {
    // case-insensitive search on title or location (example)
    allBlog = await Blog.find({
      $or: [
        { title: new RegExp(search, "i") },
        { headContent: new RegExp(search, "i") }
      ]
    });
  } else {
    allBlog = await Blog.find({});
  }
    const trending = await Blog.find({}).sort({ createdAt: -1 }).limit(8);  // newest first
    const mostReads = await Blog.find({}).sort({ views: -1 }).limit(8);     // by views
    const popular = await Blog.find({}).sort({ likes: -1 }).limit(8);       // by likes
    const blogs = await Blog.find({});
    const allTags = [...new Set(blogs.flatMap(blog => blog.tags))];

  res.render("blogs/index", { allBlog, blogs, search, trending, mostReads, popular, allTags });
};

module.exports.index = async (req, res, next) => {
  let { search } = req.query;

  let allBlog;
  if (search) {
    // case-insensitive search on title or location (example)
    allBlog = await Blog.find({
      $or: [
        { title: new RegExp(search, "i") },
        { headContent: new RegExp(search, "i") }
      ]
    });
  } else {
    allBlog = await Blog.find({});
  }
  const blogs = await Blog.find({});
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
    console.log("Like route hit:", req.params.id);
    console.log("User:", req.user);

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
  
    res.render("blogs/show", { blog, blogs, prevBlog, nextBlog, currUser: req.user, ADMIN_ID: process.env.ADMIN_ID});
  } catch (err) {
    next(err);
  }
};

module.exports.updateBlog = async (req,res,next) => {
  let { id } = req.params;
  let blog = await Blog.findByIdAndUpdate(id, {...req.body.blog});

  if(typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    blog.image = { url, filename };
    await blog.save();
  }
  // ✅ Create admin notification
    await Notification.create({
      type: "BLOG_EDITED",
      message: `${req.user.username} updated the blog: ${blog.title}`,
      blog: blog._id,
      link: `/blogs/${blog._id}`
    });
  req.flash("success", "Blog Updated!");
  res.redirect(`/blogs/${id}`);
};

module.exports.renderEditForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      req.flash("error", "Blog not found!");
      return res.redirect("/blogs");
    }

    let originalImageUrl = blog.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_25,h_25");

    res.render("blogs/edit.ejs", { blog, originalImageUrl });
  } catch (err) {
    next(err);
  }
};

module.exports.createBlog = async (req,res,next) => {
  let url = req.file.path;
  let filename = req.file.filename;
  const newBlog = new Blog(req.body.blog);
  newBlog.owner = req.user._id;
  newBlog.image = { url, filename };
  await newBlog.save();
  // ✅ Create admin notification
    await Notification.create({
      type: "BLOG_CREATED",
      message: `${req.user.username} created a new blog: ${newBlog.title}`,
      blog: newBlog._id,
      link: `/blogs/${newBlog._id}`
    });
  req.flash("success", "New Blog Created!");
  res.redirect("/blogs");
};

module.exports.destroyBlog = async (req,res,next) => {
  let { id } = req.params;
  let deletedBlog = await Blog.findByIdAndDelete(id);
  req.flash("success", "Blog deleted Successfully!");
      // ✅ Create admin notification
      await Notification.create({
        type: "BLOG_DELETED",
        message: `Blog titled "${deletedBlog.title}" was deleted`,
        blog: deletedBlog._id,
        link: `/notifications`
      });
      req.flash("success", "blog has been deleted");
  res.redirect("/blogs");
};