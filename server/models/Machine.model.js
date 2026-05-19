/**
 * @file Machine.model.js
 * @description Mongoose schema for machines/equipment tracked by service agents
 * @module Models/Machine
 *
 * Defines the data structure for machines that field service agents work on.
 * Captures machine details, service history metadata, and agent relationships.
 */

import mongoose from 'mongoose';

/**
 * Machine Schema
 *
 * @description
 * Represents a physical machine/equipment that requires service.
 * Links to field agents who service it and tracks service frequency.
 *
 * Key Features:
 * - Category-specific machine types (generator, solar inverter, etc.)
 * - Service history aggregation (count, last service date)
 * - Agent relationship (who discovered/registered this machine)
 * - Equipment specifications capture for future reuse
 * - Prevents duplicate machine entries with compound unique index
 */
const machineSchema = new mongoose.Schema(
  {
    /** Service category (e.g., 'generator-backup-power', 'plumbing', 'electrical') */
    serviceCategory: {
      type: String,
      required: [true, 'Service category is required'],
      trim: true,
      index: true,
    },

    /** Machine type within category (e.g., 'diesel-generator', 'solar-inverter') */
    machineType: {
      type: String,
      required: [true, 'Machine type is required'],
      trim: true,
      index: true,
    },

    /** Equipment make/brand/series (e.g., 'Perkins 1104', 'Growatt inverter') */
    generatorMakeModel: {
      type: String,
      trim: true,
    },

    /** Equipment model number for specific identification */
    machineModelNumber: {
      type: String,
      trim: true,
    },

    /** Equipment capacity in kVA (for generators, UPS, solar systems) */
    generatorCapacityKva: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
    },

    /** Site/location name where machine is installed */
    siteName: {
      type: String,
      trim: true,
    },

    /** Serial number (if available) - helps with future identification */
    serialNumber: {
      type: String,
      trim: true,
      sparse: true,
    },

    /** Installation date (when machine was installed; N/A if unknown or not installer)
     * Optional because:
     * - May not be the original installer
     * - Tenant may not know (e.g., geyser that came with property)
     * - Equipment purchased used without known install date
     */
    installationDate: {
      type: Date,
      default: null,
    },

    /** Age/hours of operation (useful for maintenance planning; null if unknown) */
    operatingHours: {
      type: Number,
      min: 0,
      default: null,
    },

    /** Agent who first registered/discovered this machine */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Aggregate: total number of service calls for this machine */
    serviceCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Aggregate: last date this machine was serviced */
    lastServicedAt: {
      type: Date,
    },

    /** Aggregate: last agent who serviced this machine */
    lastServiceAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    /** Associated customers (machines may be at customer sites) */
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      sparse: true,
    },

    /** Notes from agent (condition, quirks, maintenance notes) */
    notes: {
      type: String,
      trim: true,
    },

    /** Timestamps */
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound unique index: prevent duplicate machines for same category+type+specs
 * Allows identifying same physical machine even if registered by different agents
 */
machineSchema.index(
  {
    serviceCategory: 1,
    machineType: 1,
    generatorMakeModel: 1,
    machineModelNumber: 1,
    siteName: 1,
  },
  {
    unique: true,
    sparse: true, // Ignore null values in unique constraint
  }
);

/**
 * Index for agent's machine list (common query: "show me all machines I've worked on")
 */
machineSchema.index({ createdBy: 1, serviceCount: -1 });

/**
 * Index for customer's machines
 */
machineSchema.index({ customerId: 1 });

const Machine = mongoose.model('Machine', machineSchema);

export default Machine;
