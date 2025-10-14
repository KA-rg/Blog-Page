const Blog = require("../models/blog.js");
const Review = require("../models/review.js");
const Notification = require("../models/notification");

module.exports.createReview = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      req.flash("error", "Blog not found");
      return res.redirect("/blogs");
    }

    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;  // ✅ author = current user
    newReview.blog = blog._id;        // ✅ link this review to blog

    await newReview.save();

    blog.reviews.push(newReview._id);
    await blog.save();

    // ✅ Create admin notification
    await Notification.create({
      type: "REVIEW_ADDED",
      message: `${req.user.username} added a review on blog: "${blog.title}"`,
      blog: blog._id,
      review: newReview._id,
      link: `/blogs/${blog._id}`
    });

    req.flash("success", "New Review Created!");
    res.redirect(`/blogs/${blog._id}`);
  } catch (err) {
    console.error("Review creation error:", err);
    req.flash("error", "Failed to add review");
    res.redirect(`/blogs/${req.params.id}`);
  }
};


module.exports.destroyReview = async(req,res) => {
  let { id, reviewId } = req.params;
  let blog = await Blog.findById(req.params.id);
  await Blog.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
  await Review.findByIdAndDelete(reviewId);
  // ✅ Create admin notification
   await Notification.create({
     type: "REVIEW_DELETED",
     message: `${req.user.username} deleted a review from blog: "${blog.title}"`,
     blog: blog._id,
    //  review: deletedReview?._id,
     link: `/blogs/${blog._id}`
   });
  req.flash("success", "Review deleted Successfully!");
  res.redirect(`/blogs/${id}`);
};