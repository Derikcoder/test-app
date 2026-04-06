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
  const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
  const primaryUri = process.env.MONGODB_URI;
  const localUri = process.env.MONGODB_LOCAL_URI || DEFAULT_LOCAL_MONGO_URI;
  const attempts = [];

  // In development, prefer local MongoDB first to avoid Atlas IP whitelist friction.
  if (isDevelopment) {
    attempts.push({ label: 'Local MongoDB', uri: localUri });
    if (primaryUri && primaryUri !== localUri) {
      attempts.push({ label: 'Primary MongoDB', uri: primaryUri });
    }
  } else if (primaryUri) {
    attempts.push({ label: 'Primary MongoDB', uri: primaryUri });
  }

  if (attempts.length === 0) {
    console.error('❌ MongoDB connection skipped: no URI configured. Set MONGODB_URI or MONGODB_LOCAL_URI.');
    return null;
  }

  for (const attempt of attempts) {
    try {
      const conn = await connectAndSync(attempt.uri);
      console.log(`✅ ${attempt.label} Connected: ${conn.connection.host}`);
      console.log('✅ User indexes synchronized');
      return conn;
    } catch (error) {
      console.error(`❌ ${attempt.label} connection failed: ${error.message}`);
    }
  }

  console.log('⚠️  Server will continue without MongoDB - Database features disabled');
  console.log('💡 To fix: start local mongod or whitelist current Atlas IP');
  return null;
};

export default connectDB;
