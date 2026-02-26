/**
 * @file Invoice.model.js
 * @description Mongoose schema for invoice records
 * @module Models/Invoice
 * 
 * Defines the data structure for invoices.
 * Links to service calls, quotations, and tracks payment status.
 */

import mongoose from 'mongoose';

/**
 * Line Item Sub-Schema
 * 
 * @description
 * Represents individual items/services on an invoice.
 * Includes description, quantity, pricing, and totals.
 */
const lineItemSchema = new mongoose.Schema({
  /** Item/service description */
  description: {
    type: String,
    required: [true, 'Line item description is required'],
    trim: true,
  },
  /** Quantity */
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 1,
  },
  /** Unit price (before VAT) */
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  /** Line total (quantity × unitPrice) */
  total: {
    type: Number,
    required: [true, 'Line total is required'],
    min: [0, 'Total cannot be negative'],
  },
}, { _id: true });

/**
 * Payment Record Sub-Schema
 * 
 * @description
 * Tracks individual payments made against an invoice.
 */
const paymentRecordSchema = new mongoose.Schema({
  /** Payment amount */
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  /** Payment date */
  date: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now,
  },
  /** Payment method */
  method: {
    type: String,
    enum: ['cash', 'eft', 'card', 'credit', 'other'],
    required: [true, 'Payment method is required'],
  },
  /** Payment reference/transaction number */
  reference: {
    type: String,
    trim: true,
  },
  /** Notes about this payment */
  notes: {
    type: String,
    trim: true,
  },
  /** User who recorded this payment */
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { _id: true, timestamps: true });

/**
 * Invoice Schema Definition
 * 
 * @description
 * Represents an invoice for services rendered.
 * Typically created after a ServiceCall is completed.
 * Tracks line items, totals, VAT, and payment status.
 * 
 * Key Features:
 * - Auto-generated invoice number (INV-XXXXXX format)
 * - Links to ServiceCall and Quotation
 * - Customer and equipment references
 * - Line items with automatic total calculation
 * - VAT calculation (15%)
 * - Payment tracking (multiple payments supported)
 * - Payment terms and due dates
 */
const invoiceSchema = new mongoose.Schema(
  {
    /** Unique invoice number - Auto-generated, immutable */
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      immutable: true, // Prevents modification of invoice ID
    },
    /** Reference to ServiceCall this invoice is for */
    serviceCall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCall',
      required: [true, 'Service call is required'],
    },
    /** Reference to Quotation (if job started from a quotation) */
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
    },
    /** Reference to Customer being invoiced */
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    /** Reference to specific site (for business customers with multiple sites) */
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
    },
    /** Reference to Equipment that was serviced */
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
    },
    /** Service type/category */
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true,
    },
    /** Date service was performed */
    serviceDate: {
      type: Date,
      required: [true, 'Service date is required'],
    },
    /** Invoice issue date */
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
    },
    /** Payment due date */
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    /** Array of line items (services/parts/labor) */
    lineItems: {
      type: [lineItemSchema],
      required: [true, 'At least one line item is required'],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Invoice must have at least one line item',
      },
    },
    /** Labor cost (calculated from hours × rate) */
    laborCost: {
      type: Number,
      min: [0, 'Labor cost cannot be negative'],
      default: 0,
    },
    /** Parts cost (sum of parts used) */
    partsCost: {
      type: Number,
      min: [0, 'Parts cost cannot be negative'],
      default: 0,
    },
    /** Subtotal amount (sum of all line items, before VAT) */
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    /** VAT amount (15% of subtotal) */
    vatAmount: {
      type: Number,
      required: [true, 'VAT amount is required'],
      min: [0, 'VAT amount cannot be negative'],
    },
    /** Total amount (subtotal + VAT) */
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    /** VAT rate percentage (default 15%) */
    vatRate: {
      type: Number,
      default: 15,
      min: [0, 'VAT rate cannot be negative'],
      max: [100, 'VAT rate cannot exceed 100%'],
    },
    /** Current payment status */
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue'],
      default: 'unpaid',
    },
    /** Total amount paid so far */
    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      default: 0,
    },
    /** Outstanding balance */
    balance: {
      type: Number,
      min: [0, 'Balance cannot be negative'],
    },
    /** Payment records (multiple payments supported) */
    payments: {
      type: [paymentRecordSchema],
      default: [],
    },
    /** Date invoice was fully paid */
    paidDate: {
      type: Date,
    },
    /** Payment terms (days) */
    paymentTerms: {
      type: Number,
      default: 30, // 30 days
      min: [0, 'Payment terms cannot be negative'],
    },
    /** Invoice notes/description */
    notes: {
      type: String,
      trim: true,
    },
    /** Terms and conditions */
    terms: {
      type: String,
      trim: true,
      default: 'Payment due within 30 days. Late payments subject to interest charges.',
    },
    /** Bank details for payment */
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      accountHolder: { type: String, trim: true },
      branchCode: { type: String, trim: true },
    },
    /** PDF file reference/path (when invoice PDF is generated) */
    pdfFile: {
      type: String,
      trim: true,
    },
    /** Reference to User who created this invoice */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Auto-add createdAt and updatedAt
  }
);

/**
 * Pre-save Middleware: Auto-generate Invoice Number
 * 
 * @description
 * Automatically generates a unique invoice number in format INV-XXXXXX
 * if not provided. Uses sequential numbering based on existing count.
 * 
 * @fires invoiceSchema#pre('save')
 * 
 * @example
 * // First invoice: INV-000001
 * // Second invoice: INV-000002
 */
invoiceSchema.pre('save', async function (next) {
  // Only generate for new documents without an invoice number
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    // Format: INV-000001 (padded to 6 digits)
    this.invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;
  }

  // Set default due date if not provided (payment terms from issue date)
  if (this.isNew && !this.dueDate) {
    const dueDate = new Date(this.issueDate);
    dueDate.setDate(dueDate.getDate() + this.paymentTerms);
    this.dueDate = dueDate;
  }

  // Calculate balance
  this.balance = this.totalAmount - this.paidAmount;

  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    if (!this.paidDate) {
      this.paidDate = new Date();
    }
  } else {
    this.paymentStatus = 'partial';
  }

  // Check if overdue
  if (this.paymentStatus !== 'paid' && this.dueDate < new Date()) {
    this.paymentStatus = 'overdue';
  }

  next();
});

/**
 * Instance Method: Add Payment
 * 
 * @description
 * Adds a payment record to the invoice and updates paid amount.
 * 
 * @param {Object} payment - Payment details
 * @param {Number} payment.amount - Payment amount
 * @param {String} payment.method - Payment method
 * @param {String} payment.reference - Payment reference
 * @param {String} payment.notes - Payment notes
 * @param {ObjectId} payment.recordedBy - User who recorded payment
 * @returns {Promise<Invoice>} Updated invoice
 */
invoiceSchema.methods.addPayment = async function(payment) {
  this.payments.push(payment);
  this.paidAmount += payment.amount;
  return this.save();
};

/**
 * Static Property: Immutable Fields
 * Fields that cannot be updated after creation (audit trail protection)
 */
invoiceSchema.statics.IMMUTABLE_FIELDS = [
  'invoiceNumber',
  'serviceCall',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated during invoice lifecycle
 */
invoiceSchema.statics.EDITABLE_FIELDS = [
  'quotation',
  'customer',
  'siteId',
  'equipment',
  'serviceType',
  'serviceDate',
  'issueDate',
  'dueDate',
  'lineItems',
  'laborCost',
  'partsCost',
  'subtotal',
  'vatAmount',
  'totalAmount',
  'vatRate',
  'paymentStatus',
  'paidAmount',
  'balance',
  'payments',
  'paidDate',
  'paymentTerms',
  'notes',
  'terms',
  'bankDetails',
  'pdfFile'
];

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
