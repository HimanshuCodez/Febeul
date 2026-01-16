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

  useEffect(() => {
    fetchReviews();
  }, [productId]);

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
    formData.append('userId', user._id);
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
        toast.success("Review submitted successfully!");
        setNewReview({ rating: 0, comment: '', images: [] });
        setImagePreviews([]);
        setShowReviewForm(false);
        fetchReviews(); // Refresh reviews list
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

      {isAuthenticated && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-sm">
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="w-full bg-[#f9aeaf] hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {showReviewForm ? 'Cancel Review' : 'Write a Customer Review'}
          </button>

          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="mt-6 space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Your Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={28}
                      className={`cursor-pointer transition-colors ${
                        newReview.rating >= star ? 'text-yellow-500 fill-current' : 'text-gray-300'
                      }`}
                      onClick={() => handleRatingChange(star)}
                    />
                  ))}
                </div>
                {newReview.rating === 0 && <p className="text-red-500 text-sm mt-1">Please select a rating</p>}
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Your Comment</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="4"
                  placeholder="Tell us about your experience..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Add Photos (Max 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img src={preview} alt="Review preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {newReview.images.length < 5 && (
                    <label className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <Camera size={32} className="text-gray-400" />
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Submit Review
              </button>
            </form>
          )}
        </div>
      )}

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