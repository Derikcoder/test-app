/**
 * @file PasskeyRenewalRequest.model.js
 * @description Tracks passkey regeneration requests for delegated role onboarding
 * @module Models/PasskeyRenewalRequest
 */

import mongoose from 'mongoose';

const passkeyRenewalRequestSchema = new mongoose.Schema(
  {
    requestTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    targetEmail: {
      type: String,
      required: [true, 'Target email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    targetRole: {
      type: String,
      enum: ['businessAdministrator', 'fieldServiceAgent'],
      required: [true, 'Target role is required'],
      index: true,
    },
    requestedByIp: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'expired', 'rejected'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    processedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PasskeyRenewalRequest = mongoose.model('PasskeyRenewalRequest', passkeyRenewalRequestSchema);

export default PasskeyRenewalRequest;
