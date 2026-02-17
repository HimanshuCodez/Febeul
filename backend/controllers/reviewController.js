import reviewModel from '../models/reviewModel.js';
import productModel from '../models/productModel.js';
import { v2 as cloudinary } from 'cloudinary';

// Add new review
const addReview = async (req, res) => {
    try {
        const { productId, userId, rating, comment } = req.body;
        const files = req.files; // Images uploaded via multer

        // Check if user has already reviewed this product
        const existingReview = await reviewModel.findOne({ productId, userId });
        if (existingReview) {
            return res.json({ success: false, message: "You have already reviewed this product." });
        }

        if (!productId || !userId || !rating || !comment) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        let imageUrls = [];
        if (files && files.length > 0) {
            imageUrls = await Promise.all(
                files.map(async (file) => {
                    const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
                    return result.secure_url;
                })
            );
        }

        const newReview = new reviewModel({
            productId,
            userId,
            rating: Number(rating),
            comment,
            images: imageUrls,
            date: Date.now()
        });

        await newReview.save();

        // Update product's average rating and number of reviews (Optional - TODO 8)
        const product = await productModel.findById(productId);
        if (product) {
            const reviews = await reviewModel.find({ productId });
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            product.averageRating = totalRating / reviews.length;
            product.numOfReviews = reviews.length;
            await product.save();
        }

        res.json({ success: true, message: "Review added successfully!" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to add review" });
    }
};

// Get all reviews for a specific product
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await reviewModel.find({ productId })
                                        .populate('userId', 'name profilePicture'); // Populate user details

        res.json({ success: true, reviews });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to fetch reviews" });
    }
};

// Get all reviews by a specific user
const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await reviewModel.find({ userId })
                                        .populate('productId', 'name image') // Populate product details
                                        .populate('userId', 'name profilePicture'); // Populate user details

        res.json({ success: true, reviews });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to fetch user reviews" });
    }
};

// Get all reviews
const getAllReviews = async (req, res) => {
    try {
        let reviews = await reviewModel.find({});
        console.log("Reviews before population:", reviews); // Debug log

        reviews = await reviewModel.find({})
                                        .populate('productId', 'name image') // Populate product details
                                        .populate('userId', 'name profilePicture email'); // Populate user details and email
        console.log("Reviews after population:", reviews); // Debug log

        res.json({ success: true, reviews });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to fetch all reviews" });
    }
};

// Remove a review
const removeReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await reviewModel.findByIdAndDelete(reviewId);

        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        // Optionally, update product's average rating and number of reviews after deletion
        const product = await productModel.findById(review.productId);
        if (product) {
            const reviews = await reviewModel.find({ productId: review.productId });
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            product.averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
            product.numOfReviews = reviews.length;
            await product.save();
        }

        res.json({ success: true, message: "Review removed successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to remove review" });
    }
};

export { addReview, getProductReviews, getUserReviews, getAllReviews, removeReview };