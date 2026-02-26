import express from 'express';
import {
  getServiceCalls,
  getServiceCallById,
  createServiceCall,
  updateServiceCall,
  deleteServiceCall
} from '../controllers/serviceCall.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, getServiceCalls);
router.post('/', protect, createServiceCall);
router.get('/:id', protect, getServiceCallById);
router.put('/:id', protect, updateServiceCall);
router.delete('/:id', protect, deleteServiceCall);

export default router;
