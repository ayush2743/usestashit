import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, productAPI } from '../lib/api';
import { Product } from '../types';
import { Mail, Phone, School, User as UserIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user: authUser, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    firstName: authUser?.firstName || '',
    lastName: authUser?.lastName || '',
    college: authUser?.college || '',
    phone: authUser?.phone || '',
  });

  useEffect(() => {
    fetchUserStats();
    fetchUserProducts();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await userAPI.getUserStats(authUser?.id || '');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchUserProducts = async () => {
    try {
      const response = await productAPI.getUserProducts(authUser?.id || '', {
        page: 1,
        limit: 10,
        available: true
      });
      setUserProducts(response.data.data.products);
    } catch (error) {
      console.error('Failed to fetch user products:', error);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      await productAPI.deleteProduct(productId);
      setUserProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
      toast.success('Product removed successfully');
      fetchUserStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove product');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await userAPI.updateProfile(formData);
      setUser(response.data.data.user);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!authUser) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-blue-600">
            <div className="absolute -bottom-16 left-8">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
                <UserIcon className="w-16 h-16 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-20 pb-8 px-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {authUser.firstName} {authUser.lastName}
                </h1>
                <p className="text-gray-600">{authUser.email}</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="college" className="block text-sm font-medium text-gray-700">
                      College/University
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        name="college"
                        id="college"
                        value={formData.college}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <School className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">College/University</p>
                      <p className="text-gray-900">{authUser.college}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900">{authUser.email}</p>
                    </div>
                  </div>

                  {authUser.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-gray-900">{authUser.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {stats && (
                  <div className="mt-8 border-t pt-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Active Products</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500">Items Sold</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.soldProducts}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Products Section */}
                <div className="mt-8 border-t pt-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Your Listed Products</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userProducts.map((product) => (
                      <div key={product.id} className="group relative">
                        <Link
                          to={`/product/${product.id}`}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block"
                        >
                          <div className="aspect-square overflow-hidden">
                            <img
                              src={product.images[0] || '/placeholder-image.jpg'}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-700 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {userProducts.length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        You don't have any active products listed for sale.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 