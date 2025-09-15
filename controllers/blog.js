const Blog = require("../models/blog");

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
    const trending = await Blog.find({}).sort({ createdAt: -1 }).limit(8);  // newest first
    const mostReads = await Blog.find({}).sort({ views: -1 }).limit(8);     // by views
    const popular = await Blog.find({}).sort({ likes: -1 }).limit(8);       // by likes
    const blogs = await Blog.find({});
    const allTags = [...new Set(blogs.flatMap(blog => blog.tags))];

  res.render("blogs/index", { allBlog, search, trending, mostReads, popular, allTags });
};

module.exports.renderNewForm = async (req,res) => { 
   const blogs = await Blog.find({});
    const allTags = [...new Set(blogs.flatMap(blog => blog.tags))];
  res.render("blogs/new", { allTags });
};

module.exports.likeBlog = async (req, res) => {

    try {
    const blog = await Blog.findById(req.params.id);

    // Check if user already liked (for demo: store in req.session or user.likes)
    const userId = req.user?._id; // if logged in
    const alreadyLiked = blog.likedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike
      blog.likes -= 1;
      blog.likedBy = blog.likedBy.filter(id => id.toString() !== userId.toString());
    } else {
      // Like
      blog.likes += 1;
      blog.likedBy.push(userId);
    }

    await blog.save();
    res.redirect("/blogs");
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
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

    res.render("blogs/show", { blog });
  } catch (err) {
    next(err);
  }
};

module.exports.updateBlog = async (req,res,next) =>{
  let { id } = req.params;
  let blog = await Blog.findByIdAndUpdate(id, {...req.body.blog});

  if(typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    blog.image = { url, filename };
    await blog.save();
  }
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
  req.flash("success", "New Blog Created!");
  res.redirect("/blogs");
};

module.exports.destroyBlog = async (req,res,next) => {
  let { id } = req.params;
  let deletedBlog = await Blog.findByIdAndDelete(id);
  req.flash("success", "Blog deleted Successfully!");
  res.redirect("/blogs");
};