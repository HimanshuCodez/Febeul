import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    mobile: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    isLuxeMember: { type: Boolean, default: false },
    luxeMembershipExpires: { type: Date },
    otp: { type: String },
    otp_expiry: { type: Date },
    cartData: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        size: { type: String, },
        quantity: { type: Number,  },
        color: { type: String,}
    }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
    addresses: [{
        name: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zip: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true },
    }]
}, { minimize: false })

const userModel = mongoose.models.user || mongoose.model('user',userSchema);

export default userModel