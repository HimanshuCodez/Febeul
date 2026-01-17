import mongoose from "mongoose";

const giftWrapSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
}, { timestamps: true });

const giftWrapModel = mongoose.models.giftWrap || mongoose.model("giftWrap", giftWrapSchema);
export default giftWrapModel;
