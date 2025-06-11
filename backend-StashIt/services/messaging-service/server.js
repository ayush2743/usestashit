const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { prisma, connectDatabase, healthCheck } = require('../../config/database');
const { client: redis, connectRedis, redisUtils } = require('../../config/redis');
const { verifyToken } = require('../../shared/middleware/auth');
const { messageSchemas, validate, commonSchemas } = require('../../shared/utils/validation');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.MESSAGING_SERVICE_PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Store active socket connections
const activeUsers = new Map();

// Initialize connections
const initializeService = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    console.log('Messaging service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize messaging service:', error);
  }
};

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisUtils.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return next(new Error('Token is invalid'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      }
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

// Socket.io connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User ${socket.user.firstName} connected`);
  
  // Store user connection
  activeUsers.set(socket.userId, socket.id);
  
  // Join user to their personal room
  socket.join(`user:${socket.userId}`);

  // Handle joining conversation rooms
  socket.on('join-conversation', async (conversationId) => {
    try {
      // Verify user is part of this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId }
          ]
        }
      });

      if (conversation) {
        socket.join(`conversation:${conversationId}`);
        socket.emit('joined-conversation', conversationId);
      } else {
        socket.emit('error', 'Not authorized to join this conversation');
      }
    } catch (error) {
      socket.emit('error', 'Failed to join conversation');
    }
  });

  // Handle leaving conversation rooms
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    socket.emit('left-conversation', conversationId);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.firstName,
      conversationId: data.conversationId
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user-stopped-typing', {
      userId: socket.userId,
      conversationId: data.conversationId
    });
  });

  // Handle new messages
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, content, productId } = data;

      // Validate message content
      if (!content || content.trim().length === 0) {
        socket.emit('error', 'Message content cannot be empty');
        return;
      }

      // Get conversation and verify user is part of it
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { user1Id: socket.userId },
            { user2Id: socket.userId }
          ]
        },
        include: {
          user1: {
            select: { id: true, firstName: true, lastName: true }
          },
          user2: {
            select: { id: true, firstName: true, lastName: true }
          },
          product: {
            select: { id: true, title: true }
          }
        }
      });

      if (!conversation) {
        socket.emit('error', 'Conversation not found');
        return;
      }

      const receiverId = conversation.user1Id === socket.userId ? 
        conversation.user2Id : conversation.user1Id;

      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: socket.userId,
          receiverId,
          productId: conversation.productId,
          content: content.trim()
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          product: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      // Update conversation last message time
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() }
      });

      // Emit message to conversation room
      io.to(`conversation:${conversationId}`).emit('new-message', message);

      // Send notification to receiver if they're online
      io.to(`user:${receiverId}`).emit('message-notification', {
        messageId: message.id,
        senderId: socket.userId,
        senderName: socket.user.firstName,
        content: message.content,
        conversationId,
        productTitle: conversation.product.title
      });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle message read status
  socket.on('mark-read', async (data) => {
    try {
      const { messageId } = data;

      await prisma.message.update({
        where: {
          id: messageId,
          receiverId: socket.userId
        },
        data: { isRead: true }
      });

      // Notify sender that message was read
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true }
      });

      if (message) {
        io.to(`user:${message.senderId}`).emit('message-read', {
          messageId,
          readBy: socket.userId
        });
      }

    } catch (error) {
      console.error('Mark read error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.firstName} disconnected`);
    activeUsers.delete(socket.userId);
  });
});

// REST API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'messaging-service',
    status: 'running',
    timestamp: new Date().toISOString(),
    activeConnections: activeUsers.size
  });
});

// Get user conversations
app.get('/messages/conversations', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ]
      },
      skip,
      take,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            isAvailable: true
          }
        }
      }
    });

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              {
                senderId: conversation.user1Id,
                receiverId: conversation.user2Id,
                productId: conversation.productId
              },
              {
                senderId: conversation.user2Id,
                receiverId: conversation.user1Id,
                productId: conversation.productId
              }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        });

        const unreadCount = await prisma.message.count({
          where: {
            receiverId: req.userId,
            productId: conversation.productId,
            isRead: false
          }
        });

        const otherUser = conversation.user1Id === req.userId ? 
          conversation.user2 : conversation.user1;

        return {
          ...conversation,
          otherUser,
          lastMessage,
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations: conversationsWithLastMessage,
        pagination: {
          page: parseInt(page),
          limit: take,
          hasMore: conversations.length === take
        }
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get conversation messages
app.get('/messages/conversation/:conversationId', verifyToken, validate(messageSchemas.getConversation, 'params'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
            isAvailable: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: conversation.user1Id,
            receiverId: conversation.user2Id,
            productId: conversation.productId
          },
          {
            senderId: conversation.user2Id,
            receiverId: conversation.user1Id,
            productId: conversation.productId
          }
        ]
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        receiverId: req.userId,
        productId: conversation.productId,
        isRead: false
      },
      data: { isRead: true }
    });

    const otherUser = conversation.user1Id === req.userId ? 
      conversation.user2 : conversation.user1;

    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        conversation: {
          ...conversation,
          otherUser
        },
        messages: messages.reverse(),
        pagination: {
          page: parseInt(page),
          limit: take,
          hasMore: messages.length === take
        }
      }
    });

  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send message (REST API endpoint)
app.post('/messages/conversation', verifyToken, async (req, res) => {
  try {
    const { error, value } = messageSchemas.createConversation.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { productId, receiverId } = value;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Don't allow messaging yourself
    if (req.userId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start conversation with yourself'
      });
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        productId,
        OR: [
          { user1Id: req.userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: req.userId }
        ]
      }
    });

    if (existingConversation) {
      return res.json({
        success: true,
        message: 'Conversation already exists',
        data: { conversationId: existingConversation.id }
      });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        user1Id: req.userId,
        user2Id: receiverId,
        productId
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: { conversation }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get online users
app.get('/online', verifyToken, (req, res) => {
  const onlineUsers = Array.from(activeUsers.keys());
  res.json({
    success: true,
    data: { 
      onlineUsers,
      count: onlineUsers.length
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Messaging endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Messaging service error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
server.listen(PORT, async () => {
  await initializeService();
  console.log(`💬 Messaging Service running on port ${PORT}`);
}); 