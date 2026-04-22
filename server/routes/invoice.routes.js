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
  upsertProFormaInvoiceFromServiceCall,
  createFinalInvoiceFromServiceCall,
  recordPayment,
  updateInvoice,
  updateInvoiceWorkflowStatus,
  finalizeInvoice,
  sendInvoice,
  deleteInvoice,
  generateInvoicePDF,
  generateSharedInvoicePDF,
  generateReceiptPDF,
  getSharedInvoiceDetails,
  submitSharedInvoiceDecision,
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
 * @route   POST /api/invoices/from-service-call/:serviceCallId/pro-forma
 * @desc    Create or return a pro-forma invoice draft seeded from service call / quotation data
 * @access  Private (JWT required)
 */
router.post('/from-service-call/:serviceCallId/pro-forma', protect, upsertProFormaInvoiceFromServiceCall);

/**
 * @route   POST /api/invoices/from-service-call/:serviceCallId/final
 * @desc    Create a final invoice seeded from the approved quotation on a completed service call
 * @access  Private (JWT required)
 */
router.post('/from-service-call/:serviceCallId/final', protect, createFinalInvoiceFromServiceCall);

/**
 * @route   GET /api/invoices/share/:token
 * @desc    Public shared invoice / pro-forma summary via secure share token
 * @access  Public
 */
router.get('/share/:token', getSharedInvoiceDetails);

/**
 * @route   POST /api/invoices/share/:token/decision
 * @desc    Public customer approve/reject action for shared pro-forma
 * @access  Public
 */
router.post('/share/:token/decision', submitSharedInvoiceDecision);

/**
 * @route   GET /api/invoices/share/:token/pdf
 * @desc    Public PDF download/view via secure share token
 * @access  Public
 */
router.get('/share/:token/pdf', generateSharedInvoicePDF);

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
 * @route   PATCH /api/invoices/:id/workflow-status
 * @desc    Update pro-forma approval / billing workflow status
 * @access  Private (JWT required)
 */
router.patch('/:id/workflow-status', protect, updateInvoiceWorkflowStatus);

/**
 * @route   POST /api/invoices/:id/finalize
 * @desc    Finalize a pro-forma as the final invoice and mark service call invoiced
 * @access  Private (JWT required)
 */
router.post('/:id/finalize', protect, finalizeInvoice);

/**
 * @route   POST /api/invoices/:id/send
 * @desc    Send pro-forma / invoice via email, WhatsApp, and/or Telegram
 * @access  Private (JWT required)
 */
router.post('/:id/send', protect, sendInvoice);

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
 * @route   GET /api/invoices/:id/receipt/pdf
 * @desc    Generate proof of payment / receipt PDF for a paid invoice
 * @access  Private (JWT required — customers can access their own invoices)
 */
router.get('/:id/receipt/pdf', protect, generateReceiptPDF);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete invoice (only if no payments made)
 * @access  Private (JWT required)
 */
router.delete('/:id', protect, deleteInvoice);

export default router;
