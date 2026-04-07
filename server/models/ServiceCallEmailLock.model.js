/**
 * @file ServiceCallEmailLock.model.js
 * @description Tracks customer emails that have an active (sent/approved) quotation.
 * Prevents duplicate service calls being created for the same prospect before
 * their current quotation is resolved (accepted + converted, rejected, or expired).
 *
 * Lifecycle:
 *  - Created/refreshed when a quotation is SENT to a customer
 *  - Removed when the quotation becomes: converted | rejected | expired (+ admin flush)
 *  - TTL index auto-removes stale locks after 90 days
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const ServiceCallEmailLockSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    quotationId: {
      type: Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
    },
    quotationNumber: {
      type: String,
      required: true,
    },
    /** TTL anchor — MongoDB auto-deletes document 90 days after this date */
    lockedAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 90, // 90 days in seconds
    },
  },
  { timestamps: false }
);

const ServiceCallEmailLock = mongoose.model(
  'ServiceCallEmailLock',
  ServiceCallEmailLockSchema
);

export default ServiceCallEmailLock;
