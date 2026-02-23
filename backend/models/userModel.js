import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String }, // Made optional
    email: { type: String, unique: true, required: true },
    password: { type: String }, // Made optional
    mobile: { type: String, unique: true },
    googleId: { type: String, unique: true, },
    isLuxeMember: { type: Boolean, default: false },
    luxeMembershipExpires: { type: Date, default: null },
    giftWrapsLeft: { type: Number, default: 0 },
    otp: { type: String },
    otp_expiry: { type: Date },
    cartData: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        size: { type: String, },
        quantity: { type: Number,  },
        color: { type: String,},
        appliedCoupon: { type: String, default: null },
        discountAmount: { type: Number, default: 0 }
    }],
    giftWrap: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'giftWrap',
        default: null
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
    addresses: [{
        name: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zip: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true },
    }]
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model('user',userSchema);

export default userModel