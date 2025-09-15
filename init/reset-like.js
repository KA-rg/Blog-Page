const mongoose = require("mongoose");
const Blog = require("../models/blog");
const sampleBlogs = require("./data");

// Connect to DB
mongoose.connect("mongodb://127.0.0.1:27017/failStory")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

async function resetLikes() {
  try {
    // set likes = 0 and clear likedBy array for all blogs
    await Blog.updateMany({}, { $set: { likes: 0, likedBy: [] } });
    console.log("✅ All blog likes reset to 0");
  } catch (err) {
    console.error("❌ Error resetting likes:", err);
  } finally {
    mongoose.connection.close();
  }
}

resetLikes();
