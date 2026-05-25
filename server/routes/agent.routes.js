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
import multer from 'multer';
import {
  getAgents,
  getAgentById,
  getPublicAgentProfile,
  getMyAgentProfile,
  createAgent,
  updateAgent,
  uploadAgentProfilePhoto,
  deleteAgent,
  getAgentPerformance,
  getAgentsBySpecialization,
  getTopRatedAgents,
  updateAgentAvailability,
  updateAgentLocation,
  updateAgentSelfDispatchAccess,
  getAvailableAgents
} from '../controllers/agent.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(new Error('Profile photo must be JPG or PNG'));
    }

    return callback(null, true);
  },
});

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
 * @route   GET /api/agents/me
 * @desc    Get the calling field agent's own profile
 * @access  Private (JWT required)
 */
router.get('/me', protect, getMyAgentProfile);

/**
 * @route   GET /api/agents/public/:id
 * @desc    Get public-facing field agent profile
 * @access  Private (JWT required)
 */
router.get('/public/:id', protect, getPublicAgentProfile);

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
 * @route   PATCH /api/agents/:id/profile-photo
 * @desc    Upload or replace profile photo for an agent profile
 * @access  Private (JWT required)
 */
router.patch(
  '/:id/profile-photo',
  protect,
  (req, res, next) => {
    profilePhotoUpload.single('profilePhoto')(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Profile photo size must be 500KB or less' });
      }

      return res.status(400).json({ message: error.message || 'Failed to upload profile photo' });
    });
  },
  uploadAgentProfilePhoto
);

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

/**
 * @route   PATCH /api/agents/:id/self-dispatch-access
 * @desc    Update agent self-dispatch eligibility access
 * @access  Private (JWT required)
 */
router.patch('/:id/self-dispatch-access', protect, updateAgentSelfDispatchAccess);

export default router;
