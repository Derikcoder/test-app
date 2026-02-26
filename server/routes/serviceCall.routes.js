/**
 * @file serviceCall.routes.js
 * @description Service call/work order management route definitions
 * @module Routes/ServiceCall
 * 
 * Defines all service call-related API endpoints for CRUD operations.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/service-calls
 */

import express from 'express';
import {
  getServiceCalls,
  getServiceCallById,
  createServiceCall,
  updateServiceCall,
  deleteServiceCall,
  addParts,
  uploadPhotos,
  submitRating,
  getServiceCallsByStatus,
  getServiceCallsByAgent
} from '../controllers/serviceCall.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/service-calls
 * @desc    Get all service calls
 * @access  Private (JWT required)
 */
router.get('/', protect, getServiceCalls);

/**
 * @route   POST /api/service-calls
 * @desc    Create new service call/work order
 * @access  Private (JWT required)
 */
router.post('/', protect, createServiceCall);

/**
 * @route   GET /api/service-calls/:id
 * @desc    Get single service call by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getServiceCallById);

/**
 * @route   PUT /api/service-calls/:id
 * @desc    Update service call information
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateServiceCall);

/**
 * @route   DELETE /api/service-calls/:id
 * @desc    Delete service call record
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteServiceCall);

/**
 * @route   GET /api/service-calls/status/:status
 * @desc    Get service calls by status
 * @access  Private (JWT required)
 */
router.get('/status/:status', protect, getServiceCallsByStatus);

/**
 * @route   GET /api/service-calls/agent/:agentId
 * @desc    Get service calls assigned to an agent
 * @access  Private (JWT required)
 */
router.get('/agent/:agentId', protect, getServiceCallsByAgent);

/**
 * @route   POST /api/service-calls/:id/parts
 * @desc    Add parts used to service call
 * @access  Private (JWT required)
 */
router.post('/:id/parts', protect, addParts);

/**
 * @route   POST /api/service-calls/:id/photos
 * @desc    Upload before/after photos for service call
 * @access  Private (JWT required)
 */
router.post('/:id/photos', protect, uploadPhotos);

/**
 * @route   POST /api/service-calls/:id/rating
 * @desc    Submit rating and feedback for completed service call
 * @access  Private (JWT required)
 */
router.post('/:id/rating', protect, submitRating);

export default router;
