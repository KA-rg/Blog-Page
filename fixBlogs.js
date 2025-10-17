if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const Blog = require("./models/blog");
const User = require("./models/user");

(async () => {
  try {
    // 1️⃣ Connect to your MongoDB
    await mongoose.connect("mongodb://localhost:27017/failStory");
    console.log("✅ Connected to MongoDB");

    // 2️⃣ Find a default user (you can change the username)
    const defaultUser = await User.findOne({ username: "Krish Jain" });

    if (!defaultUser) {
      console.log("⚠️ No user found with username 'admin'. Please update this username in the script.");
      // process.exit(1);
    }

    // 3️⃣ Update all blogs that don’t have an owner field
    const result = await Blog.updateMany(
      { owner: { $exists: false } },
      { $set: { owner: process.env.ADMIN_ID } }
    );

    console.log(`✅ Fixed ${result.modifiedCount} blogs — set owner = ${defaultUser.username}`);

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error fixing blog owners:", err);
    await mongoose.connection.close();
  }
})();
