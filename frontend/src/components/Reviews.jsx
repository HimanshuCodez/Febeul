import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Star, Camera } from 'lucide-react';
import useAuthStore from '../store/authStore';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Reviews = ({ productId }) => {
  const { user, token, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '', images: [] });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [isEligible, setIsEligible] = useState(false);

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
        setIsEligible(response.data.eligibleToReview);
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

  // Calculations for Ratings Breakdown
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : 0.0;

  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(review => {
    if (ratingCounts[review.rating] !== undefined) {
      ratingCounts[review.rating]++;
    }
  });

  const getPercentage = (count) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const renderStars = (rating, size = 18) => {
    return (
      <div className="flex gap-0.5 text-amber-500 fill-current">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              size={size}
              className={`${isFilled ? 'text-amber-500 fill-current' : 'text-gray-300'}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="mt-8 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        {/* Left Column: Summary and Breakdown Progress Bars */}
        <div className="lg:col-span-4 space-y-6 text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 uppercase tracking-wider">Customer Reviews</h2>
          
          <div className="flex items-center gap-3">
            {renderStars(averageRating, 20)}
            <span className="text-base sm:text-lg font-bold text-gray-900">{averageRating} out of 5</span>
          </div>
          
          <p className="text-sm text-gray-500">{totalReviews} global ratings</p>
          
          <div className="space-y-3 pt-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[star];
              const percentage = getPercentage(count);
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <button className="w-12 text-left text-xs font-semibold text-slate-600 hover:text-pink-600 hover:underline shrink-0">
                    {star} star
                  </button>
                  <div className="flex-1 h-5 bg-slate-100 rounded border border-slate-200 overflow-hidden relative">
                    {percentage > 0 && (
                      <div 
                        className="h-full bg-amber-400 border-r border-amber-500 transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-slate-600 shrink-0">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-1">Review this product</h3>
            <p className="text-sm text-gray-500 mb-4">Share your thoughts with other customers</p>
            {userReview ? (
              <div className="p-3 bg-green-50 text-green-800 rounded-xl text-xs border border-green-200 font-medium">
                You have already submitted a review for this product.
              </div>
            ) : !isEligible ? (
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-xs border border-slate-200 font-medium italic">
                Only customers who purchased this item and had it delivered can write a review.
              </div>
            ) : (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Please log in to submit a review.");
                    navigate("/auth");
                  } else {
                    setShowReviewForm(true);
                  }
                }}
                className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 shadow-sm active:scale-98 transition-all"
              >
                Write a customer review
              </button>
            )}

            {/* Review Input Form */}
            {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="space-y-4 p-4 border border-gray-200 rounded-xl bg-slate-50/50 mt-4 text-left shadow-inner">
                <h4 className="font-bold text-gray-800 text-sm">Write your review</h4>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Overall rating</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={22}
                        className={`cursor-pointer transition-colors ${
                          newReview.rating >= star ? 'text-amber-500 fill-current' : 'text-gray-300'
                        }`}
                        onClick={() => handleRatingChange(star)}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Add photos</label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 bg-white w-fit shadow-sm">
                    <Camera size={14} className="text-gray-500" />
                    <span className="text-xs font-semibold text-gray-700">Choose Images</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative w-14 h-14 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-0 right-0 bg-red-500/90 text-white rounded-bl-lg w-5 h-5 flex items-center justify-center font-bold text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Write your comment</label>
                  <textarea
                    rows="3"
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="What did you like or dislike about this product?"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white text-xs outline-none focus:border-pink-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md shadow-pink-100 active:scale-95 transition-all">
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      setImagePreviews([]);
                      setNewReview({ rating: 0, comment: '', images: [] });
                    }}
                    className="border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-bold text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Reviews Comments List */}
        <div className="lg:col-span-8 text-left">
          <h3 className="text-lg font-bold text-gray-800 mb-6 uppercase tracking-wider">Top reviews from India</h3>
          
          {reviews.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <p className="text-gray-500 text-sm font-medium">No reviews yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review._id} className="pb-6 border-b border-gray-100 last:border-b-0">
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                      {review.userId?.profilePicture ? (
                        <img src={review.userId.profilePicture} alt={review.userId.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          {review.userId?.name ? review.userId.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{review.userId?.name || 'Anonymous User'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Reviewed on {new Date(review.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Rating Stars and Verified Tag */}
                  <div className="flex items-center gap-2 mb-3">
                    {renderStars(review.rating, 14)}
                    <span className="text-[10px] bg-amber-50 text-amber-800 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-100">
                      Verified Purchase
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-slate-700 leading-relaxed font-medium mt-2">{review.comment}</p>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mt-3">
                      {review.images.map((image, index) => (
                        <img 
                          key={index} 
                          src={image} 
                          alt={`Review image ${index + 1}`} 
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-90 transition-opacity" 
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reviews;