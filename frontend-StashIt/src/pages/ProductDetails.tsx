import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { productAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productAPI.getProduct(productId!);
        if (response.data.success) {
          setProduct(response.data.data.product);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const formatCondition = (condition: string) => {
    return condition.toLowerCase().replace('_', ' ');
  };

  const handlePrevImage = () => {
    if (!product) return;
    setCurrentImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!product) return;
    setCurrentImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
            <p className="mt-2 text-gray-600">The product you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Products
        </button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="md:flex">
            {/* Product Images Carousel */}
            <div className="md:w-1/2 flex flex-col items-center justify-center relative p-8">
              <div className="aspect-square w-full flex items-center justify-center relative">
                {product.images.length > 1 && (
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>
                )}
                <img
                  src={product.images[currentImage] || '/placeholder-image.jpg'}
                  alt={product.title}
                  className="w-full h-full object-cover rounded-lg"
                />
                {product.images.length > 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-70 rounded-full p-2 shadow hover:bg-opacity-100"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 mt-4">
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`w-3 h-3 rounded-full border-2 ${currentImage === idx ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300'}`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="md:w-1/2 p-6 py-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {product.title}
                  </h1>
                  <p className="text-lg font-bold text-blue-600 mb-4">
                    ${product.price}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                  <p className="text-gray-900 capitalize">{formatCondition(product.condition)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="text-gray-900 capitalize">{product.category.toLowerCase()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-gray-900 whitespace-pre-line">{product.description}</p>
                </div>
              </div>

              {/* Seller Info */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seller Information</h3>
                <div className="flex items-center">
                  <div>
                    <p className="font-medium text-gray-900">
                      {product.seller.firstName} {product.seller.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{product.seller.college}</p>
                  </div>
                </div>
              </div>

              {/* Chat Button */}
              {user?.id !== product.sellerId && (
                <div className="border-t border-gray-200 pt-6">
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails; 