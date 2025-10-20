import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Code,
  Plus,
  Edit,
  Trash2,
  Upload,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [productForm, setProductForm] = useState({
    title: '',
    tagline: '',
    description: '',
    price: 0,
    category: 'Web App',
    tags: '',
    tech_stack: '',
    demo_url: '',
    license_type: 'Single-use',
    thumbnail: '',
    gallery: '',
    is_published: true,
  });

  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat',
    discount_value: 0,
    min_purchase: 0,
  });

  useEffect(() => {
    fetchAnalytics();
    fetchProducts();
    fetchOrders();
    fetchCoupons();
    fetchReviews();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API}/admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(response.data);
    } catch (error) {
      toast.error('Failed to load coupons');
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(response.data);
    } catch (error) {
      toast.error('Failed to load reviews');
    }
  };

  const handleSaveProduct = async () => {
    setLoading(true);
    try {
      const productData = {
        ...productForm,
        tags: productForm.tags.split(',').map((t) => t.trim()),
        tech_stack: productForm.tech_stack.split(',').map((t) => t.trim()),
        gallery: productForm.gallery ? productForm.gallery.split(',').map((g) => g.trim()) : [],
        price: parseFloat(productForm.price),
      };

      if (editingProduct) {
        await axios.put(`${API}/admin/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product updated');
      } else {
        await axios.post(`${API}/admin/products`, productData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product created');
      }

      setShowProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`${API}/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleUploadFile = async (productId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/admin/products/${productId}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('File uploaded');
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'File upload failed');
    }
  };

  const handleCreateCoupon = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/admin/coupons`,
        {
          ...couponForm,
          discount_value: parseFloat(couponForm.discount_value),
          min_purchase: parseFloat(couponForm.min_purchase),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Coupon created');
      setShowCouponDialog(false);
      resetCouponForm();
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await axios.put(`${API}/admin/reviews/${reviewId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Review approved');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to approve review');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      title: '',
      tagline: '',
      description: '',
      price: 0,
      category: 'Web App',
      tags: '',
      tech_stack: '',
      demo_url: '',
      license_type: 'Single-use',
      thumbnail: '',
      gallery: '',
      is_published: true,
    });
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: '',
      discount_type: 'flat',
      discount_value: 0,
      min_purchase: 0,
    });
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      tagline: product.tagline,
      description: product.description,
      price: product.price,
      category: product.category,
      tags: product.tags.join(', '),
      tech_stack: product.tech_stack.join(', '),
      demo_url: product.demo_url || '',
      license_type: product.license_type,
      thumbnail: product.thumbnail || '',
      gallery: product.gallery.join(', '),
      is_published: product.is_published,
    });
    setShowProductDialog(true);
  };

  return (
    <div className="min-h-screen" data-testid="admin-dashboard-page">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Code className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CodeMart Admin
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} data-testid="back-home-btn">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8" data-testid="dashboard-heading">Admin Dashboard</h1>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" data-testid="analytics-section">
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                <span className="text-sm text-gray-500">Revenue</span>
              </div>
              <p className="text-3xl font-bold" data-testid="total-revenue">₹{analytics.total_revenue.toFixed(2)}</p>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
                <span className="text-sm text-gray-500">Orders</span>
              </div>
              <p className="text-3xl font-bold" data-testid="total-orders">{analytics.total_orders}</p>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <span className="text-sm text-gray-500">Products</span>
              </div>
              <p className="text-3xl font-bold" data-testid="total-products">{analytics.total_products}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products" data-testid="products-tab">Products</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
            <TabsTrigger value="coupons" data-testid="coupons-tab">Coupons</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="reviews-tab">Reviews</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="mb-4">
              <Button
                onClick={() => {
                  resetProductForm();
                  setEditingProduct(null);
                  setShowProductDialog(true);
                }}
                data-testid="add-product-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
            <div className="glass-effect rounded-xl overflow-hidden" data-testid="products-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>₹{product.price}</TableCell>
                      <TableCell>{product.downloads}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            product.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(product)}
                            data-testid={`edit-product-${product.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProduct(product.id)}
                            data-testid={`delete-product-${product.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <label className="cursor-pointer">
                            <Button size="sm" variant="outline" as="span" data-testid={`upload-file-${product.id}`}>
                              <Upload className="h-4 w-4" />
                            </Button>
                            <input
                              type="file"
                              accept=".zip"
                              className="hidden"
                              onChange={(e) => handleUploadFile(product.id, e.target.files[0])}
                            />
                          </label>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="glass-effect rounded-xl overflow-hidden" data-testid="orders-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                      <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-sm">{order.user_id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-sm">{order.product_id.slice(0, 8)}...</TableCell>
                      <TableCell>₹{order.amount}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <div className="mb-4">
              <Button onClick={() => setShowCouponDialog(true)} data-testid="add-coupon-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Coupon
              </Button>
            </div>
            <div className="glass-effect rounded-xl overflow-hidden" data-testid="coupons-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Min Purchase</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id} data-testid={`coupon-row-${coupon.id}`}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell>{coupon.discount_type}</TableCell>
                      <TableCell>
                        {coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                      </TableCell>
                      <TableCell>₹{coupon.min_purchase}</TableCell>
                      <TableCell>{coupon.uses}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="glass-effect rounded-xl overflow-hidden" data-testid="reviews-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} data-testid={`review-row-${review.id}`}>
                      <TableCell>{review.user_name}</TableCell>
                      <TableCell className="font-mono text-sm">{review.product_id.slice(0, 8)}...</TableCell>
                      <TableCell>⭐ {review.rating}</TableCell>
                      <TableCell className="max-w-xs truncate">{review.comment}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            review.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {review.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!review.is_approved && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveReview(review.id)}
                            data-testid={`approve-review-${review.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>Fill in the product details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  data-testid="product-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select
                  value={productForm.category}
                  onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                >
                  <SelectTrigger data-testid="product-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Web App">Web App</SelectItem>
                    <SelectItem value="Mobile App">Mobile App</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Plugin">Plugin</SelectItem>
                    <SelectItem value="Template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tagline</label>
              <Input
                value={productForm.tagline}
                onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
                data-testid="product-tagline-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={4}
                data-testid="product-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price (₹)</label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  data-testid="product-price-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">License Type</label>
                <Input
                  value={productForm.license_type}
                  onChange={(e) => setProductForm({ ...productForm, license_type: e.target.value })}
                  data-testid="product-license-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input
                value={productForm.tags}
                onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                placeholder="react, nodejs, mongodb"
                data-testid="product-tags-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tech Stack (comma-separated)</label>
              <Input
                value={productForm.tech_stack}
                onChange={(e) => setProductForm({ ...productForm, tech_stack: e.target.value })}
                placeholder="React, FastAPI, MongoDB"
                data-testid="product-tech-stack-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Demo URL</label>
              <Input
                value={productForm.demo_url}
                onChange={(e) => setProductForm({ ...productForm, demo_url: e.target.value })}
                data-testid="product-demo-url-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Thumbnail URL</label>
              <Input
                value={productForm.thumbnail}
                onChange={(e) => setProductForm({ ...productForm, thumbnail: e.target.value })}
                data-testid="product-thumbnail-input"
              />
            </div>
            <Button className="w-full" onClick={handleSaveProduct} disabled={loading} data-testid="save-product-btn">
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coupon Dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent data-testid="coupon-dialog">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>Add a new discount coupon</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Coupon Code</label>
              <Input
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                placeholder="SAVE20"
                data-testid="coupon-code-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type</label>
              <Select
                value={couponForm.discount_type}
                onValueChange={(value) => setCouponForm({ ...couponForm, discount_type: value })}
              >
                <SelectTrigger data-testid="coupon-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discount Value</label>
                <Input
                  type="number"
                  value={couponForm.discount_value}
                  onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                  data-testid="coupon-value-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Purchase (₹)</label>
                <Input
                  type="number"
                  value={couponForm.min_purchase}
                  onChange={(e) => setCouponForm({ ...couponForm, min_purchase: e.target.value })}
                  data-testid="coupon-min-purchase-input"
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreateCoupon} disabled={loading} data-testid="save-coupon-btn">
              {loading ? 'Creating...' : 'Create Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;