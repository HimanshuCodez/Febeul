import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Star, Camera } from 'lucide-react';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Reviews = ({ productId }) => {
  const { user, token, isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '', images: [] });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState(null);

  useEffect(() => {
    fetchReviews();
    if (isAuthenticated) {
      fetchMyReview();
    }
  }, [productId, isAuthenticated]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/review/list/${productId}`);
      if (response.data.success) {
        setReviews(response.data.reviews);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews.");
    }
  };

  const fetchMyReview = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/review/my-review/${productId}`, {
        headers: { token }
      });
      if (response.data.success) {
        setUserReview(response.data.review);
      }
    } catch (error) {
      console.error("Error fetching my review:", error);
    }
  };

  const handleRatingChange = (newRating) => {
    setNewReview(prev => ({ ...prev, rating: newRating }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + newReview.images.length > 5) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }
    setNewReview(prev => ({ ...prev, images: [...prev.images, ...files] }));

    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index) => {
    const updatedImages = newReview.images.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setNewReview(prev => ({ ...prev, images: updatedImages }));
    setImagePreviews(updatedPreviews);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please log in to submit a review.");
      return;
    }
    if (newReview.rating === 0) {
      toast.error("Please provide a star rating.");
      return;
    }
    if (!newReview.comment.trim()) {
      toast.error("Please write a comment for your review.");
      return;
    }

    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('rating', newReview.rating);
    formData.append('comment', newReview.comment);
    newReview.images.forEach(image => {
      formData.append('images', image);
    });

    try {
      const response = await axios.post(`${backendUrl}/api/review/add`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          token: token,
        },
      });

      if (response.data.success) {
        toast.success("Review submitted! It will be visible after admin approval.");
        setNewReview({ rating: 0, comment: '', images: [] });
        setImagePreviews([]);
        setShowReviewForm(false);
        fetchMyReview(); // Update user review status
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Failed to submit review.");
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Customer Reviews</h2>

      {reviews.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="space-y-8">
          {reviews.map(review => (
            <div key={review._id} className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-3">
                {review.userId?.profilePicture && (
                  <img src={review.userId.profilePicture} alt={review.userId.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
                )}
                <div>
                  <p className="font-semibold text-gray-800">{review.userId?.name || 'Anonymous User'}</p>
                  <p className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mb-3">
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

              <p className="text-gray-700 mb-4">{review.comment}</p>

              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {review.images.map((image, index) => (
                    <img key={index} src={image} alt={`Review image ${index + 1}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
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

export default Reviews;