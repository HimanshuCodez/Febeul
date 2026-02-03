import express from 'express';
import { addCoupon, listCoupons, removeCoupon, applyCoupon, getActiveCoupons } from '../controllers/couponController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const couponRouter = express.Router();

// Admin Routes
couponRouter.post('/add', adminAuth, addCoupon);
couponRouter.get('/list', adminAuth, listCoupons);
couponRouter.post('/remove', adminAuth, removeCoupon);

// User Routes
couponRouter.post('/apply', auth, applyCoupon);
couponRouter.get('/all', getActiveCoupons);


export default couponRouter;
