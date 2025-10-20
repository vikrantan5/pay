import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Code, Sparkles, Search, Filter } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchProducts();
  }, [category, sort]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (sort) params.append('sort', sort);
      if (search) params.append('search', search);

      const response = await axios.get(`${API}/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProducts();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-effect sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Code className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CodeMart
            </h1>
          </div>

          <nav className="flex items-center gap-4">
            {user.role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/admin')} data-testid="admin-dashboard-btn">
                Admin Dashboard
              </Button>
            )}
            {user.id ? (
              <>
                <Button variant="outline" onClick={() => navigate('/dashboard')} data-testid="my-purchases-btn">
                  My Purchases
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  data-testid="logout-btn"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} data-testid="login-btn">
                Login / Sign Up
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6" data-testid="hero-heading">
            Discover Premium
            <span className="block mt-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Source Code Projects
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto" data-testid="hero-subheading">
            Buy and sell production-ready source code. Build faster with pre-built solutions.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto flex gap-2" data-testid="search-section">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              data-testid="search-input"
            />
            <Button onClick={handleSearch} data-testid="search-btn">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex flex-wrap gap-4 items-center" data-testid="filters-section">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48" data-testid="category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Web App">Web App</SelectItem>
              <SelectItem value="Mobile App">Mobile App</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="Plugin">Plugin</SelectItem>
              <SelectItem value="Template">Template</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48" data-testid="sort-filter">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-center py-20" data-testid="loading-state">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
            {products.map((product) => (
              <div
                key={product.id}
                className="glass-effect rounded-xl overflow-hidden card-hover cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
                data-testid={`product-card-${product.id}`}
              >
                <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Code className="h-16 w-16 text-white" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold" data-testid="product-title">{product.title}</h3>
                    <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid="product-tagline">{product.tagline}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-purple-600" data-testid="product-price">
                      {product.price === 0 ? 'FREE' : `₹${product.price}`}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>⭐ {product.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>{product.downloads} downloads</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="glass-effect border-t py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>© 2025 CodeMart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;