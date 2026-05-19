/**
 * @file MachineServiceHistory.model.js
 * @description Mongoose schema for detailed service history of machines
 * @module Models/MachineServiceHistory
 *
 * Tracks each service event: what parts were used, costs, variations, and outcomes.
 * Enables smart quotation generation and cost tracking across time and regions.
 */

import mongoose from 'mongoose';

/**
 * Parts/Components used in a service
 * Captures real-world variations: brands, costs, availability, supplier details
 * Supports price tracking via Google Search results updater function
 */
const partUsedSchema = new mongoose.Schema(
  {
    /** Supplier part number (for reordering) */
    supplierPartNumber: {
      type: String,
      trim: true,
    },

    /** Part type/classification (e.g., 'filter', 'oil', 'spark-plug', 'bearing') */
    type: {
      type: String,
      trim: true,
    },

    /** Part category (e.g., 'filter', 'oil', 'spark-plug', 'bearing') */
    category: {
      type: String,
      trim: true,
    },

    /** Manufacturer brand */
    brand: {
      type: String,
      trim: true,
    },

    /** Part description/name */
    description: {
      type: String,
      trim: true,
    },

    /** Preferred brand/model (usually-ordered brand) */
    preferredBrand: {
      type: String,
      trim: true,
    },

    /** Actual brand used (may differ due to availability) */
    actualBrand: {
      type: String,
      trim: true,
    },

    /** Model/specification number */
    model: {
      type: String,
      trim: true,
    },

    /** Quantity used */
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    /** Unit cost (at time of service) */
    unitCost: {
      type: Number,
      min: 0,
    },

    /** Latest market price (updated by price sync function) */
    latestPrice: {
      type: Number,
      min: 0,
    },

    /** When latestPrice was last updated */
    lastPriceUpdateAt: {
      type: Date,
    },

    /** Currency code (ZAR, USD, etc.) */
    currency: {
      type: String,
      default: 'ZAR',
      trim: true,
    },

    /** Total cost for this part (quantity * unitCost at time of service) */
    totalCost: {
      type: Number,
      min: 0,
    },

    /** Availability note (e.g., 'not available', 'generic substitute', 'regional shortage') */
    availabilityNote: {
      type: String,
      trim: true,
    },

    /** Quality assessment (e.g., 'OEM', 'compatible', 'alternative') */
    qualityAssessment: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Machine Service History Schema
 *
 * @description
 * Records each service event on a machine.
 * Used to:
 * - Show service history to agents
 * - Generate quotations based on past services
 * - Track cost variations over time/region
 * - Capture maintenance patterns and issues
 */
const machineServiceHistorySchema = new mongoose.Schema(
  {
    /** Reference to the machine */
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: true,
      index: true,
    },

    /** Reference to the service call that generated this history */
    serviceCallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCall',
      required: true,
      index: true,
    },

    /** Agent who performed/supervised the service */
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Service type performed (e.g., 'preventive maintenance', 'emergency repair') */
    serviceType: {
      type: String,
      trim: true,
    },

    /** Array of parts/components used in this service */
    partsUsed: [partUsedSchema],

    /** Description of services performed */
    servicesPerformed: {
      type: String,
      trim: true,
    },

    /** Issues found during service */
    issuesFound: {
      type: String,
      trim: true,
    },

    /** Recommended maintenance or upgrades */
    recommendations: {
      type: String,
      trim: true,
    },

    /** Operating hours/condition at time of service */
    machineCondition: {
      type: String,
      trim: true,
    },

    /** Total labour hours spent */
    labourHours: {
      type: Number,
      min: 0,
    },

    /** Labour cost (hourly rate * hours) */
    labourCost: {
      type: Number,
      min: 0,
    },

    /** Total cost of this service (parts + labour + extras) */
    totalServiceCost: {
      type: Number,
      min: 0,
    },

    /** Quotation that was generated for this service */
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      sparse: true,
    },

    /** Whether this service was quoted before execution */
    wasQuoted: {
      type: Boolean,
      default: false,
    },

    /** Date service was performed */
    servicedAt: {
      type: Date,
      required: true,
      index: true,
    },

    /** Notes/observations */
    notes: {
      type: String,
      trim: true,
    },

    /** Timestamps */
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for efficient queries
 */
machineServiceHistorySchema.index({ machineId: 1, servicedAt: -1 });
machineServiceHistorySchema.index({ agentId: 1, servicedAt: -1 });
machineServiceHistorySchema.index({ machineId: 1, agentId: 1 });

const MachineServiceHistory = mongoose.model('MachineServiceHistory', machineServiceHistorySchema);

export default MachineServiceHistory;
