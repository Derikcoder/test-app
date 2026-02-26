/**
 * @file db.js
 * @description MongoDB database connection configuration
 * @module Database
 * 
 * Handles the initial connection to MongoDB using Mongoose ODM.
 * Provides graceful error handling if MongoDB is unavailable.
 */

import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB database
 * 
 * @async
 * @function connectDB
 * @returns {Promise<mongoose.Connection|null>} MongoDB connection object or null if failed
 * 
 * @description
 * - Reads MONGODB_URI from environment variables
 * - Uses a 5-second timeout for faster failure detection
 * - Returns null on failure (allows server to continue without DB)
 * - Logs detailed error messages with troubleshooting hints
 * 
 * @example
 * import connectDB from './config/db.js';
 * await connectDB();
 */
const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB with configuration options
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Handle connection errors gracefully
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('⚠️  Server will continue without MongoDB - Database features disabled');
    console.log('💡 To fix: Install MongoDB or use MongoDB Atlas (see README.md)');
    return null;
  }
};

export default connectDB;
