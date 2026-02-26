/**
 * @file Customer.model.js
 * @description Mongoose schema for customer/client records
 * @module Models/Customer
 * 
 * Defines the data structure for business customers who request services.
 * Captures business information, contact details, and account status.
 */

import mongoose from 'mongoose';

/**
 * Customer Schema Definition
 * 
 * @description
 * Represents a business customer/client in the field service system.
 * Includes business details, contact information, and account management.
 * 
 * Key Features:
 * - Immutable business name and customer ID (prevents fraud/confusion)
 * - Primary and alternate contact information
 * - Separate physical and billing addresses
 * - Account status tracking
 */
const customerSchema = new mongoose.Schema(
  {
    /** Business/company name - Cannot be changed after creation */
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      immutable: true, // Protects business identity
    },
    /** Primary contact person's first name */
    contactFirstName: {
      type: String,
      required: [true, 'Contact first name is required'],
      trim: true,
    },
    /** Primary contact person's last name */
    contactLastName: {
      type: String,
      required: [true, 'Contact last name is required'],
      trim: true,
    },
    /** Primary email for communication */
    email: {
      type: String,
      required: [true, 'Email is required'],
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
    /** Alternative/secondary phone number */
    alternatePhone: {
      type: String,
      trim: true,
    },
    /** Unique customer identifier - Cannot be changed */
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      trim: true,
      immutable: true, // Protects customer identity in accounting
    },
    /** Physical/service location address */
    physicalAddress: {
      type: String,
      required: [true, 'Physical address is required'],
      trim: true,
    },
    /** Billing address (if different from physical) */
    billingAddress: {
      type: String,
      trim: true,
    },
    /** VAT registration number for invoicing */
    vatNumber: {
      type: String,
      trim: true,
    },
    /** Current account status */
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    /** Additional notes about the customer */
    notes: {
      type: String,
      trim: true,
    },
    /** Reference to User who created this customer record */
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
 * Fields that cannot be updated after creation (business identity protection)
 */
customerSchema.statics.IMMUTABLE_FIELDS = [
  'businessName',
  'customerId',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated by authorized users
 */
customerSchema.statics.EDITABLE_FIELDS = [
  'contactFirstName',
  'contactLastName',
  'email',
  'phoneNumber',
  'alternatePhone',
  'physicalAddress',
  'billingAddress',
  'vatNumber',
  'accountStatus',
  'notes'
];

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
