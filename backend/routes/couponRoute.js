import express from 'express';
import { addCoupon, listCoupons, removeCoupon, applyCoupon, getActiveCoupons, applyProductCoupon, getCouponUsage, getAllCouponUsage, updateCoupon } from '../controllers/couponController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const couponRouter = express.Router();

// Admin Routes
couponRouter.post('/add', adminAuth, addCoupon);
couponRouter.get('/list', adminAuth, listCoupons);
couponRouter.post('/remove', adminAuth, removeCoupon);
couponRouter.post('/update', adminAuth, updateCoupon);
couponRouter.get('/usage/:id', adminAuth, getCouponUsage);
couponRouter.get('/usage-all', adminAuth, getAllCouponUsage);

// User Routes
couponRouter.post('/apply', auth, applyCoupon);
couponRouter.post('/apply-product-coupon', auth, applyProductCoupon);
couponRouter.get('/all', auth, getActiveCoupons);

export default couponRouter;
