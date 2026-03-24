/**
 * @file OnboardingPasskey.model.js
 * @description One-time onboarding passkey model for delegated role registration
 * @module Models/OnboardingPasskey
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const onboardingPasskeySchema = new mongoose.Schema(
  {
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
    passkeyHash: {
      type: String,
      required: [true, 'Passkey hash is required'],
    },
    issuedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry time is required'],
      index: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'expired', 'revoked'],
      default: 'active',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

onboardingPasskeySchema.methods.comparePasskey = async function comparePasskey(enteredPasskey) {
  return bcrypt.compare(enteredPasskey, this.passkeyHash);
};

const OnboardingPasskey = mongoose.model('OnboardingPasskey', onboardingPasskeySchema);

export default OnboardingPasskey;
