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

router.get('/', protect, getAgents);
router.post('/', protect, createAgent);
router.get('/:id', protect, getAgentById);
router.put('/:id', protect, updateAgent);
router.delete('/:id', protect, deleteAgent);

export default router;
