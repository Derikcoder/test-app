import Equipment from '../models/Equipment.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

/**
 * @file equipment.controller.js
 * @description Equipment management controller for CRUD operations
 * @module Controllers/Equipment
 * 
 * Handles all equipment registry operations including:
 * - Equipment CRUD (Create, Read, Update, Delete)
 * - Equipment lookup by customer/site
 * - Service history retrieval
 * - Warranty status tracking
 */

// @desc    Get all equipment
// @route   GET /api/equipment
// @access  Private
export const getEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.find({ createdBy: req.user._id })
      .populate('customer', 'businessName contactFirstName contactLastName customerId customerType')
      .sort({ createdAt: -1 });
    res.json(equipment);
  } catch (error) {
    logError('Get equipment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get equipment by customer
// @route   GET /api/equipment/customer/:customerId
// @access  Private
export const getEquipmentByCustomer = async (req, res) => {
  try {
    const equipment = await Equipment.find({
      customer: req.params.customerId,
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
      .sort({ createdAt: -1 });
    
    res.json(equipment);
  } catch (error) {
    logError('Get equipment by customer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get equipment by site
// @route   GET /api/equipment/site/:customerId/:siteId
// @access  Private
export const getEquipmentBySite = async (req, res) => {
  try {
    const { customerId, siteId } = req.params;
    
    const equipment = await Equipment.find({
      customer: customerId,
      siteId: siteId,
      createdBy: req.user._id
    })
      .populate('customer', 'businessName contactFirstName contactLastName customerId')
      .sort({ createdAt: -1 });
    
    res.json(equipment);
  } catch (error) {
    logError('Get equipment by site error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single equipment by ID
// @route   GET /api/equipment/:id
// @access  Private
export const getEquipmentById = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    })
      .populate('customer')
      .populate('serviceHistory');

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    logError('Get equipment by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private
export const createEquipment = async (req, res) => {
  try {
    const {
      customer,
      siteId,
      equipmentType,
      customType,
      brand,
      model,
      serialNumber,
      installationDate,
      warrantyExpiry,
      lastServiceDate,
      nextServiceDate,
      status,
      location,
      notes
    } = req.body;

    // Validate required fields
    if (!customer || !equipmentType) {
      return res.status(400).json({ message: 'Customer and equipment type are required' });
    }

    // Validate customType if equipmentType is 'Other'
    if (equipmentType === 'Other' && !customType) {
      return res.status(400).json({ message: 'Custom type is required when equipment type is "Other"' });
    }

    const equipment = await Equipment.create({
      customer,
      siteId,
      equipmentType,
      customType,
      brand,
      model,
      serialNumber,
      installationDate,
      warrantyExpiry,
      lastServiceDate,
      nextServiceDate,
      status,
      location,
      notes,
      createdBy: req.user._id
    });

    // Populate customer details
    await equipment.populate('customer', 'businessName contactFirstName contactLastName');

    logInfo(`✅ Equipment created: ${equipment.equipmentId} (${equipment.equipmentType})`);
    res.status(201).json(equipment);
  } catch (error) {
    logError('Create equipment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update equipment
// @route   PUT /api/equipment/:id
// @access  Private
export const updateEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = Equipment.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && String(req.body[field]) !== String(equipment[field])
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Update editable fields
    Equipment.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        equipment[field] = req.body[field];
      }
    });

    const updatedEquipment = await equipment.save();
    await updatedEquipment.populate('customer', 'businessName contactFirstName contactLastName');

    logInfo(`✅ Equipment updated: ${updatedEquipment.equipmentId}`);
    res.json(updatedEquipment);
  } catch (error) {
    logError('Update equipment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private
export const deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if equipment has service history
    if (equipment.serviceHistory && equipment.serviceHistory.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete equipment with service history. Consider marking it as decommissioned instead.',
        serviceHistoryCount: equipment.serviceHistory.length
      });
    }

    await equipment.deleteOne();
    logInfo(`✅ Equipment deleted: ${equipment.equipmentId}`);
    res.json({ message: 'Equipment removed successfully' });
  } catch (error) {
    logError('Delete equipment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get equipment service history
// @route   GET /api/equipment/:id/service-history
// @access  Private
export const getEquipmentServiceHistory = async (req, res) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).populate({
      path: 'serviceHistory',
      populate: [
        { path: 'assignedAgent', select: 'firstName lastName employeeId' },
        { path: 'customer', select: 'businessName contactFirstName contactLastName' }
      ]
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({
      equipmentId: equipment.equipmentId,
      equipmentType: equipment.equipmentType,
      brand: equipment.brand,
      model: equipment.model,
      serviceHistory: equipment.serviceHistory || []
    });
  } catch (error) {
    logError('Get equipment service history error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get equipment warranty status
// @route   GET /api/equipment/warranty-status
// @access  Private
export const getEquipmentWarrantyStatus = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Find all equipment created by user
    const allEquipment = await Equipment.find({ createdBy: req.user._id })
      .populate('customer', 'businessName contactFirstName contactLastName customerId');

    // Categorize by warranty status
    const underWarranty = allEquipment.filter(eq => 
      eq.warrantyExpiry && new Date(eq.warrantyExpiry) > now
    );

    const expiringSoon = allEquipment.filter(eq => 
      eq.warrantyExpiry && 
      new Date(eq.warrantyExpiry) > now && 
      new Date(eq.warrantyExpiry) <= thirtyDaysFromNow
    );

    const expired = allEquipment.filter(eq => 
      eq.warrantyExpiry && new Date(eq.warrantyExpiry) <= now
    );

    const noWarranty = allEquipment.filter(eq => !eq.warrantyExpiry);

    res.json({
      summary: {
        total: allEquipment.length,
        underWarranty: underWarranty.length,
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        noWarranty: noWarranty.length
      },
      expiringSoon: expiringSoon.map(eq => ({
        equipmentId: eq.equipmentId,
        equipmentType: eq.equipmentType,
        brand: eq.brand,
        model: eq.model,
        warrantyExpiry: eq.warrantyExpiry,
        customer: eq.customer
      })),
      expired: expired.map(eq => ({
        equipmentId: eq.equipmentId,
        equipmentType: eq.equipmentType,
        brand: eq.brand,
        model: eq.model,
        warrantyExpiry: eq.warrantyExpiry,
        customer: eq.customer
      }))
    });
  } catch (error) {
    logError('Get equipment warranty status error:', error);
    res.status(500).json({ message: error.message });
  }
};
