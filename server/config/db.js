/**
 * @file db.js
 * @description MongoDB database connection configuration
 * @module Database
 * 
 * Handles the initial connection to MongoDB using Mongoose ODM.
 * Provides graceful error handling if MongoDB is unavailable.
 */

import mongoose from 'mongoose';
import User from '../models/User.model.js';

const DEFAULT_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/test-app';

const connectAndSync = async (uri) => {
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
  });

  // Keep runtime indexes aligned with schema definitions after model/index updates.
  await User.syncIndexes();
  return conn;
};

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
  const primaryUri = process.env.MONGODB_URI;

  try {
    // Attempt to connect using configured URI first (Atlas or local)
    const conn = await connectAndSync(primaryUri);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log('✅ User indexes synchronized');
    return conn;
  } catch (error) {
    console.error(`❌ Primary MongoDB connection failed: ${error.message}`);

    const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
    const fallbackUri = process.env.MONGODB_LOCAL_URI || DEFAULT_LOCAL_MONGO_URI;

    if (isDevelopment) {
      try {
        const fallbackConn = await connectAndSync(fallbackUri);
        console.log(`✅ Fallback MongoDB Connected (local): ${fallbackConn.connection.host}`);
        console.log('✅ User indexes synchronized');
        return fallbackConn;
      } catch (fallbackError) {
        console.error(`❌ Local MongoDB fallback failed: ${fallbackError.message}`);
      }
    }

    // Handle connection errors gracefully
    console.log('⚠️  Server will continue without MongoDB - Database features disabled');
    console.log('💡 To fix: whitelist current Atlas IP or set MONGODB_LOCAL_URI for local development');
    return null;
  }
};

export default connectDB;
