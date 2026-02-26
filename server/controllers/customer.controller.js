import Customer from '../models/Customer.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    logError('Get customers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    logError('Get customer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = async (req, res) => {
  try {
    const {
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phoneNumber,
      alternatePhone,
      customerId,
      physicalAddress,
      billingAddress,
      vatNumber,
      accountStatus,
      notes
    } = req.body;

    // Validate required fields
    if (!businessName || !contactFirstName || !contactLastName || !email || !phoneNumber || !customerId || !physicalAddress) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if customerId already exists
    const customerExists = await Customer.findOne({ customerId });

    if (customerExists) {
      return res.status(400).json({ message: 'Customer ID already exists' });
    }

    const customer = await Customer.create({
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phoneNumber,
      alternatePhone,
      customerId,
      physicalAddress,
      billingAddress,
      vatNumber,
      accountStatus,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Customer created: ${customer.businessName} (${customer.customerId})`);
    res.status(201).json(customer);
  } catch (error) {
    logError('Create customer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = Customer.IMMUTABLE_FIELDS.filter(
      field => req.body[field] !== undefined && req.body[field] !== customer[field]
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates
      });
    }

    // Update editable fields
    Customer.EDITABLE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    const updatedCustomer = await customer.save();
    logInfo(`✅ Customer updated: ${updatedCustomer.customerId}`);
    res.json(updatedCustomer);
  } catch (error) {
    logError('Update customer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();
    logInfo(`✅ Customer deleted: ${customer.customerId}`);
    res.json({ message: 'Customer removed successfully' });
  } catch (error) {
    logError('Delete customer error:', error);
    res.status(500).json({ message: error.message });
  }
};
