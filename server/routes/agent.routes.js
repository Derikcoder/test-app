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
  deleteAgent
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

export default router;
