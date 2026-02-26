/**
 * @file Equipment.model.js
 * @description Mongoose schema for customer equipment/asset records
 * @module Models/Equipment
 * 
 * Defines the data structure for equipment/assets that require maintenance.
 * Tracks equipment details, warranty, service history, and location.
 */

import mongoose from 'mongoose';

/**
 * Equipment Schema Definition
 * 
 * @description
 * Represents equipment/assets owned by customers that require service/maintenance.
 * Links to customers and sites, tracks service history and warranty.
 * 
 * Key Features:
 * - Auto-generated equipment ID (EQ-XXXXXX format)
 * - Service type categorization (HVAC, Electrical, Plumbing, etc.)
 * - Warranty and maintenance tracking
 * - Service history references
 * - Multi-site support for business customers
 */
const equipmentSchema = new mongoose.Schema(
  {
    /** Unique equipment identifier - Auto-generated, immutable */
    equipmentId: {
      type: String,
      required: [true, 'Equipment ID is required'],
      unique: true,
      trim: true,
      immutable: true, // Prevents modification of equipment ID
    },
    /** Reference to Customer who owns this equipment */
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    /** Reference to specific site (for business customers with multiple sites) */
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      trim: true,
    },
    /** Equipment type/category */
    equipmentType: {
      type: String,
      required: [true, 'Equipment type is required'],
      enum: [
        // HVAC/Refrigeration
        'Cold Room',
        'Freezer',
        'AC Unit',
        'Deep Fryer',
        'Ice Machine',
        'Display Cooler',
        'Walk-in Freezer',
        // Electrical
        'Generator',
        'Distribution Board',
        'Emergency Power System',
        'UPS',
        'Solar System',
        // Plumbing
        'Hot Water System',
        'Geyser',
        'Boiler',
        'Water Heater',
        'Pump',
        // General
        'Welding Equipment',
        'Compressor',
        'Other',
      ],
      trim: true,
    },
    /** Custom equipment type (if 'Other' is selected) */
    customType: {
      type: String,
      trim: true,
    },
    /** Manufacturer/brand name */
    brand: {
      type: String,
      trim: true,
    },
    /** Equipment model number/name */
    model: {
      type: String,
      trim: true,
    },
    /** Manufacturer's serial number */
    serialNumber: {
      type: String,
      trim: true,
    },
    /** Date equipment was installed */
    installationDate: {
      type: Date,
    },
    /** Warranty expiration date */
    warrantyExpiry: {
      type: Date,
    },
    /** Date of last service/maintenance */
    lastServiceDate: {
      type: Date,
    },
    /** Next scheduled maintenance date */
    nextServiceDate: {
      type: Date,
    },
    /** Current operational status */
    status: {
      type: String,
      enum: ['operational', 'needs-service', 'under-repair', 'out-of-order', 'decommissioned'],
      default: 'operational',
    },
    /** Equipment location details (building, room, etc.) */
    location: {
      type: String,
      trim: true,
    },
    /** Service history - references to ServiceCall documents */
    serviceHistory: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCall',
    }],
    /** Additional notes about the equipment */
    notes: {
      type: String,
      trim: true,
    },
    /** Reference to User who registered this equipment */
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
 * Pre-save Middleware: Auto-generate Equipment ID
 * 
 * @description
 * Automatically generates a unique equipment ID in format EQ-XXXXXX
 * if not provided. Uses sequential numbering based on existing count.
 * 
 * @fires equipmentSchema#pre('save')
 * 
 * @example
 * // First equipment: EQ-000001
 * // Second equipment: EQ-000002
 */
equipmentSchema.pre('save', async function (next) {
  // Only generate for new documents without an equipment ID
  if (this.isNew && !this.equipmentId) {
    const count = await mongoose.model('Equipment').countDocuments();
    // Format: EQ-000001 (padded to 6 digits)
    this.equipmentId = `EQ-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

/**
 * Static Property: Immutable Fields
 * Fields that cannot be updated after creation (equipment identity protection)
 */
equipmentSchema.statics.IMMUTABLE_FIELDS = [
  'equipmentId',
  'createdAt',
  '_id',
  'createdBy'
];

/**
 * Static Property: Editable Fields
 * Fields that can be safely updated by authorized users
 */
equipmentSchema.statics.EDITABLE_FIELDS = [
  'customer',
  'siteId',
  'equipmentType',
  'customType',
  'brand',
  'model',
  'serialNumber',
  'installationDate',
  'warrantyExpiry',
  'lastServiceDate',
  'nextServiceDate',
  'status',
  'location',
  'serviceHistory',
  'notes'
];

const Equipment = mongoose.model('Equipment', equipmentSchema);

export default Equipment;
