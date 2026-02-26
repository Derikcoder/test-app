/**
 * @file invoice.routes.js
 * @description Invoice and payment management route definitions
 * @module Routes/Invoice
 * 
 * Defines all invoice-related API endpoints for CRUD operations,
 * payment recording, payment status tracking, and PDF generation.
 * All routes require authentication via JWT token.
 * 
 * Base path: /api/invoices
 */

import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  getInvoicesByPaymentStatus,
  getOverdueInvoicesSummary,
  createInvoice,
  recordPayment,
  updateInvoice,
  deleteInvoice,
  generateInvoicePDF
} from '../controllers/invoice.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices (supports query filters: ?status=draft&customer=123&paymentStatus=unpaid)
 * @access  Private (JWT required)
 */
router.get('/', protect, getInvoices);

/**
 * @route   POST /api/invoices
 * @desc    Create new invoice from service call
 * @access  Private (JWT required)
 */
router.post('/', protect, createInvoice);

/**
 * @route   GET /api/invoices/overdue/summary
 * @desc    Get summary of all overdue invoices
 * @access  Private (JWT required)
 */
router.get('/overdue/summary', protect, getOverdueInvoicesSummary);

/**
 * @route   GET /api/invoices/payment-status/:status
 * @desc    Get invoices by payment status (unpaid/partial/paid/overdue)
 * @access  Private (JWT required)
 */
router.get('/payment-status/:status', protect, getInvoicesByPaymentStatus);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get single invoice by ID
 * @access  Private (JWT required)
 */
router.get('/:id', protect, getInvoiceById);

/**
 * @route   PUT /api/invoices/:id
 * @desc    Update invoice details
 * @access  Private (JWT required)
 */
router.put('/:id', protect, updateInvoice);

/**
 * @route   POST /api/invoices/:id/payment
 * @desc    Record payment for invoice
 * @access  Private (JWT required)
 */
router.post('/:id/payment', protect, recordPayment);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Generate PDF for invoice
 * @access  Private (JWT required)
 */
router.get('/:id/pdf', protect, generateInvoicePDF);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete invoice (only if no payments made)
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteInvoice);

export default router;
