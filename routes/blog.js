const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateBlog, isOwner  } = require("../middleware.js");
const blogController = require("../controllers/blog.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router.post("/:id/like", isLoggedIn, blogController.likeBlog); // 👈 Like route

router.get("/category/:tag", blogController.category);

// Toggle save
router
  .get('/saved', isLoggedIn, blogController.savedBlog)
  .post('/:id/save', isLoggedIn, blogController.saveBlog);

//new route
router.get("/new", isLoggedIn, blogController.renderNewForm);

router
  .route("/")
  .get(wrapAsync(blogController.index))
  .post(isLoggedIn, upload.single("blog[image]"), validateBlog, wrapAsync(blogController.createBlog));

router
  .route("/:id")
  .get(wrapAsync(blogController.showBlog))
  .put(isLoggedIn, isOwner, upload.single("blog[image]"), validateBlog, wrapAsync(blogController.updateBlog))
  .delete(isLoggedIn, isOwner, wrapAsync(blogController.destroyBlog));

//edit route
router.get("/:id/edit",isLoggedIn, isOwner, wrapAsync(blogController.renderEditForm));

module.exports = router;