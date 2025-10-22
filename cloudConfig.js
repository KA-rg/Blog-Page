const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "failstory",
    allowedFormats: ["png", "jpg", "jpeg"],
  },
});

// 🚫 Restrict upload to ≤ 1 MB
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB limit
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPG, PNG, or WEBP files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

module.exports = {
  cloudinary,
  storage,
  upload,
};