/**
 * @file Customer.model.js
 * @description Mongoose schema for customer/client records
 * @module Models/Customer
 * 
 * Defines the data structure for business customers who request services.
 * Captures business information, contact details, and account status.
 */

import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  streetAddress: {
    type: String,
    trim: true,
  },
  complexName: {
    type: String,
    trim: true,
  },
  siteAddressDetail: {
    type: String,
    trim: true,
  },
  suburb: {
    type: String,
    trim: true,
  },
  cityDistrict: {
    type: String,
    trim: true,
  },
  province: {
    type: String,
    trim: true,
  },
  postalCode: {
    type: String,
    trim: true,
  },
}, { _id: false });

/**
 * Site Sub-Schema (for Business Customers)
 * 
 * @description
 * Represents individual service locations for business customers.
 * Business customers can have multiple sites requiring service.
 */
const siteSchema = new mongoose.Schema({
  /** Site name/identifier (e.g., "Head Office", "Branch 2") */
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
  },
  /** Physical address of this site */
  address: {
    type: String,
    required: [true, 'Site address is required'],
    trim: true,
  },
  /** Structured physical address for this site */
  addressDetails: {
    type: addressSchema,
    default: () => ({}),
  },
  /** Site-specific contact person name */
  contactPerson: {
    type: String,
    trim: true,
  },
  /** Site-specific contact phone */
  contactPhone: {
    type: String,
    trim: true,
  },
  /** Site-specific contact email */
  contactEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  /** Service types offered at this site */
  serviceTypes: {
    type: [String],
    default: [],
  },
  /** Site status */
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  /** Additional notes about this site */
  notes: {
    type: String,
    trim: true,
  },
}, { _id: true }); // Enable _id for sites

/**
 * Customer Schema Definition
 * 
 * @description
 * Represents a customer/client in the field service system.
 * Supports both business customers (multiple sites) and residential customers (single site).
 * Includes business details, contact information, and account management.
 * 
 * Key Features:
 * - Customer type: business or residential
 * - Business customers: multiple sites with equipment per site
 * - Residential customers: single service address
 * - Immutable business name and customer ID (prevents fraud/confusion)
 * - Primary and alternate contact information
 * - Separate physical and billing addresses
 * - Account status tracking
 */
const customerSchema = new mongoose.Schema(
  {
    /** Customer type - Determines profile view, fields, and validation */
    customerType: {
      type: String,
      enum: ['headOffice', 'branch', 'franchise', 'singleBusiness', 'residential'],
      required: [true, 'Customer type is required'],
      default: 'singleBusiness',
    },
    /**
     * Parent account reference — used by branch and franchise customers.
     * Points to the headOffice customer record they belong to.
     */
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    /** Business/company name - Cannot be changed after creation */
    businessName: {
      type: String,
      required: function() {
        return ['headOffice', 'branch', 'franchise', 'singleBusiness'].includes(this.customerType);
      },
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
    /** Physical/service location address (for residential customers) */
    physicalAddress: {
      type: String,
      required: function() {
        return this.customerType === 'residential';
      },
      trim: true,
    },
    /** Structured physical address for both private and business customers */
    physicalAddressDetails: {
      type: addressSchema,
      default: () => ({}),
    },
    /** Billing address (if different from physical) */
    billingAddress: {
      type: String,
      trim: true,
    },
    /** Structured billing address */
    billingAddressDetails: {
      type: addressSchema,
      default: () => ({}),
    },
    /** VAT registration number for invoicing */
    vatNumber: {
      type: String,
      trim: true,
    },
    /** Tax number for business customers */
    taxNumber: {
      type: String,
      trim: true,
    },
    /** Company registration number (for business customers) */
    registrationNumber: {
      type: String,
      trim: true,
    },
    /** Multiple sites (for business customers only) */
    sites: {
      type: [siteSchema],
      default: [],
      validate: {
        validator: function(sites) {
          // Business customers must have at least one site
          if (['headOffice', 'branch', 'franchise', 'singleBusiness'].includes(this.customerType) && sites.length === 0) {
            return false;
          }
          return true;
        },
        message: 'Business customers must have at least one site',
      },
    },
    /** Maintenance manager (central contact for business customers) */
    maintenanceManager: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
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
    /** Linked login principal for this customer profile */
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      unique: true,
      sparse: true,
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
  'customerType',
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
  'physicalAddressDetails',
  'billingAddress',
  'billingAddressDetails',
  'vatNumber',
  'taxNumber',
  'registrationNumber',
  'sites',
  'maintenanceManager',
  'accountStatus',
  'notes'
];

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
