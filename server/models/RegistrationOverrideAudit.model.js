/**
 * @file RegistrationOverrideAudit.model.js
 * @description Immutable legal audit log for superAdmin registration identifier overrides
 * @module Models/RegistrationOverrideAudit
 */

import mongoose from 'mongoose';

const legalEvidenceSnapshotSchema = new mongoose.Schema(
  {
    legalDocumentType: {
      type: String,
      required: true,
      trim: true,
    },
    legalDocumentReference: {
      type: String,
      required: true,
      trim: true,
    },
    legalDocumentUri: {
      type: String,
      required: true,
      trim: true,
    },
    legalChangeReason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const registrationOverrideAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['registrationIdentifierOverride'],
      required: true,
      default: 'registrationIdentifierOverride',
      immutable: true,
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    actingSuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    overriddenFields: {
      type: [String],
      required: true,
      immutable: true,
      default: [],
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      immutable: true,
      default: {},
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      immutable: true,
      default: {},
    },
    legalEvidenceSnapshot: {
      type: legalEvidenceSnapshotSchema,
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

registrationOverrideAuditSchema.pre('save', function blockAuditMutation(next) {
  if (!this.isNew) {
    return next(new Error('RegistrationOverrideAudit records are immutable'));
  }
  return next();
});

const RegistrationOverrideAudit = mongoose.model('RegistrationOverrideAudit', registrationOverrideAuditSchema);

export default RegistrationOverrideAudit;
