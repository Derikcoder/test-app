/**
 * @file Quotation.model.js
 * @description Mongoose schema for quotation/estimate records
 * @module Models/Quotation
 * 
 * Defines the data structure for service quotations/estimates.
 * Tracks quotation lifecycle from creation through approval/conversion.
 */

import mongoose from 'mongoose';

/**
 * Line Item Sub-Schema
 * 
 * @description
 * Represents individual items/services in a quotation.
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
 * Quotation Schema Definition
 * 
 * @description
 * Represents a quotation/estimate for services to be provided.
 * Can be converted to a ServiceCall when approved by customer.
 * 
 * Key Features:
 * - Auto-generated quotation number (QT-XXXXXX format)
 * - Customer and equipment references
 * - Line items with automatic total calculation
 * - VAT calculation (15%)
 * - Status workflow (draft → sent → approved/rejected)
 * - Conversion to ServiceCall when approved
 */
const quotationSchema = new mongoose.Schema(
  {
    /** Unique quotation number - Auto-generated, immutable */
    quotationNumber: {
      type: String,
      required: [true, 'Quotation number is required'],
      unique: true,
      trim: true,
      immutable: true, // Prevents modification of quotation ID
    },
    /** Reference to Customer receiving the quotation */
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
    /** Reference to Equipment (if quotation is for specific equipment) */
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
    /** Brief title/summary of the quotation */
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    /** Detailed description/scope of work */
    description: {
      type: String,
      trim: true,
    },
    /** Array of line items (services/parts/labor) */
    lineItems: {
      type: [lineItemSchema],
      required: [true, 'At least one line item is required'],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Quotation must have at least one line item',
      },
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
    /** Quotation valid until date */
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
    },
    /** Current quotation status */
    status: {
      type: String,
      enum: ['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'],
      default: 'draft',
    },
    /** Date quotation was sent to customer */
    sentDate: {
      type: Date,
    },
    /** Date quotation was approved by customer */
    approvedDate: {
      type: Date,
    },
    /** Date quotation was rejected by customer */
    rejectedDate: {
      type: Date,
    },
    /** Reason for rejection (if rejected) */
    rejectionReason: {
      type: String,
      trim: true,
    },
    /** Reference to ServiceCall (when quotation is converted) */
    convertedToServiceCall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCall',
    },
    /** Date quotation was converted to ServiceCall */
    convertedDate: {
      type: Date,
    },
    /** Customer-visible notes */
    notes: {
      type: String,
      trim: true,
    },
    /** Internal notes (not shown to customer) */
    internalNotes: {
      type: String,
      trim: true,
    },
    /** Terms and conditions */
    terms: {
      type: String,
      trim: true,
      default: 'Payment due within 30 days. Quotation valid for 30 days from date of issue.',
    },
    /** Reference to User who created this quotation */
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
 * Pre-save Middleware: Auto-generate Quotation Number
 * 
 * @description
 * Automatically generates a unique quotation number in format QT-XXXXXX
 * if not provided. Uses sequential numbering based on existing count.
 * 
 * @fires quotationSchema#pre('save')
 * 
 * @example
 * // First quotation: QT-000001
 * // Second quotation: QT-000002
 */
quotationSchema.pre('save', async function (next) {
  // Only generate for new documents without a quotation number
  if (this.isNew && !this.quotationNumber) {
    const count = await mongoose.model('Quotation').countDocuments();
    // Format: QT-000001 (padded to 6 digits)
    this.quotationNumber = `QT-${String(count + 1).padStart(6, '0')}`;
  }

  // Set default validUntil to 30 days from now if not provided
  if (this.isNew && !this.validUntil) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    this.validUntil = thirtyDaysFromNow;
  }

  next();
});

/**
 * Pre-save Middleware: Auto-expire Quotations
 * 
 * @description
 * Automatically marks quotations as expired if validUntil date has passed
 * and status is still 'sent'.
 */
quotationSchema.pre('save', function (next) {
  if (this.status === 'sent' && this.validUntil < new Date()) {
    this.status = 'expired';
  }
  next();
});

/**
 * Static Property: Immutable Fields
 * Fields that cannot be updated after creation (audit trail protection)
 */
quotationSchema.statics.IMMUTABLE_FIELDS = [
  'quotationNumber',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated during quotation lifecycle
 */
quotationSchema.statics.EDITABLE_FIELDS = [
  'customer',
  'siteId',
  'equipment',
  'serviceType',
  'title',
  'description',
  'lineItems',
  'subtotal',
  'vatAmount',
  'totalAmount',
  'vatRate',
  'validUntil',
  'status',
  'sentDate',
  'approvedDate',
  'rejectedDate',
  'rejectionReason',
  'convertedToServiceCall',
  'convertedDate',
  'notes',
  'internalNotes',
  'terms'
];

const Quotation = mongoose.model('Quotation', quotationSchema);

export default Quotation;
