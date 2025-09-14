const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review");
const { types } = require("joi");

const blogSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  headContent: String,
  content: String,
  author: String,
  image: {
    filename: String,
    url: String,
  },
  tags: [String],
  views: { type: Number, default: 0 },   // 👈 for Most Reads
  likes: { type: Number, default: 0 },   // 👈 for Popular
  likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }], // 👈 track users who liked
  createdAt: { type: Date, default: Date.now }, // 👈 for Trending

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
    await Review.deleteMany({ _id: { $in: blog.reviews }});
  }
});

const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;