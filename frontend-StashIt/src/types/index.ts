export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  college: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  category: 'BOOKS' | 'ELECTRONICS' | 'FURNITURE' | 'CLOTHING' | 'SPORTS' | 'FOOD' | 'OTHER';
  images: string[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  seller: {
    id: string;
    firstName: string;
    lastName: string;
    college: string;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  productId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string
  };
}

export interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  productId: string;
  lastMessageAt: string;
  createdAt: string;
  user1: {
    id: string;
    firstName: string;
    lastName: string
  };
  user2: {
    id: string;
    firstName: string;
    lastName: string
  };
  product: {
    id: string;
    title: string;
    images: string[];
    price: number;
    isAvailable: boolean;
  };
  otherUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  unreadCount: number;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (user: User | null | ((prev: User | null) => User | null)) => void;
} 

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  college: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ProductFilters {
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
} 