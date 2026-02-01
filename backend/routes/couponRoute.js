const express = require('express');
const { addCoupon, listCoupons, removeCoupon, applyCoupon } = require('../controllers/couponController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const couponRouter = express.Router();

// Admin Routes
couponRouter.post('/add', adminAuth, addCoupon);
couponRouter.get('/list', adminAuth, listCoupons);
couponRouter.post('/remove', adminAuth, removeCoupon);

// User Routes
couponRouter.post('/apply', auth, applyCoupon);

module.exports = couponRouter;
