import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  TrendingUp, 
  Users, 
  ShoppingBag,
  BookOpen,
  Laptop,
  Sofa,
  Shirt,
  Dumbbell,
  Coffee,
  MoreHorizontal
} from 'lucide-react';
import { Product } from '../types';
import { productAPI } from '../lib/api';

const categories = [
  { name: 'Books', icon: BookOpen, value: 'BOOKS', color: 'bg-blue-500' },
  { name: 'Electronics', icon: Laptop, value: 'ELECTRONICS', color: 'bg-purple-500' },
  { name: 'Furniture', icon: Sofa, value: 'FURNITURE', color: 'bg-green-500' },
  { name: 'Clothing', icon: Shirt, value: 'CLOTHING', color: 'bg-pink-500' },
  { name: 'Sports', icon: Dumbbell, value: 'SPORTS', color: 'bg-orange-500' },
  { name: 'Food', icon: Coffee, value: 'FOOD', color: 'bg-yellow-500' },
  { name: 'Other', icon: MoreHorizontal, value: 'OTHER', color: 'bg-gray-500' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await productAPI.getProducts({
          page: 1,
          limit: 8,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        setFeaturedProducts(response.data.data.products);
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/products?category=${category}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Amazing Deals on Campus
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Buy and sell textbooks, electronics, furniture, and more with fellow students
            </p>
            
            {/* Hero Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-300"
                />
                <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                <button
                  type="submit"
                  className="absolute right-2 top-2 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">1000+</h3>
              <p className="text-gray-600">Active Students</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">5000+</h3>
              <p className="text-gray-600">Items Sold</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">$50K+</h3>
              <p className="text-gray-600">Money Saved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-lg text-gray-600">Find exactly what you're looking for</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-gray-300"
                >
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 text-center">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Items</h2>
              <p className="text-lg text-gray-600">Fresh listings from your campus</p>
            </div>
            <Link
              to="/products"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.images[0] || '/placeholder-image.jpg'}
                      alt={product.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {product.seller.college}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        ${product.price}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {product.condition.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Turn your unused items into cash and help fellow students save money
          </p>
          <Link
            to="/sell"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            List Your First Item
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home; 