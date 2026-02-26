/**
 * @file FieldServiceAgent.model.js
 * @description Mongoose schema for field service agent records
 * @module Models/FieldServiceAgent
 * 
 * Defines the data structure for field technicians/agents who perform service calls.
 * Tracks agent information, skills, status, and assignment details.
 */

import mongoose from 'mongoose';

/**
 * Field Service Agent Schema Definition
 * 
 * @description
 * Represents a field service technician with job-related information.
 * Includes personal details, employment info, skills, and work status.
 * 
 * Key Features:
 * - Immutable name and employee ID (legal/HR requirements)
 * - Status tracking (active, inactive, on-leave)
 * - Skill set management for job assignment
 * - Vehicle and area assignment
 */
const fieldServiceAgentSchema = new mongoose.Schema(
  {
    /** Agent's first name - Cannot be changed after creation */
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      immutable: true, // Protected for HR/legal compliance
    },
    /** Agent's last name - Cannot be changed after creation */
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      immutable: true, // Protected for HR/legal compliance
    },
    /** Agent's email address for communication */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    /** Primary contact phone number */
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    /** Unique employee identifier - Cannot be changed */
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      immutable: true, // Protected HR identifier
    },
    /** Array of agent's skills/certifications (e.g., ['Plumbing', 'HVAC']) */
    skills: {
      type: [String],
      default: [],
    },
    /** Current employment status */
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave'],
      default: 'active',
    },
    /** Geographic area assigned to agent */
    assignedArea: {
      type: String,
      trim: true,
    },
    /** Vehicle registration/number assigned to agent */
    vehicleNumber: {
      type: String,
      trim: true,
    },
    /** Additional notes about the agent */
    notes: {
      type: String,
      trim: true,
    },
    /** Reference to User who created this agent record */
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
 * Static Property: Immutable Fields
 * Fields that cannot be updated after creation (HR/legal protection)
 */
fieldServiceAgentSchema.statics.IMMUTABLE_FIELDS = [
  'firstName',
  'lastName',
  'employeeId',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated by authorized users
 */
fieldServiceAgentSchema.statics.EDITABLE_FIELDS = [
  'email',
  'phoneNumber',
  'skills',
  'status',
  'assignedArea',
  'vehicleNumber',
  'notes'
];

const FieldServiceAgent = mongoose.model('FieldServiceAgent', fieldServiceAgentSchema);

export default FieldServiceAgent;
