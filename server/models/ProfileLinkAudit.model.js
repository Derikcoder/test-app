/**
 * @file ProfileLinkAudit.model.js
 * @description Audit log for admin-managed user-profile link operations
 * @module Models/ProfileLinkAudit
 */

import mongoose from 'mongoose';

const profileLinkAuditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['attach', 'detach', 'reassign'],
      required: true,
      index: true,
    },
    profileType: {
      type: String,
      enum: ['fieldServiceAgent', 'customer'],
      required: true,
      index: true,
    },
    principalUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    previousProfile: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: 'profileRefModel',
    },
    newProfile: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: 'profileRefModel',
    },
    profileRefModel: {
      type: String,
      enum: ['FieldServiceAgent', 'Customer'],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ProfileLinkAudit = mongoose.model('ProfileLinkAudit', profileLinkAuditSchema);

export default ProfileLinkAudit;
