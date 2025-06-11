const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@university.edu',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        college: 'University of Technology',
        phone: '+1234567890',
        isVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@college.edu',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        college: 'College of Engineering',
        phone: '+1234567891',
        isVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'mike.wilson@university.edu',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Wilson',
        college: 'University of Technology',
        phone: '+1234567892',
        isVerified: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah.johnson@college.edu',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        college: 'College of Engineering',
        phone: '+1234567893',
        isVerified: true
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample products
  const products = await Promise.all([
    // Books
    prisma.product.create({
      data: {
        sellerId: users[0].id,
        title: 'Introduction to Computer Science',
        description: 'Comprehensive textbook covering fundamentals of computer science. Great condition, minimal highlighting.',
        price: 45.99,
        condition: 'GOOD',
        category: 'BOOKS',
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'],
        isAvailable: true
      }
    }),
    prisma.product.create({
      data: {
        sellerId: users[1].id,
        title: 'Calculus and Analytical Geometry',
        description: 'Essential math textbook for engineering students. Includes solution manual.',
        price: 38.50,
        condition: 'LIKE_NEW',
        category: 'BOOKS',
        images: ['https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400'],
        isAvailable: true
      }
    }),
    // Electronics
    prisma.product.create({
      data: {
        sellerId: users[0].id,
        title: 'Apple MacBook Air M1',
        description: 'Excellent condition MacBook Air with M1 chip. Perfect for students. Includes charger and original box.',
        price: 899.99,
        condition: 'LIKE_NEW',
        category: 'ELECTRONICS',
        images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
        isAvailable: true
      }
    }),
    prisma.product.create({
      data: {
        sellerId: users[2].id,
        title: 'iPad Pro 11" with Apple Pencil',
        description: 'Great for note-taking and digital art. Comes with Apple Pencil and keyboard case.',
        price: 599.99,
        condition: 'GOOD',
        category: 'ELECTRONICS',
        images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400'],
        isAvailable: true
      }
    }),
    // Furniture
    prisma.product.create({
      data: {
        sellerId: users[1].id,
        title: 'Study Desk with Storage',
        description: 'Spacious wooden desk perfect for studying. Multiple drawers for storage. Moving sale!',
        price: 125.00,
        condition: 'GOOD',
        category: 'FURNITURE',
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'],
        isAvailable: true
      }
    }),
    prisma.product.create({
      data: {
        sellerId: users[3].id,
        title: 'Ergonomic Office Chair',
        description: 'Comfortable chair with lumbar support. Perfect for long study sessions.',
        price: 75.00,
        condition: 'GOOD',
        category: 'FURNITURE',
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'],
        isAvailable: true
      }
    }),
    // Clothing
    prisma.product.create({
      data: {
        sellerId: users[2].id,
        title: 'University Hoodie - Size M',
        description: 'Official university merchandise. Warm and comfortable. Rarely worn.',
        price: 25.00,
        condition: 'LIKE_NEW',
        category: 'CLOTHING',
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'],
        isAvailable: true
      }
    }),
    // Sports
    prisma.product.create({
      data: {
        sellerId: users[3].id,
        title: 'Tennis Racket - Wilson Pro',
        description: 'Professional grade tennis racket. Excellent condition, recently restrung.',
        price: 89.99,
        condition: 'GOOD',
        category: 'SPORTS',
        images: ['https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400'],
        isAvailable: true
      }
    }),
    // Food
    prisma.product.create({
      data: {
        sellerId: users[0].id,
        title: 'Coffee Maker - Deluxe Edition',
        description: 'High-quality coffee maker, perfect for dorm life. Makes up to 12 cups.',
        price: 45.00,
        condition: 'LIKE_NEW',
        category: 'FOOD',
        images: ['https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400'],
        isAvailable: true
      }
    })
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create some sample conversations and messages
  const conversation1 = await prisma.conversation.create({
    data: {
      user1Id: users[1].id, // Jane
      user2Id: users[0].id, // John
      productId: products[0].id, // Computer Science book
      lastMessageAt: new Date()
    }
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      user1Id: users[2].id, // Mike
      user2Id: users[0].id, // John
      productId: products[2].id, // MacBook
      lastMessageAt: new Date()
    }
  });

  // Create sample messages
  await Promise.all([
    prisma.message.create({
      data: {
        senderId: users[1].id, // Jane
        receiverId: users[0].id, // John
        productId: products[0].id, // Computer Science book
        content: 'Hi! Is this textbook still available?',
        isRead: true
      }
    }),
    prisma.message.create({
      data: {
        senderId: users[0].id, // John
        receiverId: users[1].id, // Jane
        productId: products[0].id, // Computer Science book
        content: 'Yes, it is! Are you interested in purchasing it?',
        isRead: false
      }
    }),
    prisma.message.create({
      data: {
        senderId: users[2].id, // Mike
        receiverId: users[0].id, // John
        productId: products[2].id, // MacBook
        content: 'Is the MacBook still under warranty?',
        isRead: false
      }
    })
  ]);

  console.log(`✅ Created sample conversations and messages`);

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Sample Data Summary:');
  console.log(`   👥 Users: ${users.length}`);
  console.log(`   📦 Products: ${products.length}`);
  console.log(`   💬 Conversations: 2`);
  console.log(`   💌 Messages: 3`);
  console.log('\n🔐 Default login credentials:');
  console.log('   Email: john.doe@university.edu');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 