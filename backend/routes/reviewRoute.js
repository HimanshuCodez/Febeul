import express from 'express';
import { addReview, getProductReviews, getUserReviews, getAllReviews, removeReview } from '../controllers/reviewController.js';
import authUser from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const reviewRouter = express.Router();

reviewRouter.post('/add', authUser, upload.array('images', 5), addReview); // Allow up to 5 images per review
reviewRouter.get('/list/:productId', getProductReviews);
reviewRouter.get('/user/:userId', authUser, getUserReviews);
reviewRouter.get('/all', authUser, getAllReviews);
reviewRouter.delete('/remove/:reviewId', authUser, removeReview);

export default reviewRouter;