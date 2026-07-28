import multer from 'multer';

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
  } else if (err) {
    if (err.message === "Invalid file type.") {
        return res.status(400).json({ success: false, message: "Invalid file: Only JPEG, PNG, WEBP, JPG images and MP4, WEBM, OGG, MOV videos are allowed." });
    }
    return res.status(500).json({ success: false, message: `Unknown error: ${err.message}` });
  }
  next();
};

export default errorHandler;
