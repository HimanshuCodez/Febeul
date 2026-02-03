import express from 'express';
import { addCoupon, listCoupons, removeCoupon, applyCoupon, getActiveCoupons } from '../controllers/couponController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js';

const couponRouter = express.Router();

// Admin Routes
couponRouter.post('/add', authUser, addCoupon);
couponRouter.get('/list', authUser, listCoupons);
couponRouter.post('/remove', authUser, removeCoupon);

// User Routes
couponRouter.post('/apply', auth, applyCoupon);
couponRouter.get('/all', getActiveCoupons);


export default couponRouter;
