const mongoose = require("mongoose");
const Blog = require("../models/blog");
const sampleBlogs = require("./data");


main()
.then(() => {
  console.log("connection to DB");
})
.catch((err) => {
  console.log(err);
});

async function main() {
  await mongoose.connect("mongodb://localhost:27017/failStory");
}

const initDB = async () => {
  await Blog.deleteMany({});
  await Blog.insertMany(sampleBlogs.data);
  console.log("Sample blog posts added!");
};

initDB();