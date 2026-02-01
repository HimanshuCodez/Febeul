const couponModel = require('../models/couponModel');

// Admin: Add a new coupon
const addCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderAmount, usageLimit, usageLimitPerUser, expiryDate, isActive } = req.body;

        if (!code || !discountType || !discountValue || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Required fields are missing.' });
        }

        const existingCoupon = await couponModel.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
        }

        const newCoupon = new couponModel({
            code,
            discountType,
            discountValue,
            minOrderAmount,
            usageLimit,
            usageLimitPerUser,
            expiryDate,
            isActive
        });

        await newCoupon.save();
        res.json({ success: true, message: 'Coupon added successfully.', coupon: newCoupon });

    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to add coupon.' });
    }
};

// Admin: List all coupons
const listCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({}).sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Error listing coupons:', error);
        res.status(500).json({ success: false, message: 'Failed to list coupons.' });
    }
};

// Admin: Remove a coupon
const removeCoupon = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Coupon ID is required.' });
        }

        const deletedCoupon = await couponModel.findByIdAndDelete(id);
        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        res.json({ success: true, message: 'Coupon deleted successfully.' });

    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
    }
};

// User: Apply a coupon
const applyCoupon = async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const userId = req.body.userId;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }

        const coupon = await couponModel.findOne({ code: code.toUpperCase() });

        if (!coupon || !coupon.isActive) {
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon has reached its usage limit.' });
        }

        if (cartTotal < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `Minimum order amount of ₹${coupon.minOrderAmount} is required.` });
        }

        const userUsage = coupon.usersWhoUsed.filter(u => u.userId.toString() === userId).length;
        if (userUsage >= coupon.usageLimitPerUser) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times.' });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.discountValue) / 100;
        } else { // fixed
            discountAmount = coupon.discountValue;
        }
        
        // The frontend will be responsible for not letting discount be greater than total
        discountAmount = Math.min(discountAmount, cartTotal);

        res.json({
            success: true,
            message: 'Coupon applied!',
            discountAmount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Error applying coupon.' });
    }
};

module.exports = { addCoupon, listCoupons, removeCoupon, applyCoupon };
