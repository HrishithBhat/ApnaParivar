const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection options for better performance and reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 Mongoose connection closed due to application termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

// Database health check
const checkDBHealth = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.ping();
    return {
      status: 'healthy',
      connected: mongoose.connection.readyState === 1,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      ping: status
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message
    };
  }
};

// Database statistics
const getDBStats = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    
    return {
      database: stats.db,
      collections: collections.length,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexSize: stats.indexSize,
      objects: stats.objects,
      indexes: stats.indexes
    };
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error.message}`);
  }
};

// Seed database with initial data
const seedDatabase = async () => {
  try {
    const { User } = require('../models');
    
    // Check if super admin exists
    const superAdmin = await User.findOne({ userType: 'superadmin' });
    
    if (!superAdmin) {
      console.log('🌱 Seeding database with initial super admin...');
      
      // This would be created when the first super admin signs up
      // For now, we'll just log that seeding is needed
      console.log('ℹ️  Super admin will be created on first Google OAuth signup');
    }
    
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Database seeding error:', error.message);
  }
};

// Clear database (for development only)
const clearDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot clear database in production environment');
  }
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.collection(collection.name).drop();
    }
    
    console.log('🗑️  Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  checkDBHealth,
  getDBStats,
  seedDatabase,
  clearDatabase
};