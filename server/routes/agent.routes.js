/**
 * @file agent.routes.js
 * @description Field service agent management route definitions
 * @module Routes/Agent
 * 
 * Defines all agent-related API endpoints for CRUD operations.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/agents
 */

import express from 'express';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentPerformance,
  getAgentsBySpecialization,
  getTopRatedAgents,
  updateAgentAvailability,
  updateAgentLocation,
  getAvailableAgents
} from '../controllers/agent.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/agents
 * @desc    Get all field service agents
 * @access  Private (JWT required)
 */
router.get('/', protect, getAgents);

/**
 * @route   POST /api/agents
 * @desc    Create new field service agent
 * @access  Private (JWT required)
 */
router.post('/', protect, createAgent);

/**
 * @route   GET /api/agents/:id
 * @desc    Get single agent by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getAgentById);

/**
 * @route   PUT /api/agents/:id
 * @desc    Update agent information
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateAgent);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Delete agent record
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteAgent);

/**
 * @route   GET /api/agents/available/list
 * @desc    Get all available agents for job assignment (optional: ?specialization=HVAC_REFRIGERATION)
 * @access  Private (JWT required)
 */
router.get('/available/list', protect, getAvailableAgents);

/**
 * @route   GET /api/agents/top-rated
 * @desc    Get top-rated agents (query: ?limit=10&minRatings=3)
 * @access  Private (JWT required)
 */
router.get('/top-rated', protect, getTopRatedAgents);

/**
 * @route   GET /api/agents/specialization/:specialization
 * @desc    Get agents by specialization (e.g., HVAC_REFRIGERATION, ELECTRICAL, PLUMBING)
 * @access  Private (JWT required)
 */
router.get('/specialization/:specialization', protect, getAgentsBySpecialization);

/**
 * @route   GET /api/agents/:id/performance
 * @desc    Get agent performance metrics and ratings
 * @access  Private (JWT required)
 */
router.get('/:id/performance', protect, getAgentPerformance);

/**
 * @route   PATCH /api/agents/:id/availability
 * @desc    Update agent availability status (available/busy/off-duty)
 * @access  Private (JWT required)
 */
router.patch('/:id/availability', protect, updateAgentAvailability);

/**
 * @route   PATCH /api/agents/:id/location
 * @desc    Update agent current location (latitude and longitude)
 * @access  Private (JWT required)
 */
router.patch('/:id/location', protect, updateAgentLocation);

export default router;
