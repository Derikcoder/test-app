/**
 * @file machine.controller.js
 * @description Machine/equipment management controller for service call linkage
 * @module Controllers/Machine
 *
 * Handles machine registry operations:
 * - Machine CRUD (Create, Read, Update, Delete)
 * - Agent's machine list (machines worked on)
 * - Machine service history retrieval
 * - Quotation auto-generation from history
 */

import Machine from '../models/Machine.model.js';
import MachineServiceHistory from '../models/MachineServiceHistory.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

/**
 * @desc    Get all machines for current agent
 * @route   GET /api/machines
 * @access  Private
 * @desc    Returns all machines this agent has worked on, sorted by service count (descending)
 */
export const getMachines = async (req, res) => {
  try {
    const machines = await Machine.find({ createdBy: req.user._id })
      .populate('lastServiceAgent', 'firstName lastName email')
      .sort({ serviceCount: -1, lastServicedAt: -1 });

    res.json(machines);
  } catch (error) {
    logError('Get machines error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get machines by service category
 * @route   GET /api/machines/category/:category
 * @access  Private
 * @desc    Returns machines filtered by service category (e.g., 'generator-backup-power', 'plumbing')
 */
export const getMachinesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const machines = await Machine.find({
      createdBy: req.user._id,
      serviceCategory: category,
    })
      .populate('lastServiceAgent', 'firstName lastName email')
      .sort({ serviceCount: -1 });

    res.json(machines);
  } catch (error) {
    logError('Get machines by category error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get single machine by ID with full service history
 * @route   GET /api/machines/:id
 * @access  Private
 */
export const getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    })
      .populate('lastServiceAgent', 'firstName lastName email');

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    res.json(machine);
  } catch (error) {
    logError('Get machine by ID error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get service history for a specific machine
 * @route   GET /api/machines/:id/service-history
 * @access  Private
 * @desc    Returns chronological list of all services performed on this machine
 */
export const getMachineServiceHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify machine belongs to current agent
    const machine = await Machine.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    const history = await MachineServiceHistory.find({ machineId: id })
      .populate('agentId', 'firstName lastName email')
      .populate('serviceCallId', 'callNumber status')
      .populate('quotationId', '_id')
      .sort({ servicedAt: -1 });

    res.json(history);
  } catch (error) {
    logError('Get machine service history error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create a new machine record
 * @route   POST /api/machines
 * @access  Private
 * @desc    Creates a new machine in the system. Used when agent first books a service for a new machine.
 */
export const createMachine = async (req, res) => {
  try {
    const {
      serviceCategory,
      machineType,
      generatorMakeModel,
      machineModelNumber,
      generatorCapacityKva,
      siteName,
      serialNumber,
      installationDate,
      customerId,
      notes,
    } = req.body;

    // Validate required fields
    if (!serviceCategory || !machineType) {
      return res.status(400).json({
        message: 'Service category and machine type are required',
      });
    }

    // Check for duplicate machine (same category + type + specs at same site)
    const existingMachine = await Machine.findOne({
      serviceCategory,
      machineType,
      generatorMakeModel: generatorMakeModel || '',
      machineModelNumber: machineModelNumber || '',
      siteName: siteName || '',
    });

    if (existingMachine) {
      return res.status(409).json({
        message: 'This machine is already registered in the system',
        machineId: existingMachine._id,
      });
    }

    const machine = await Machine.create({
      serviceCategory,
      machineType,
      generatorMakeModel,
      machineModelNumber,
      generatorCapacityKva,
      siteName,
      serialNumber,
      installationDate,
      customerId,
      notes,
      createdBy: req.user._id,
    });

    logInfo(`Machine created: ${machine._id} by ${req.user._id}`);

    res.status(201).json(machine);
  } catch (error) {
    logError('Create machine error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update machine details
 * @route   PUT /api/machines/:id
 * @access  Private
 */
export const updateMachine = async (req, res) => {
  try {
    const machine = await Machine.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'notes',
      'operatingHours',
      'customerId',
      'siteName',
      'serialNumber',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        machine[field] = req.body[field];
      }
    });

    await machine.save();

    logInfo(`Machine updated: ${machine._id}`);

    res.json(machine);
  } catch (error) {
    logError('Update machine error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a machine record
 * @route   DELETE /api/machines/:id
 * @access  Private
 * @desc    Soft delete (may want to implement actual soft delete for audit trail)
 */
export const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    logInfo(`Machine deleted: ${machine._id}`);

    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    logError('Delete machine error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Record a service performed on a machine
 * @route   POST /api/machines/:id/service-history
 * @access  Private
 * @desc    Called after service completion to record parts used, costs, issues, recommendations
 */
export const recordServiceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serviceCallId,
      serviceType,
      partsUsed,
      servicesPerformed,
      issuesFound,
      recommendations,
      machineCondition,
      labourHours,
      labourCost,
      totalServiceCost,
      quotationId,
      wasQuoted,
      notes,
    } = req.body;

    // Verify machine exists and belongs to agent
    const machine = await Machine.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Create service history record
    const history = await MachineServiceHistory.create({
      machineId: id,
      serviceCallId,
      agentId: req.user._id,
      serviceType,
      partsUsed,
      servicesPerformed,
      issuesFound,
      recommendations,
      machineCondition,
      labourHours,
      labourCost,
      totalServiceCost,
      quotationId,
      wasQuoted,
      notes,
      servicedAt: new Date(),
    });

    // Update machine aggregates
    machine.serviceCount += 1;
    machine.lastServicedAt = new Date();
    machine.lastServiceAgent = req.user._id;
    await machine.save();

    logInfo(`Service history recorded for machine ${id}`);

    res.status(201).json(history);
  } catch (error) {
    logError('Record service history error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Generate quotation data from last service on machine
 * @route   GET /api/machines/:id/quotation-template
 * @access  Private
 * @desc    Returns the last service history record to use as template for new quotation
 *          Allows agent to see what was charged last time and adjust as needed
 */
export const getQuotationTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify machine exists and belongs to agent
    const machine = await Machine.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Get most recent service
    const lastService = await MachineServiceHistory.findOne({
      machineId: id,
    })
      .sort({ servicedAt: -1 })
      .populate('agentId', 'firstName lastName');

    if (!lastService) {
      return res.status(404).json({
        message: 'No service history found for this machine',
      });
    }

    // Return template structured for quotation generation
    const template = {
      machineId: id,
      machine: {
        type: machine.machineType,
        make: machine.generatorMakeModel,
        model: machine.machineModelNumber,
        capacity: machine.generatorCapacityKva,
        site: machine.siteName,
      },
      lastService: {
        date: lastService.servicedAt,
        agent: lastService.agentId,
        serviceType: lastService.serviceType,
        labourHours: lastService.labourHours,
        labourCost: lastService.labourCost,
        partsUsed: lastService.partsUsed,
        totalCost: lastService.totalServiceCost,
      },
      suggestedCosts: {
        labour: lastService.labourCost,
        parts: lastService.partsUsed.reduce((sum, p) => sum + (p.totalCost || 0), 0),
      },
      note: 'Edit costs and parts based on current market conditions and availability',
    };

    res.json(template);
  } catch (error) {
    logError('Get quotation template error:', error);
    res.status(500).json({ message: error.message });
  }
};
