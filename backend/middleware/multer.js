import multer from "multer";

const storage = multer.diskStorage({
    filename:function(req,file,callback){
        callback(null,file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid image file type."), false);
    }
};

const upload = multer({storage, fileFilter})

export default upload