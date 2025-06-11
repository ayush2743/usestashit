# StashIt API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

### Register
`POST /auth/register`

Request:
```json
{
  "email": "user@college.edu",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "college": "Example University",
  "phone": "+1234567890"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@college.edu",
      "firstName": "John",
      "lastName": "Doe",
      "college": "Example University",
      "phone": "+1234567890",
      "isVerified": false,
      "createdAt": "2024-03-21T12:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

### Login
`POST /auth/login`

Request:
```json
{
  "email": "user@college.edu",
  "password": "securePassword123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@college.edu",
      "firstName": "John",
      "lastName": "Doe",
      "college": "Example University",
      "phone": "+1234567890",
      "isVerified": true,
      "createdAt": "2024-03-21T12:00:00Z"
    },
    "token": "jwt_token_here"
  }
}
```

## User Management

### Get Profile
`GET /users/profile`

Response:
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@college.edu",
      "firstName": "John",
      "lastName": "Doe",
      "college": "Example University",
      "phone": "+1234567890",
      "isVerified": true,
      "createdAt": "2024-03-21T12:00:00Z",
      "updatedAt": "2024-03-21T12:00:00Z"
    }
  }
}
```

### Update Profile
`PUT /users/profile`

Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "college": "New University",
  "phone": "+1234567890"
}
```

Response:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@college.edu",
      "firstName": "John",
      "lastName": "Doe",
      "college": "New University",
      "phone": "+1234567890",
      "isVerified": true,
      "updatedAt": "2024-03-21T12:00:00Z"
    }
  }
}
```

## Products

### Create Product
`POST /products`

Request:
```json
{
  "title": "Product Title",
  "description": "Product description here",
  "price": 99.99,
  "condition": "NEW",
  "category": "FOOD",
  "images": [
    // Multipart form data with up to 3 images
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": "uuid",
      "sellerId": "user_uuid",
      "title": "Product Title",
      "description": "Product description here",
      "price": 99.99,
      "condition": "NEW",
      "category": "FOOD",
      "images": ["url1", "url2", "url3"],
      "isAvailable": true,
      "createdAt": "2024-03-21T12:00:00Z",
      "seller": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "college": "Example University"
      }
    }
  }
}
```

### Update Product
`PUT /products/:productId`

Request:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "price": 89.99,
  "condition": "LIKE_NEW",
  "category": "FOOD",
  "images": [
    // Optional: Multipart form data with up to 3 images
  ]
}
```

Response:
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {
      "id": "uuid",
      "sellerId": "user_uuid",
      "title": "Updated Title",
      "description": "Updated description",
      "price": 89.99,
      "condition": "LIKE_NEW",
      "category": "FOOD",
      "images": ["url1", "url2", "url3"],
      "isAvailable": true,
      "updatedAt": "2024-03-21T12:00:00Z",
      "seller": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "college": "Example University"
      }
    }
  }
}
```

### Update Product Availability
`PATCH /products/:productId/availability`

Request:
```json
{
  "isAvailable": false
}
```

Response:
```json
{
  "success": true,
  "message": "Product marked as sold",
  "data": {
    "product": {
      "id": "uuid",
      "isAvailable": false,
      "updatedAt": "2024-03-21T12:00:00Z"
    }
  }
}
```

### Delete Product
`DELETE /products/:productId`

Response:
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

### Search Products
`GET /search`

Request Parameters:
```json
{
  "query": "search term",
  "category": "FOOD",
  "minPrice": 0,
  "maxPrice": 1000,
  "condition": "NEW",
  "page": 1,
  "limit": 10,
  "sortBy": "price",
  "sortOrder": "asc"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Product Title",
        "description": "Product description",
        "price": 99.99,
        "condition": "NEW",
        "category": "FOOD",
        "images": ["url1"],
        "isAvailable": true,
        "seller": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "college": "Example University"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

## Messages

### Send Message
`POST /messages`

Request Body:
```json
{
  "receiverId": "uuid",
  "productId": "uuid",
  "content": "Hello, is this item still available?"
}
```

Response:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": "uuid",
      "senderId": "sender_uuid",
      "receiverId": "receiver_uuid",
      "productId": "product_uuid",
      "content": "Hello, is this item still available?",
      "isRead": false,
      "createdAt": "2024-03-21T12:00:00Z"
    }
  }
}
```

### Get Conversations
`GET /messages/conversations`

Response:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "participants": [
          {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe"
          }
        ],
        "lastMessage": {
          "content": "Hello, is this item still available?",
          "createdAt": "2024-03-21T12:00:00Z",
          "isRead": false
        },
        "product": {
          "id": "uuid",
          "title": "Product Title",
          "images": ["url1"]
        },
        "unreadCount": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Authentication Error
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Rate Limiting
The API implements rate limiting of 100 requests per 15 minutes per IP address. When exceeded:

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
``` 