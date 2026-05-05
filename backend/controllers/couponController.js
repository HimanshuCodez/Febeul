import couponModel from '../models/couponModel.js';

// Admin: Add a new coupon
export const addCoupon = async (req, res) => {
    try {
        const { code, description, discountType, discountValue, minOrderAmount, minQuantity, usageLimit, usageLimitPerUser, expiryDate, isActive, userType, offerType, applicableSKUs } = req.body;

        if (!code || !discountType || !discountValue || !expiryDate) {
            return res.status(400).json({ success: false, message: 'Required fields are missing.' });
        }

        const existingCoupon = await couponModel.findOne({ code });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists.' });
        }

        const newCoupon = new couponModel({
            code,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            minQuantity: minQuantity || 0,
            usageLimit,
            usageLimitPerUser,
            expiryDate,
            isActive,
            userType,
            offerType: offerType || 'none',
            applicableSKUs: applicableSKUs || [],
            creator: {
                name: req.userName || 'Admin',
                email: req.userEmail || '',
                role: req.role || 'admin'
            }
        });

        await newCoupon.save();
        res.json({ success: true, message: 'Coupon added successfully.', coupon: newCoupon });

    } catch (error) {
        console.error('Error adding coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to add coupon.' });
    }
};

// Admin: List all coupons
export const listCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({}).sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Error listing coupons:', error);
        res.status(500).json({ success: false, message: 'Failed to list coupons.' });
    }
};

// Admin: Remove a coupon
export const removeCoupon = async (req, res) => {
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

// Admin: Get users who used a specific coupon
export const getCouponUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await couponModel.findById(id).populate('usersWhoUsed.userId', 'name email');
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        res.json({ success: true, users: coupon.usersWhoUsed });
    } catch (error) {
        console.error('Error fetching coupon usage:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch coupon usage.' });
    }
};

// User: Apply a coupon
export const applyCoupon = async (req, res) => {
    try {
        const { code, items, paymentMethod } = req.body; // Expecting items from cart
        const userId = req.body.userId;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart items are required to apply a coupon.' });
        }

        const coupon = await couponModel.findOne({ code: code.toUpperCase() });

        if (!coupon || !coupon.isActive) {
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        // Check Payment Method Restriction
        if (coupon.offerType === 'prepaid' && paymentMethod && paymentMethod !== 'card') {
            return res.status(400).json({ success: false, message: 'This coupon is only applicable for prepaid orders.' });
        }
        if (coupon.offerType === 'cod' && paymentMethod && paymentMethod !== 'cod') {
            return res.status(400).json({ success: false, message: 'This coupon is only applicable for Cash on Delivery (COD) orders.' });
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon has reached its usage limit.' });
        }
        
        const userUsage = coupon.usersWhoUsed.filter(u => u.userId.toString() === userId).length;
        if (coupon.usageLimitPerUser && userUsage >= coupon.usageLimitPerUser) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times.' });
        }

        // Check User Type Restriction
        if (coupon.userType === 'luxe') {
            const user = await mongoose.model('user').findById(userId);
            if (!user || !user.isLuxeMember) {
                return res.status(403).json({ success: false, message: 'This coupon is reserved for Luxe Members only.' });
            }
        }

        let applicableTotal = 0;
        let cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);

        if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            const applicableItems = items.filter(item => coupon.applicableSKUs.includes(item.sku));
            if (applicableItems.length === 0) {
                return res.status(400).json({ success: false, message: 'This coupon is not applicable to any items in your cart.' });
            }
            applicableTotal = applicableItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        } else {
            applicableTotal = cartTotal;
        }

        if (applicableTotal < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `A minimum of ₹${coupon.minOrderAmount} worth of applicable items is required.` });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (applicableTotal * coupon.discountValue) / 100;
        } else { // fixed
            discountAmount = coupon.discountValue;
        }
        
        discountAmount = Math.min(discountAmount, applicableTotal);

        res.json({
            success: true,
            message: 'Coupon applied!',
            discountAmount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
            offerType: coupon.offerType,
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Error applying coupon.' });
    }
};

// Get all active coupons for users
export const getActiveCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({ 
            isActive: true,
            expiryDate: { $gt: new Date() } 
        }).sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active coupons.' });
    }
};

// User: Apply a coupon to a single product
export const applyProductCoupon = async (req, res) => {
    try {
        const { code, productItem, userId } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required.' });
        }
        if (!productItem || !productItem.sku || !productItem.price) {
            return res.status(400).json({ success: false, message: 'Product item details (sku, price) are required.' });
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
        
        // Check user-specific usage limit if userId is provided
        if (userId) {
            const userUsage = coupon.usersWhoUsed.filter(u => u.userId.toString() === userId).length;
            if (coupon.usageLimitPerUser && userUsage >= coupon.usageLimitPerUser) {
                return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times.' });
            }

            // Check User Type Restriction
            if (coupon.userType === 'luxe') {
                const user = await mongoose.model('user').findById(userId);
                if (!user || !user.isLuxeMember) {
                    return res.status(403).json({ success: false, message: 'This coupon is reserved for Luxe Members only.' });
                }
            }
        }

        let applicablePrice = productItem.price;

        if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            if (!coupon.applicableSKUs.includes(productItem.sku)) {
                return res.status(400).json({ success: false, message: `This coupon is not applicable to product with SKU: ${productItem.sku}.` });
            }
        }

        if (applicablePrice < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `Minimum order amount of ₹${coupon.minOrderAmount} is required for this coupon.` });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (applicablePrice * coupon.discountValue) / 100;
        } else { // fixed
            discountAmount = coupon.discountValue;
        }
        
        discountAmount = Math.min(discountAmount, applicablePrice);

        res.json({
            success: true,
            message: 'Coupon applied!',
            discountAmount,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
        });

    } catch (error) {
        console.error('Error applying product coupon:', error);
        res.status(500).json({ success: false, message: 'Error applying product coupon.' });
    }
};
