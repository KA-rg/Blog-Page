const mongoose = require("mongoose");
const Review = require("./models/review");

mongoose.connect("mongodb://localhost:27017/failStory")
  .then(async () => {
    const result = await Review.deleteMany({});
    console.log(`Deleted ${result.deletedCount} reviews.`);
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
