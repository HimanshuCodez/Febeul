const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null }, // Overall usage limit
    usageCount: { type: Number, default: 0 }, // How many times it has been used
    usageLimitPerUser: { type: Number, default: 1 }, // How many times a single user can use it
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usersWhoUsed: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    }]
}, { timestamps: true });

const couponModel = mongoose.models.coupon || mongoose.model('coupon', couponSchema);

module.exports = couponModel;
