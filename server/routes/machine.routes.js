/**
 * @file machine.routes.js
 * @description Machine management route definitions
 * @module Routes/Machine
 *
 * Defines all machine/equipment tracking API endpoints:
 * - Machine CRUD operations
 * - Agent's machine list and history
 * - Service history recording
 * - Quotation template generation from history
 *
 * Base path: /api/machines
 * All routes require JWT authentication
 */

import express from 'express';
import {
  getMachines,
  getMachinesByCategory,
  getMachineById,
  getMachineServiceHistory,
  createMachine,
  updateMachine,
  deleteMachine,
  recordServiceHistory,
  getQuotationTemplate,
} from '../controllers/machine.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/machines
 * @desc    Get all machines for current agent
 * @access  Private (JWT required)
 * @returns Array of machines sorted by service count (descending)
 */
router.get('/', protect, getMachines);

/**
 * @route   POST /api/machines
 * @desc    Create a new machine record
 * @access  Private (JWT required)
 * @body    serviceCategory, machineType, generatorMakeModel, machineModelNumber, generatorCapacityKva, siteName, customerId
 */
router.post('/', protect, createMachine);

/**
 * @route   GET /api/machines/category/:category
 * @desc    Get machines filtered by service category
 * @access  Private (JWT required)
 * @params  category - Service category (e.g., 'generator-backup-power')
 */
router.get('/category/:category', protect, getMachinesByCategory);

/**
 * @route   GET /api/machines/:id
 * @desc    Get single machine by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getMachineById);

/**
 * @route   PUT /api/machines/:id
 * @desc    Update machine details (notes, operating hours, etc.)
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateMachine);

/**
 * @route   DELETE /api/machines/:id
 * @desc    Delete a machine record
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteMachine);

/**
 * @route   GET /api/machines/:id/service-history
 * @desc    Get complete service history for a machine
 * @access  Private (JWT required)
 * @returns Array of service history records sorted by date (descending)
 */
router.get('/:id/service-history', protect, getMachineServiceHistory);

/**
 * @route   POST /api/machines/:id/service-history
 * @desc    Record a completed service on a machine
 * @access  Private (JWT required)
 * @body    serviceCallId, serviceType, partsUsed, servicesPerformed, issuesFound, recommendations, labourHours, labourCost, totalServiceCost
 */
router.post('/:id/service-history', protect, recordServiceHistory);

/**
 * @route   GET /api/machines/:id/quotation-template
 * @desc    Get quotation template from last service on machine
 * @access  Private (JWT required)
 * @returns Structured template with last service costs and parts for quotation generation
 */
router.get('/:id/quotation-template', protect, getQuotationTemplate);

export default router;
