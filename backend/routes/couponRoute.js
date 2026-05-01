import express from 'express';
import { addCoupon, listCoupons, removeCoupon, applyCoupon, getActiveCoupons, applyProductCoupon, getCouponUsage } from '../controllers/couponController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js';

const couponRouter = express.Router();

// Admin Routes
couponRouter.post('/add', adminAuth, addCoupon);
couponRouter.get('/list', adminAuth, listCoupons);
couponRouter.post('/remove', adminAuth, removeCoupon);
couponRouter.get('/usage/:id', adminAuth, getCouponUsage);

// User Routes
couponRouter.post('/apply', auth, applyCoupon);
couponRouter.post('/apply-product-coupon', auth, applyProductCoupon);
couponRouter.get('/all', getActiveCoupons);


export default couponRouter;
