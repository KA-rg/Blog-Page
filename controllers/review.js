const Blog = require("../models/blog.js");
const Review = require("../models/review.js");
const Notification = require("../models/notification");

module.exports.createReview = async(req,res) => {
  let blog = await Blog.findById(req.params.id);
  let newReview = new Review(req.body.review);

  blog.reviews.push(newReview._id);
  newReview.author = req.user._id;
  await newReview.save();
  await blog.save();
   // ✅ Create admin notification
    await Notification.create({
      type: "REVIEW_ADDED",
      message: `${req.user.username} added a review on blog: "${blog.title}"`,
      blog: blog._id,
      review: newReview._id,
      link: `/blogs/${blog._id}` // so admin can go directly to the blog
    });
  req.flash("success", "New Review Created!");
  res.redirect(`/blogs/${req.params.id}`);
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