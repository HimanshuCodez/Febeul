import express from 'express';
import { addReview, getProductReviews } from '../controllers/reviewController.js';
import authUser from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const reviewRouter = express.Router();

reviewRouter.post('/add', authUser, upload.array('images', 5), addReview); // Allow up to 5 images per review
reviewRouter.get('/list/:productId', getProductReviews);

export default reviewRouter;