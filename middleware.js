const ExpressErrors = require("./utils/ExpressErrors.js");
const { blogSchema, reviewSchema } = require('./schema.js');
const Blog = require("./models/blog.js");
const Review = require("./models/review.js");

module.exports.isLoggedIn = ( req, res, next) => {
  if(!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
}

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async(req, res, next) => {
  let { id } = req.params;
  let blog = await Blog.findById(id);
  if(!blog.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the owner of this listing");
    return res.redirect(`/blogs/${id}`);
  }
  next();
};

module.exports.isReviewAuthor = async(req, res, next) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);
  if(!review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the author of this review");
    return res.redirect(`/blogs/${id}`);
  }
  next();
};

module.exports.validateBlog = (req, res, next) => {
  let { error } = blogSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressErrors(400, errMsg);  //server side validation
  } else {
    next();
  }
};

module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if(error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressErrors(400, errMsg);  //server side validation
  } else {
    next();
  }
};