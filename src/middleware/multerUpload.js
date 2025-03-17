const multer = require('multer');

// In-memory storage for multer
const storage = multer.memoryStorage();

// Filter to ensure only images are uploaded
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profilePicture') {
    // For profile pictures, only allow image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed for profile pictures!'), false);
    }
  } else if (file.fieldname === 'receipt') {
    // For receipts, allow images and PDFs
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/)) {
      return cb(new Error('Only image and PDF files are allowed for receipts!'), false);
    }
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