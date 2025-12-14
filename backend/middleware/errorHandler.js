import multer from 'multer';

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
  } else if (err) {
    if (err.message === "Invalid image file type.") {
        return res.status(400).json({ success: false, message: "Invalid image file: Only JPEG, PNG, WEBP, and JPG formats are allowed." });
    }
    return res.status(500).json({ success: false, message: `Unknown error: ${err.message}` });
  }
  next();
};

export default errorHandler;
