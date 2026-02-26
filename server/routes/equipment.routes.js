/**
 * @file equipment.routes.js
 * @description Equipment management route definitions
 * @module Routes/Equipment
 * 
 * Defines all equipment-related API endpoints for CRUD operations,
 * equipment lookup by customer/site, service history, and warranty tracking.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/equipment
 */

import express from 'express';
import {
  getEquipment,
  getEquipmentByCustomer,
  getEquipmentBySite,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentServiceHistory,
  getEquipmentWarrantyStatus
} from '../controllers/equipment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/equipment
 * @desc    Get all equipment
 * @access  Private (JWT required)
 */
router.get('/', protect, getEquipment);

/**
 * @route   POST /api/equipment
 * @desc    Create new equipment record
 * @access  Private (JWT required)
 */
router.post('/', protect, createEquipment);

/**
 * @route   GET /api/equipment/warranty-status
 * @desc    Get warranty status summary for all equipment
 * @access  Private (JWT required)
 */
router.get('/warranty-status', protect, getEquipmentWarrantyStatus);

/**
 * @route   GET /api/equipment/customer/:customerId
 * @desc    Get all equipment for a specific customer
 * @access  Private (JWT required)
 */
router.get('/customer/:customerId', protect, getEquipmentByCustomer);

/**
 * @route   GET /api/equipment/site/:customerId/:siteId
 * @desc    Get all equipment for a specific customer site
 * @access  Private (JWT required)
 */
router.get('/site/:customerId/:siteId', protect, getEquipmentBySite);

/**
 * @route   GET /api/equipment/:id
 * @desc    Get single equipment by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getEquipmentById);

/**
 * @route   PUT /api/equipment/:id
 * @desc    Update equipment information
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateEquipment);

/**
 * @route   DELETE /api/equipment/:id
 * @desc    Delete equipment record
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteEquipment);

/**
 * @route   GET /api/equipment/:id/service-history
 * @desc    Get service history for specific equipment
 * @access  Private (JWT required)
 */
router.get('/:id/service-history', protect, getEquipmentServiceHistory);

export default router;
