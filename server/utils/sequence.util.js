/**
 * @file sequence.util.js
 * @description Helpers for generating sequential identifiers.
 * @module Utils/Sequence
 */

import SequenceCounter from '../models/SequenceCounter.model.js';

/**
 * Atomically increments and returns the next value for a named sequence.
 *
 * @param {string} sequenceName - Unique sequence key.
 * @returns {Promise<number>} Next sequence value.
 */
export const getNextSequenceValue = async (sequenceName) => {
  const counter = await SequenceCounter.findOneAndUpdate(
    { sequenceName },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return counter.value;
};

/**
 * Formats a numeric sequence value into a prefixed identifier.
 *
 * @param {string} prefix - Identifier prefix (for example: AGT, CUST).
 * @param {number} sequenceValue - Numeric value from a sequence.
 * @param {number} [width=6] - Zero-pad width.
 * @returns {string} Formatted identifier.
 */
export const formatSequenceId = (prefix, sequenceValue, width = 6) => {
  return `${prefix}-${String(sequenceValue).padStart(width, '0')}`;
};
