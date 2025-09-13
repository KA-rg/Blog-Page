const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");
const { types } = require("joi");

const blogSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: String,
  author: String,
  image: {
    filename: String,
    url: String,
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

blogSchema.post("findOneAndDelete", async (blog) => {
  if(blog) {
    await Review.deleteMany({ _id: { $in: blog.review }});
  }
});

const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;