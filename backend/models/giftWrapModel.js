import mongoose from "mongoose";

const giftWrapSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    creator: {
        name: { type: String },
        email: { type: String },
        role: { type: String }
    },
    usersWhoUsed: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    }]
}, { timestamps: true });

const giftWrapModel = mongoose.models.giftWrap || mongoose.model("giftWrap", giftWrapSchema);
export default giftWrapModel;
