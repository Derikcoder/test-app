import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import customerRoutes from './routes/customer.routes.js';
import serviceCallRoutes from './routes/serviceCall.routes.js';
import { requestLogger, errorLogger, logInfo, logError } from './middleware/logger.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Connect to MongoDB (optional - server will run without it)
connectDB().catch(err => {
  console.log('MongoDB connection failed:', err.message);
  console.log('Server running without MongoDB...');
});

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Agent routes
app.use('/api/agents', agentRoutes);

// Customer routes
app.use('/api/customers', customerRoutes);

// Service Call routes
app.use('/api/service-calls', serviceCallRoutes);

// 404 handler
app.use((req, res) => {
  logError(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorLogger);

// Start server
app.listen(PORT, () => {
  logInfo(`✅ Server is running on port ${PORT}`);
  logInfo(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
