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
  country: String,
  image: {
    filename: String,
    url: String,
  },
  tags: [{type: String, trim: true }],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  views: { type: Number, default: 0 },   // 👈 for Most Reads
  likes: { type: Number, default: 0 },  
  likedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },  // 👈 track users who liked
  createdAt: { type: Date, default: Date.now }, // 👈 for Trending
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

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