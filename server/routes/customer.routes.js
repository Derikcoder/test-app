/**
 * @file customer.routes.js
 * @description Customer management route definitions
 * @module Routes/Customer
 * 
 * Defines all customer-related API endpoints for CRUD operations.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/customers
 */

import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controllers/customer.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/customers
 * @desc    Get all customers
 * @access  Private (JWT required)
 */
router.get('/', protect, getCustomers);

/**
 * @route   POST /api/customers
 * @desc    Create new customer record
 * @access  Private (JWT required)
 */
router.post('/', protect, createCustomer);

/**
 * @route   GET /api/customers/:id
 * @desc    Get single customer by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getCustomerById);

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer information
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateCustomer);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer record
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteCustomer);

export default router;
