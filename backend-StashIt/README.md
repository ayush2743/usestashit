# Stash It - College Marketplace Backend

A comprehensive Node.js microservices backend for a college marketplace where students can buy and sell items within their campus community.

## 🏗️ Architecture

This backend follows a microservices architecture with the following services:

- **API Gateway** (Port 3000) - Single entry point, routing, rate limiting
- **Auth Service** (Port 3001) - User authentication and authorization
- **User Service** (Port 3002) - User profile management
- **Product Service** (Port 3003) - Product listings and management
- **Search Service** (Port 3004) - Product search and filtering
- **Messaging Service** (Port 3005) - Real-time messaging with Socket.io
- **Wishlist Service** (Port 3006) - User wishlist management

## 🚀 Features

### Core Features
- **User Authentication** with college email verification
- **Product Listings** with image upload (max 3 per product)
- **Advanced Search** with filters and sorting
- **Real-time Messaging** between buyers and sellers
- **Wishlist Management** for saving favorite items
- **User Profiles** with statistics and activity

### Technical Features
- **Microservices Architecture** for scalability
- **PostgreSQL** for data persistence with proper indexing
- **Redis** for caching and session management
- **JWT Authentication** with token blacklisting
- **Cloudinary** for image storage and optimization
- **Socket.io** for real-time communication
- **Input Validation** with Joi schemas
- **Rate Limiting** and security middleware
- **Comprehensive Error Handling**

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- Cloudinary account (for image uploads)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-StashIt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Set up PostgreSQL Database**
   ```sql
   CREATE DATABASE stashit_db;
   CREATE USER your_db_user WITH PASSWORD 'your_db_password';
   GRANT ALL PRIVILEGES ON DATABASE stashit_db TO your_db_user;
   ```

5. **Start Redis Server**
   ```bash
   redis-server
   ```

## 🚀 Running the Application

### Development Mode (All Services)
```bash
npm run dev
```

### Production Mode (All Services)
```bash
npm start
```

### Individual Services
```bash
# API Gateway
npm run start:gateway

# Auth Service
npm run start:auth

# User Service
npm run start:user

# Product Service
npm run start:product

# Search Service
npm run start:search

# Messaging Service
npm run start:messaging

# Wishlist Service
npm run start:wishlist
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Service Endpoints

#### Auth Service (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /verify` - Verify JWT token
- `POST /refresh` - Refresh JWT token

#### User Service (`/api/users`)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /profile/image` - Upload profile image
- `GET /:id` - Get user by ID (public profile)
- `GET /:id/products` - Get user's products
- `GET /:id/stats` - Get user statistics

#### Product Service (`/api/products`)
- `GET /` - Get all products (with pagination)
- `GET /:id` - Get product by ID
- `POST /` - Create new product (Auth required)
- `PUT /:id` - Update product (Auth required)
- `DELETE /:id` - Delete product (Auth required)
- `POST /:id/images` - Upload product images (Auth required)
- `GET /meta/categories` - Get all categories

#### Search Service (`/api/search`)
- `GET /` - Search products with filters
- `GET /suggestions` - Get search suggestions
- `GET /popular` - Get popular searches
- `GET /categories` - Get categories with counts
- `POST /advanced` - Advanced search with multiple filters

#### Messaging Service (`/api/messages`)
- `GET /conversations` - Get user conversations (Auth required)
- `GET /conversations/:id` - Get conversation messages (Auth required)
- `POST /` - Send message (Auth required)
- `PUT /:messageId/read` - Mark message as read (Auth required)
- `GET /online` - Get online users (Auth required)

#### Wishlist Service (`/api/wishlist`)
- `GET /` - Get user wishlist (Auth required)
- `POST /:productId` - Add to wishlist (Auth required)
- `DELETE /:productId` - Remove from wishlist (Auth required)
- `GET /check/:productId` - Check if product is in wishlist (Auth required)
- `GET /count` - Get wishlist count (Auth required)
- `GET /categories` - Get wishlist categories (Auth required)
- `GET /summary` - Get wishlist summary (Auth required)
- `DELETE /clear` - Clear entire wishlist (Auth required)

### Response Format

All API responses follow this format:
```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {
    // Response data
  },
  "error": "Error details (only in development)"
}
```

### Pagination

Endpoints that return lists support pagination:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

## 🔌 Real-time Features (Socket.io)

### Connection
```javascript
const socket = io('http://localhost:3005', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Client to Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_read` - Mark message as read

#### Server to Client
- `new_message` - New message received
- `message_sent` - Message sent confirmation
- `message_error` - Message sending error
- `user_typing` - User typing indicator
- `message_read` - Message read receipt

## 🗄️ Database Schema

The application uses **PostgreSQL** with **Prisma ORM** for type-safe database operations.

### Schema Overview
The database schema is defined in `prisma/schema.prisma` and includes:

#### Models
- **User**: User accounts with authentication and profile information
- **Product**: Product listings with seller information, images, and availability
- **Message**: Direct messages between users about products
- **Conversation**: Conversation threads for organizing messages

#### Enums
- **Condition**: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `POOR`
- **Category**: `BOOKS`, `ELECTRONICS`, `FURNITURE`, `CLOTHING`, `SPORTS`, `MUSIC`, `HOME_GARDEN`, `OTHER`

#### Key Features
- **Type Safety**: Prisma provides full TypeScript support
- **Relations**: Proper foreign key relationships with cascade deletions
- **Indexes**: Optimized for query performance
- **Unique Constraints**: Prevent duplicate data
- **Automatic Timestamps**: Created and updated timestamps

#### Database Commands
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Create and apply migrations
npm run db:migrate

# Deploy migrations to production
npm run db:migrate:deploy

# Open Prisma Studio (database browser)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

## 🔒 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with salt rounds
- **Input Validation** using Joi schemas
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers
- **Token Blacklisting** for secure logout
- **College Email Validation** for user registration

## 📊 Caching Strategy

Redis is used for caching to improve performance:

- **User Sessions** (1 hour TTL)
- **Product Details** (30 minutes TTL)
- **Search Results** (10 minutes TTL)
- **User Profiles** (30 minutes TTL)
- **Wishlist Data** (10 minutes TTL)
- **Categories** (1 hour TTL)

## 🚀 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Using Docker
```bash
docker-compose up -d
```

### Environment Variables for Production
Make sure to set secure values for:
- `JWT_SECRET` - Use a strong, random secret
- `DB_PASSWORD` - Use a strong database password
- `REDIS_PASSWORD` - Set Redis password
- `NODE_ENV=production`

## 🧪 Testing

### Health Checks
- API Gateway: `GET http://localhost:3000/health`
- Individual Services: `GET http://localhost:300X/health`

### API Documentation
- Interactive docs: `GET http://localhost:3000/api/docs`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if necessary
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please create an issue in the repository or contact the development team.

## 🔄 Future Enhancements

- Email notifications for messages
- Advanced analytics and reporting
- Payment integration
- Mobile app API optimization
- Advanced search with Elasticsearch
- Image recognition for auto-categorization
- Review and rating system
- Admin dashboard
- Multi-language support 