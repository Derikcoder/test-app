/**
 * @file quotation.routes.js
 * @description Quotation/estimate management route definitions
 * @module Routes/Quotation
 * 
 * Defines all quotation-related API endpoints for CRUD operations,
 * status management, conversion to service calls, and PDF generation.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/quotations
 */

import express from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  createQuotationFromServiceCall,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToServiceCall,
  deleteQuotation,
  generateQuotationPDF,
  generateSharedQuotationPDF,
  sendQuotation,
} from '../controllers/quotation.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/quotations
 * @desc    Get all quotations (supports query filters: ?status=draft&customer=123)
 * @access  Private (JWT required)
 */
router.get('/', protect, getQuotations);

/**
 * @route   POST /api/quotations
 * @desc    Create new quotation/estimate
 * @access  Private (JWT required)
 */
router.post('/', protect, createQuotation);

/**
 * @route   POST /api/quotations/from-service-call/:serviceCallId
 * @desc    Create a quotation seeded from a service call context
 * @access  Private (JWT required)
 */
router.post('/from-service-call/:serviceCallId', protect, createQuotationFromServiceCall);

/**
 * @route   GET /api/quotations/share/:token/pdf
 * @desc    Public PDF download/view via secure share token
 * @access  Public
 */
router.get('/share/:token/pdf', generateSharedQuotationPDF);

/**
 * @route   GET /api/quotations/:id
 * @desc    Get single quotation by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getQuotationById);

/**
 * @route   PUT /api/quotations/:id
 * @desc    Update quotation details
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateQuotation);

/**
 * @route   PATCH /api/quotations/:id/status
 * @desc    Update quotation status (draft/sent/approved/rejected/expired)
 * @access  Private (JWT required)
 */
router.patch('/:id/status', protect, updateQuotationStatus);

/**
 * @route   POST /api/quotations/:id/send
 * @desc    Send quotation via optional email/whatsapp/telegram channels with PDF
 * @access  Private (JWT required)
 */
router.post('/:id/send', protect, sendQuotation);

/**
 * @route   POST /api/quotations/:id/convert
 * @desc    Convert approved quotation to service call
 * @access  Private (JWT required)
 */
router.post('/:id/convert', protect, convertQuotationToServiceCall);

/**
 * @route   GET /api/quotations/:id/pdf
 * @desc    Generate PDF for quotation
 * @access  Private (JWT required)
 */
router.get('/:id/pdf', protect, generateQuotationPDF);

/**
 * @route   DELETE /api/quotations/:id
 * @desc    Delete quotation (only if not converted or approved)
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteQuotation);

export default router;
