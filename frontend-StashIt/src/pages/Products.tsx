import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { Product } from '../types';
import { searchAPI } from '../lib/api';
import { Link } from 'react-router-dom';

interface FilterOptions {
  categories: string[];
  conditions: string[];
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  sortOptions: {
    value: string;
    label: string;
    order: string;
  }[];
}

const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
const CATEGORIES = ['BOOKS', 'ELECTRONICS', 'FURNITURE', 'CLOTHING', 'SPORTS', 'FOOD', 'OTHER'];
const DEFAULT_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest First', order: 'desc' },
  { value: 'createdAt', label: 'Oldest First', order: 'asc' },
  { value: 'price', label: 'Price: Low to High', order: 'asc' },
  { value: 'price', label: 'Price: High to Low', order: 'desc' },
  { value: 'title', label: 'Name: A to Z', order: 'asc' },
  { value: 'title', label: 'Name: Z to A', order: 'desc' }
];

const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: CATEGORIES,
    conditions: CONDITIONS,
    priceRange: {
      min: 0,
      max: 10000,
      average: 500
    },
    sortOptions: DEFAULT_SORT_OPTIONS
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Get current filter values from URL params
  const currentQuery = searchParams.get('q') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentCondition = searchParams.get('condition') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentSortBy = searchParams.get('sortBy') || 'createdAt';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await searchAPI.getCategories();
        if (response.data.success) {
          setFilterOptions(prev => ({
            ...prev,
            categories: CATEGORIES,
            conditions: CONDITIONS,
            priceRange: {
              min: 0,
              max: 10000,
              average: 500
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await searchAPI.searchProducts({
          query: currentQuery,
          page: currentPage,
          limit: pagination.limit,
          category: currentCategory || undefined,
          condition: currentCondition || undefined,
          minPrice: currentMinPrice || undefined,
          maxPrice: currentMaxPrice || undefined,
          sortBy: currentSortBy,
          sortOrder: currentSortOrder
        });

        if (response.data.success) {
          setProducts(response.data.data.products || []);
          setPagination(prev => ({
            ...prev,
            ...(response.data.data.pagination || {})
          }));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, pagination.limit]);

  const updateFilters = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    newParams.set('page', '1'); // Reset to first page when filters change
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({ page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    updateFilters({ page: newPage.toString() });
  };

  const formatCategory = (category: string) => {
    return category.toLowerCase().replace('_', ' ');
  };

  const formatCondition = (condition: string) => {
    return condition.toLowerCase().replace('_', ' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search and Filter Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={currentQuery}
                  onChange={(e) => updateFilters({ q: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg"
            >
              {showFilters ? (
                <>
                  <X className="h-5 w-5 mr-2" />
                  Close Filters
                </>
              ) : (
                <>
                  <Filter className="h-5 w-5 mr-2" />
                  Show Filters
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters Sidebar */}
          <div
            className={`${
              showFilters ? 'block' : 'hidden'
            } md:block w-full md:w-64 space-y-6`}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
              {/* Sort Section */}
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Sort By</h2>
                <div className="space-y-2">
                  {filterOptions?.sortOptions.map((option) => (
                    <label
                      key={`${option.value}:${option.order}`}
                      className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded-md"
                    >
                      <input
                        type="radio"
                        name="sort"
                        value={`${option.value}:${option.order}`}
                        checked={currentSortBy === option.value && currentSortOrder === option.order}
                        onChange={(e) => {
                          const [sortBy, sortOrder] = e.target.value.split(':');
                          updateFilters({ sortBy, sortOrder });
                        }}
                        className="mr-3 h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Categories</h2>
                  {currentCategory && (
                    <button
                      onClick={() => updateFilters({ category: '' })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => updateFilters({ category })}
                      className={`px-3 py-2 text-sm rounded-md transition-colors ${
                        category === currentCategory
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {formatCategory(category)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Condition</h2>
                  {currentCondition && (
                    <button
                      onClick={() => updateFilters({ condition: '' })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map((condition) => (
                    <button
                      key={condition}
                      onClick={() => updateFilters({ condition })}
                      className={`px-3 py-2 text-sm rounded-md transition-colors ${
                        condition === currentCondition
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {formatCondition(condition)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Price Range</h2>
                  {(currentMinPrice || currentMaxPrice) && (
                    <button
                      onClick={() => updateFilters({ minPrice: '', maxPrice: '' })}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={currentMinPrice}
                    onChange={(e) => updateFilters({ minPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={currentMaxPrice}
                    onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Clear All Filters */}
              {(currentCategory || currentCondition || currentMinPrice || currentMaxPrice || currentSortBy !== 'createdAt' || currentSortOrder !== 'desc') && (
                <div className="p-6">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-200 animate-pulse"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No products found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
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
                                {formatCondition(product.condition)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                      <div className="mt-8 flex justify-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          {[...Array(pagination.pages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => handlePageChange(i + 1)}
                              className={`px-4 py-2 border rounded-md ${
                                currentPage === i + 1
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === pagination.pages}
                            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products; 