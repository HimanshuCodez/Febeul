import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product', // Reference to the Product model
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Reference to the User model
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    images: {
        type: [String], // Array of image URLs
        default: []
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const reviewModel = mongoose.models.review || mongoose.model("review", reviewSchema);

export default reviewModel;