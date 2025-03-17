const multer = require('multer');

// In-memory storage for multer
const storage = multer.memoryStorage();

// Filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/)) {
    return cb(new Error('Only image and PDF files are allowed!'), false);
  }
  cb(null, true);
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter
});

module.exports = upload;