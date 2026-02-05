import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Star } from 'lucide-react';
// Assuming an admin auth context exists to get the token
// import useAdminAuth from '../hooks/useAdminAuth'; 

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ReviewsAdmin = () => {
    // const { token } = useAdminAuth(); // Assuming this hook provides the admin token
    // For now, using a placeholder token. Replace with actual admin token retrieval.
    const token = "ADMIN_PLACEHOLDER_TOKEN"; 

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token && token !== "ADMIN_PLACEHOLDER_TOKEN") { // Only fetch if a valid token exists
            fetchAllReviews();
        } else if (token === "ADMIN_PLACEHOLDER_TOKEN") {
             // If using placeholder, mock data or show a message to replace token
            console.warn("Using placeholder admin token. Please implement actual token retrieval.");
            setLoading(false);
            // Optionally, fetch some mock data for development if needed
        } else {
            toast.error("Admin not authenticated.");
            setLoading(false);
        }
    }, [token]);

    const fetchAllReviews = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/review/all`, {
                headers: {
                    token: token,
                },
            });

            if (response.data.success) {
                setReviews(response.data.reviews);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error("Error fetching all reviews:", error);
            toast.error("Failed to fetch reviews.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await axios.delete(`${backendUrl}/api/review/remove/${reviewId}`, {
                headers: {
                    token: token,
                },
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setReviews(prevReviews => prevReviews.filter(review => review._id !== reviewId));
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error("Error deleting review:", error);
            toast.error(error.response?.data?.message || "Failed to delete review.");
        }
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">All Customer Reviews (Admin)</h1>

            {loading ? (
                <div className="text-center text-gray-600">Loading reviews...</div>
            ) : reviews.length === 0 ? (
                <div className="text-center text-gray-600 py-10 border rounded-lg bg-white">No reviews found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.map(review => (
                        <div key={review._id} className="p-6 bg-white rounded-lg shadow-md border border-gray-200 relative">
                            <button
                                onClick={() => handleDeleteReview(review._id)}
                                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full text-xs font-semibold"
                                title="Delete Review"
                            >
                                X
                            </button>
                            <div className="flex items-center mb-4">
                                {review.userId?.profilePicture && (
                                    <img 
                                        src={review.userId.profilePicture} 
                                        alt={review.userId.name} 
                                        className="w-12 h-12 rounded-full mr-4 object-cover" 
                                    />
                                )}
                                <div>
                                    <p className="font-semibold text-lg text-gray-800">{review.userId?.name || 'Anonymous User'}</p>
                                    <p className="text-sm text-gray-500">on {new Date(review.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <p className="text-gray-700 text-sm font-medium mb-2">Product:</p>
                                <div className="flex items-center">
                                    {review.productId?.image && (
                                        <img 
                                            src={review.productId.image} 
                                            alt={review.productId.name} 
                                            className="w-16 h-16 object-cover rounded mr-3"
                                        />
                                    )}
                                    <p className="font-medium text-blue-600">{review.productId?.name || 'Unknown Product'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        size={20}
                                        className={`${
                                            review.rating >= star ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>

                            <p className="text-gray-700 mb-4 italic">"{review.comment}"</p>

                            {review.images && review.images.length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-4 border-t pt-4">
                                    <p className="w-full text-sm font-medium text-gray-600">Review Images:</p>
                                    {review.images.map((image, index) => (
                                        <img 
                                            key={index} 
                                            src={image} 
                                            alt={`Review image ${index + 1}`} 
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200" 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsAdmin;