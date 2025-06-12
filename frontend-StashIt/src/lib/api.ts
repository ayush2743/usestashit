import axios from 'axios';

// API Gateway runs on port 3000; all requests go through the gateway
const API_BASE_URL = 'https://usestashit-backend.onrender.com/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL
  // Do not set Content-Type globally!
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getPublicProfile: (userId: string) => api.get(`/users/${userId}/profile`),
  getUserStats: (userId: string) => api.get(`/users/${userId}/stats`),
};

export const productAPI = {
  getProducts: (params: any) => api.get('/products', { params }),
  getProduct: (productId: string) => api.get(`/products/${productId}`),
  createProduct: (data: FormData) => api.post('/products', data),
  updateProduct: (productId: string, data: FormData) => api.put(`/products/${productId}`, data),
  deleteProduct: (productId: string) => api.delete(`/products/${productId}`),
  getUserProducts: (userId: string, params: any) => api.get(`/products/user/${userId}`, { params }),
  getCategories: () => api.get('/products/categories'),
  updateAvailability: (productId: string, isAvailable: boolean) => 
    api.patch(`/products/${productId}/availability`, { isAvailable }),
  uploadProductImages: (id: string, images: FormData) => api.post(`/products/${id}/images`, images, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProductImage: (productId: string, imageId: string) => api.delete(`/products/${productId}/images/${imageId}`),
};

export const searchAPI = {
  searchProducts: (params: any) => api.get('/search', { params }),
  getSearchSuggestions: (query: string) => api.get('/search/suggestions', { 
    params: { query } 
  }),
  getPopularSearches: () => api.get('/search/popular'),
  getRecentSearches: () => api.get('/search/recent'),
  getCategories: () => api.get('/search/categories'),
  advancedSearch: (filters: any) => api.post('/search/advanced', filters),
};

export const messageAPI = {
  createConversation: (data: { productId: string; receiverId: string }) => 
    api.post('/messages/conversation', data),
  getConversations: (params?: any) => api.get('/messages/conversations', { params }),
  getConversationMessages: (conversationId: string, params?: any) =>   
    api.get(`/messages/conversation/${conversationId}`, { params }),
  getOnlineUsers: () => api.get('/messages/online'),
  sendMessage: (conversationId: string, data: { content: string }) => 
    api.post(`/messages/conversation/${conversationId}`, data),
}; 