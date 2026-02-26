/**
 * @file ServiceCall.model.js
 * @description Mongoose schema for service call/work order records
 * @module Models/ServiceCall
 * 
 * Defines the data structure for service requests and work orders.
 * Tracks job lifecycle from creation through completion.
 */

import mongoose from 'mongoose';

/**
 * Service Call Schema Definition
 * 
 * @description
 * Represents a service request/work order in the field service system.
 * Tracks assignment, status, scheduling, and completion details.
 * 
 * Key Features:
 * - Auto-generated call number (SC-000001 format)
 * - Customer and agent references (relationships)
 * - Status workflow tracking
 * - Priority levels for scheduling
 * - Time tracking (estimated vs actual duration)
 */
const serviceCallSchema = new mongoose.Schema(
  {
    /** Unique service call number - Auto-generated, immutable */
    callNumber: {
      type: String,
      required: [true, 'Call number is required'],
      unique: true,
      trim: true,
      immutable: true, // Prevents modification of service call ID
    },
    /** Reference to Customer who requested the service */
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    /** Reference to FieldServiceAgent assigned to this call */
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldServiceAgent',
    },
    /** Brief title/summary of the service call */
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    /** Detailed description of the service request */
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    /** Priority level for scheduling and routing */
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    /** Current status in the service call lifecycle */
    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'on-hold', 'completed', 'cancelled'],
      default: 'open',
    },
    /** Type/category of service (e.g., 'Repair', 'Installation') */
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
      trim: true,
    },
    /** Scheduled date/time for the service call */
    scheduledDate: {
      type: Date,
    },
    /** Actual completion date/time */
    completedDate: {
      type: Date,
    },
    /** Estimated duration in minutes */
    estimatedDuration: {
      type: Number, // in minutes
    },
    /** Actual duration in minutes (for performance tracking) */
    actualDuration: {
      type: Number, // in minutes
    },
    /** Physical location where service will be performed */
    serviceLocation: {
      type: String,
      trim: true,
    },
    /** Customer-visible notes and updates */
    notes: {
      type: String,
      trim: true,
    },
    /** Internal notes for agents/staff only (not customer-visible) */
    internalNotes: {
      type: String,
      trim: true,
    },
    /** Reference to User who created this service call */
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
 * Pre-save Middleware: Auto-generate Call Number
 * 
 * @description
 * Automatically generates a unique call number in format SC-XXXXXX
 * if not provided. Uses sequential numbering based on existing count.
 * 
 * @fires serviceCallSchema#pre('save')
 * 
 * @example
 * // First call: SC-000001
 * // Second call: SC-000002
 */
serviceCallSchema.pre('save', async function (next) {
  // Only generate for new documents without a call number
  if (this.isNew && !this.callNumber) {
    const count = await mongoose.model('ServiceCall').countDocuments();
    // Format: SC-000001 (padded to 6 digits)
    this.callNumber = `SC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

/**
 * Static Property: Immutable Fields
 * Fields that cannot be updated after creation (audit trail protection)
 */
serviceCallSchema.statics.IMMUTABLE_FIELDS = [
  'callNumber',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated during service call lifecycle
 */
serviceCallSchema.statics.EDITABLE_FIELDS = [
  'customer',
  'assignedAgent',
  'title',
  'description',
  'priority',
  'status',
  'serviceType',
  'scheduledDate',
  'completedDate',
  'estimatedDuration',
  'actualDuration',
  'serviceLocation',
  'notes',
  'internalNotes'
];

const ServiceCall = mongoose.model('ServiceCall', serviceCallSchema);

export default ServiceCall;
