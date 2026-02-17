import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
// Assuming an admin auth context exists to get the token
// import useAdminAuth from '../hooks/useAdminAuth'; 

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ReviewsAdmin = ({ token }) => {

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) { // Only fetch if a valid token is provided
            fetchAllReviews();
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
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reviews.map(review => (
                                    <tr key={review._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {review.userId?.profilePicture && (
                                                    <img
                                                        src={review.userId.profilePicture}
                                                        alt={review.userId.name}
                                                        className="w-8 h-8 rounded-full mr-2 object-cover"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{review.userId?.name || 'Anonymous'}</p>
                                                    <p className="text-xs text-gray-500">{review.userId?.email || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/admin-product-details/${review.productId?._id}`} className="text-blue-600 hover:underline">
                                                {review.productId?.name || 'Unknown Product'}
                                            </Link>
                                            {review.productId?.image && (
                                                <img
                                                    src={review.productId.image}
                                                    alt={review.productId.name}
                                                    className="w-12 h-12 object-cover rounded mt-2"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star
                                                        key={star}
                                                        size={16}
                                                        className={`${review.rating >= star ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-sm text-gray-700">{review.rating} Stars</p>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs overflow-hidden text-ellipsis text-sm text-gray-700">
                                            {review.comment}
                                            {review.images && review.images.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {review.images.map((image, index) => (
                                                        <img
                                                            key={index}
                                                            src={image}
                                                            alt={`Review image ${index + 1}`}
                                                            className="w-10 h-10 object-cover rounded"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(review.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button
                                                onClick={() => handleDeleteReview(review._id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsAdmin;