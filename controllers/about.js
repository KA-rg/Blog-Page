// controllers/aboutController.js
module.exports.renderAboutPage = (req, res) => {
  res.render("about", {
    title: "About | FailStory",
    description:
      "FailStory is a blog platform where people share real experiences, lessons learned from failures, and growth journeys."
  });
};