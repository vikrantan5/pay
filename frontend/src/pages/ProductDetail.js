import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code, Download, Star, ShoppingCart, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/reviews/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  const handlePurchase = async () => {
    if (!token) {
      toast.error('Please login to purchase');
      navigate('/auth');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/orders/create?product_id=${id}${couponCode ? `&coupon_code=${couponCode}` : ''}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.is_free) {
        toast.success('Product unlocked! Check your dashboard.');
        navigate('/dashboard');
        return;
      }

      const options = {
        key: response.data.razorpay_key,
        amount: response.data.amount * 100,
        currency: 'INR',
        name: 'CodeMart',
        description: product.title,
        order_id: response.data.razorpay_order_id,
        handler: async function (paymentResponse) {
          try {
            await axios.post(
              `${API}/orders/verify`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            toast.success('Payment successful! Check your dashboard.');
            navigate('/dashboard');
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        theme: {
          color: '#667eea',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
    }
  };

  const handleSubmitReview = async () => {
    if (!token) {
      toast.error('Please login to submit a review');
      return;
    }

    try {
      await axios.post(
        `${API}/reviews`,
        {
          product_id: id,
          rating,
          comment,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Review submitted! It will be visible after approval.');
      setShowReviewDialog(false);
      setRating(5);
      setComment('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-state">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="error-state">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Code className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CodeMart
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} data-testid="back-home-btn">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12" data-testid="product-detail-page">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Product Info */}
          <div>
            <div className="glass-effect rounded-xl overflow-hidden mb-6">
              <div className="h-96 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                {product.thumbnail ? (
                  <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <Code className="h-24 w-24 text-white" />
                )}
              </div>
            </div>

            {product.gallery && product.gallery.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {product.gallery.map((img, index) => (
                  <div key={index} className="glass-effect rounded-lg overflow-hidden h-32">
                    <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details & Purchase */}
          <div>
            <div className="mb-4">
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm" data-testid="product-category">
                {product.category}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-4" data-testid="product-title">{product.title}</h1>
            <p className="text-xl text-gray-600 mb-6" data-testid="product-tagline">{product.tagline}</p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
                <span className="ml-2 text-gray-600" data-testid="product-rating">
                  {product.rating.toFixed(1)} ({product.reviews_count} reviews)
                </span>
              </div>
              <span className="text-gray-600" data-testid="product-downloads">• {product.downloads} downloads</span>
            </div>

            <div className="glass-effect rounded-xl p-6 mb-6">
              <div className="text-3xl font-bold text-purple-600 mb-4" data-testid="product-price">
                {product.price === 0 ? 'FREE' : `₹${product.price}`}
              </div>

              {product.price > 0 && (
                <div className="mb-4">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    data-testid="coupon-input"
                  />
                </div>
              )}

              <Button className="w-full mb-3" onClick={handlePurchase} data-testid="purchase-btn">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {product.price === 0 ? 'Get Free' : 'Purchase Now'}
              </Button>

              {product.demo_url && (
                <Button variant="outline" className="w-full" onClick={() => window.open(product.demo_url, '_blank')} data-testid="live-demo-btn">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live Demo
                </Button>
              )}
            </div>

            <div className="glass-effect rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-gray-600 whitespace-pre-line" data-testid="product-description">{product.description}</p>
            </div>

            <div className="glass-effect rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {product.tech_stack.map((tech, index) => (
                  <span key={index} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">License Type</h3>
              <p className="text-gray-600" data-testid="product-license">{product.license_type}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Reviews</h2>
            <Button onClick={() => setShowReviewDialog(true)} data-testid="write-review-btn">
              Write a Review
            </Button>
          </div>

          <div className="space-y-4" data-testid="reviews-section">
            {reviews.length === 0 ? (
              <div className="glass-effect rounded-xl p-8 text-center">
                <p className="text-gray-500">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="glass-effect rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{review.user_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent data-testid="review-dialog">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>Share your experience with this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 cursor-pointer ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    onClick={() => setRating(star)}
                    data-testid={`rating-star-${star}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Comment</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review..."
                rows={4}
                data-testid="review-comment-input"
              />
            </div>
            <Button className="w-full" onClick={handleSubmitReview} data-testid="submit-review-btn">
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;