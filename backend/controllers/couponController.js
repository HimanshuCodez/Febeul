import couponModel from '../models/couponModel.js';
import userModel from '../models/userModel.js';
import { isCouponExpired } from '../../shared/couponValidity.js';

const validCouponWindow = () => ({ $or: [
    { isLifetime: true },
    { isLifetime: { $ne: true }, expiryDate: { $gt: new Date() } },
] });

function resolveValidity(body, existing = {}) {
    if (body.isLifetime !== undefined && typeof body.isLifetime !== 'boolean') {
        throw new Error('Lifetime validity must be true or false.');
    }
    const isLifetime = body.isLifetime ?? existing.isLifetime ?? false;
    if (isLifetime) return { isLifetime: true, expiryDate: null };
    const value = body.expiryDate !== undefined ? body.expiryDate : existing.expiryDate;
    if (!value || (typeof value !== 'string' && !(value instanceof Date))) {
        throw new Error('Choose an expiry date or enable lifetime validity.');
    }
    // A calendar date includes that entire day in UTC.
    const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    const expiryDate = new Date(dateOnly ? `${value}T23:59:59.999Z` : value);
    if (!Number.isFinite(expiryDate.getTime()) || (dateOnly && expiryDate.toISOString().slice(0, 10) !== value)) {
        throw new Error('Enter a valid expiry date.');
    }
    return { isLifetime: false, expiryDate };
}

// Admin: Add a new coupon
export const addCoupon = async (req, res) => {
    try {

        const { code, description, discountType, discountValue, minOrderAmount, minQuantity, usageLimit, usageLimitPerUser, isActive, userType, offerType, applicableSKUs, specificUsers } = req.body;


        if (!code || !discountType || !discountValue) {
            return res.status(400).json({ success: false, message: 'Required fields are missing.' });
        }

        let validity;
        try { validity = resolveValidity(req.body); }
        catch (error) { return res.status(400).json({ success: false, message: error.message }); }

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
            ...validity,
            isActive,
            userType,
            offerType: offerType || 'none',
            applicableSKUs: applicableSKUs || [],

            specificUsers: specificUsers || [],


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

// Admin: Update a coupon
export const updateCoupon = async (req, res) => {
    try {

        const { id, code, description, discountType, discountValue, minOrderAmount, minQuantity, usageLimit, usageLimitPerUser, isActive, userType, offerType, applicableSKUs, specificUsers } = req.body;

   
        if (!id) {
            return res.status(400).json({ success: false, message: 'Coupon ID is required.' });
        }

        const existingCoupon = await couponModel.findById(id);
        if (!existingCoupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
        let validity;
        try { validity = resolveValidity(req.body, existingCoupon); }
        catch (error) { return res.status(400).json({ success: false, message: error.message }); }

        const updateData = {
            code,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            minQuantity,
            usageLimit,
            usageLimitPerUser,
            ...validity,
            isActive,
            userType,
            offerType,

            applicableSKUs,
            specificUsers


        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        existingCoupon.set(updateData);
        const updatedCoupon = await existingCoupon.save();

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }

        res.json({ success: true, message: 'Coupon updated successfully.', coupon: updatedCoupon });

    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to update coupon.' });
    }
};

// Admin: Get users who used a specific coupon
export const getCouponUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await couponModel.findById(id).populate('usersWhoUsed.userId', 'name email mobile');
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }

        // Fallback for unpopulated string userIds
        const users = await Promise.all(coupon.usersWhoUsed.map(async (item) => {
            if (item.userId && typeof item.userId === 'object' && item.userId.email) {
                return item;
            }
            if (item.userId) {
                const userIdStr = typeof item.userId === 'object' ? item.userId.toString() : item.userId;
                try {
                    const userDoc = await userModel.findById(userIdStr).select('name email mobile');
                    if (userDoc) {
                        return { _id: item._id, userId: userDoc };
                    }
                } catch (e) {
                    console.error('Error in coupon usage fallback findById:', e);
                }
            }
            return item;
        }));

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching coupon usage:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch coupon usage.' });
    }
};

// Admin: Get usage data for all coupons (for global export)
export const getAllCouponUsage = async (req, res) => {
    try {
        const coupons = await couponModel.find({}).populate('usersWhoUsed.userId', 'name email mobile');
        
        let allUsage = [];

        for (const coupon of coupons) {
            const usageByCoupon = {};
            
            for (const usage of coupon.usersWhoUsed) {
                let user = usage.userId;
                if (!user) continue;

                if (typeof user === 'string' || (typeof user === 'object' && !user.email)) {
                    const userIdStr = typeof user === 'object' ? user.toString() : user;
                    try {
                        const fetchedUser = await userModel.findById(userIdStr).select('name email mobile');
                        if (fetchedUser) {
                            user = fetchedUser;
                        } else {
                            continue;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                const userId = user._id.toString();
                if (!usageByCoupon[userId]) {
                    usageByCoupon[userId] = {
                        name: user.name || 'Unknown User',
                        email: user.email || 'N/A',
                        mobile: user.mobile || 'N/A',
                        couponCode: coupon.code,
                        count: 0
                    };
                }
                usageByCoupon[userId].count += 1;
            }

            allUsage = allUsage.concat(Object.values(usageByCoupon));
        }

        res.json({ success: true, allUsage });
    } catch (error) {
        console.error('Error fetching all coupon usage:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch usage analytics.' });
    }
};

// User: Apply a coupon
export const applyCoupon = async (req, res) => {
    try {
        const { code, items, paymentMethod } = req.body; // Expecting items from cart
        const userId = req.userId;

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

        if (isCouponExpired(coupon)) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        // Explain the purchase restriction before checking payment or customer eligibility.
        if (coupon.userType === 'membership' && !items.every(item => item.sku === 'LUXE-MEMBERSHIP')) {
            return res.status(400).json({ success: false, message: 'This coupon is valid for Luxe membership only.' });
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


        // Check Restrictions (Luxe or Specific Users)
        if (coupon.userType === 'luxe' || (coupon.specificUsers && coupon.specificUsers.length > 0)) {
            const user = await userModel.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            if (coupon.userType === 'luxe' && !user.isLuxeMember) {
                return res.status(403).json({ success: false, message: 'This coupon is reserved for Luxe Members only.' });
            }

            if (coupon.specificUsers && coupon.specificUsers.length > 0) {
                const isAuthorized = coupon.specificUsers.includes(user.email) || coupon.specificUsers.includes(userId);
                if (!isAuthorized) {
                    return res.status(403).json({ success: false, message: 'This coupon is only available for selected loyal customers.' });
                }
            }

        }

        let applicableTotal = 0;
        let currentQuantity = 0;
        let cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);

        if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            const applicableItems = items.filter(item => coupon.applicableSKUs.includes(item.sku));
            if (applicableItems.length === 0) {
                return res.status(400).json({ success: false, message: 'This coupon is not applicable to any items in your cart.' });
            }
            applicableTotal = applicableItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            currentQuantity = applicableItems.reduce((total, item) => total + item.quantity, 0);
        } else {
            applicableTotal = cartTotal;
            currentQuantity = items.reduce((total, item) => total + item.quantity, 0);
        }

        if (applicableTotal < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `A minimum of ₹${coupon.minOrderAmount} worth of applicable items is required.` });
        }

        if (coupon.minQuantity && currentQuantity < coupon.minQuantity) {
            return res.status(400).json({ success: false, message: `A minimum of ${coupon.minQuantity} applicable items is required.` });
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
        const userId = req.userId;
        const user = await userModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User context not found.' });
        }

        const coupons = await couponModel.find({ 
            isActive: true,
            ...validCouponWindow(),
            // Membership purchase offers are requested only by the Luxe signup page.
            userType: req.query.purpose === 'membership' ? 'membership' : { $ne: 'membership' },
        }).sort({ createdAt: -1 });

        // Filter coupons:
        // Luxe membership and specific-customer restrictions both apply.
        const filteredCoupons = coupons.filter(coupon => {
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                return false;
            }
            if (coupon.userType === 'luxe' && !user.isLuxeMember) {
                return false;
            }

            if (coupon.specificUsers && coupon.specificUsers.length > 0) {
                if (!(coupon.specificUsers.includes(user.email) || coupon.specificUsers.includes(userId))) {
                    return false;
                }
            }

            // Hide coupons the user has already redeemed up to their per-user limit
            const userUsage = coupon.usersWhoUsed.filter(u => u.userId.toString() === userId).length;
            if (coupon.usageLimitPerUser && userUsage >= coupon.usageLimitPerUser) {
                return false;
            }

            return true;
        });

        res.json({ success: true, coupons: filteredCoupons.map(({ _doc, ...rest }) => { const c = { ...(_doc || rest) }; delete c.specificUsers; delete c.usersWhoUsed; delete c.creator; return c; }) });
    } catch (error) {
        console.error('Error fetching active coupons:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active coupons.' });
    }
};

// User: Apply a coupon to a single product
export const applyProductCoupon = async (req, res) => {
    try {
        const { code, productItem } = req.body;
        const userId = req.userId;

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

        if (isCouponExpired(coupon)) {
            return res.status(400).json({ success: false, message: 'Coupon has expired.' });
        }

        // Membership-only coupons can only be redeemed while purchasing the Luxe Membership itself
        if (coupon.userType === 'membership' && productItem.sku !== 'LUXE-MEMBERSHIP') {
            return res.status(400).json({ success: false, message: 'This coupon is valid for Luxe membership only.' });
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


            // Check Restrictions (Luxe or Specific Users)
            if (coupon.userType === 'luxe' || (coupon.specificUsers && coupon.specificUsers.length > 0)) {
                const user = await userModel.findById(userId);
                if (!user) {
                    return res.status(404).json({ success: false, message: 'User not found.' });
                }

                if (coupon.userType === 'luxe' && !user.isLuxeMember) {
                    return res.status(403).json({ success: false, message: 'This coupon is reserved for Luxe Members only.' });
                }

                if (coupon.specificUsers && coupon.specificUsers.length > 0) {
                    const isAuthorized = coupon.specificUsers.includes(user.email) || coupon.specificUsers.includes(userId);
                    if (!isAuthorized) {
                        return res.status(403).json({ success: false, message: 'This coupon is only available for selected loyal customers.' });
                    }
                }

            }
        }

        if (!Number.isFinite(productItem.price) || productItem.price < 0 || !Number.isSafeInteger(productItem.quantity) || productItem.quantity < 1 || productItem.quantity > 99) {
            return res.status(400).json({ success: false, message: 'Invalid product price or quantity.' });
        }
        const applicablePrice = productItem.price * productItem.quantity;

        if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            if (!coupon.applicableSKUs.includes(productItem.sku)) {
                return res.status(400).json({ success: false, message: `This coupon is not applicable to product with SKU: ${productItem.sku}.` });
            }
        }

        if (applicablePrice < coupon.minOrderAmount) {
            return res.status(400).json({ success: false, message: `Minimum order amount of ₹${coupon.minOrderAmount} is required for this coupon.` });
        }

        if (coupon.minQuantity && productItem.quantity < coupon.minQuantity) {
            return res.status(400).json({ success: false, message: `A minimum quantity of ${coupon.minQuantity} is required for this coupon.` });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (applicablePrice * coupon.discountValue) / 100;
        } else { // fixed
            discountAmount = coupon.discountValue;
        }
        
        discountAmount = Math.round(Math.min(discountAmount, applicablePrice) * 100) / 100;

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

// Get all public active coupons (no auth required)
export const getPublicActiveCoupons = async (req, res) => {
    try {
        const coupons = await couponModel.find({ 
            isActive: true,
            $and: [validCouponWindow()],
            userType: req.query.purpose === 'membership' ? 'membership' : { $ne: 'membership' },
            $or: [
                { specificUsers: { $exists: false } },
                { specificUsers: { $size: 0 } }
            ]
        }).sort({ createdAt: -1 });

        const availableCoupons = coupons.filter(coupon => !coupon.usageLimit || coupon.usageCount < coupon.usageLimit);
        res.json({ success: true, coupons: availableCoupons.map(({ _doc, ...rest }) => { const c = { ...(_doc || rest) }; delete c.specificUsers; delete c.usersWhoUsed; delete c.creator; return c; }) });
    } catch (error) {
        console.error('Error fetching public coupons:', error);
        res.status(500).json({ success: false, message: 'Error fetching coupons.' });
    }
};
