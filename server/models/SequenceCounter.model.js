/**
 * @file SequenceCounter.model.js
 * @description Atomic counters for sequential identifier generation.
 * @module Models/SequenceCounter
 */

import mongoose from 'mongoose';

const sequenceCounterSchema = new mongoose.Schema(
  {
    /** Unique sequence name (for example: "agent_employee_id") */
    sequenceName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    /** Current numeric value of this sequence */
    value: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SequenceCounter = mongoose.model('SequenceCounter', sequenceCounterSchema);

export default SequenceCounter;
