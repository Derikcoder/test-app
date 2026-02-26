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
      customerType,
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phoneNumber,
      alternatePhone,
      customerId,
      physicalAddress,
      billingAddress,
      taxNumber,
      registrationNumber,
      vatNumber,
      sites,
      maintenanceManager,
      accountStatus,
      notes
    } = req.body;

    // Validate required fields
    if (!customerType || !contactFirstName || !contactLastName || !email || !phoneNumber || !customerId) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Validate customer type specific requirements
    if (customerType === 'business') {
      if (!businessName) {
        return res.status(400).json({ message: 'Business name is required for business customers' });
      }
      if (!sites || sites.length === 0) {
        return res.status(400).json({ message: 'At least one site is required for business customers' });
      }
    } else if (customerType === 'residential') {
      if (!physicalAddress) {
        return res.status(400).json({ message: 'Physical address is required for residential customers' });
      }
    }

    // Check if customerId already exists
    const customerExists = await Customer.findOne({ customerId });

    if (customerExists) {
      return res.status(400).json({ message: 'Customer ID already exists' });
    }

    const customer = await Customer.create({
      customerType,
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phoneNumber,
      alternatePhone,
      customerId,
      physicalAddress,
      billingAddress,
      taxNumber,
      registrationNumber,
      vatNumber,
      sites,
      maintenanceManager,
      accountStatus,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Customer created: ${customer.customerType === 'business' ? customer.businessName : `${customer.contactFirstName} ${customer.contactLastName}`} (${customer.customerId})`);
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

// @desc    Get customer sites
// @route   GET /api/customers/:id/sites
// @access  Private
export const getCustomerSites = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.customerType !== 'business') {
      return res.status(400).json({ message: 'Only business customers have multiple sites' });
    }

    res.json(customer.sites || []);
  } catch (error) {
    logError('Get customer sites error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add site to business customer
// @route   POST /api/customers/:id/sites
// @access  Private
export const addCustomerSite = async (req, res) => {
  try {
    const {
      siteName,
      address,
      contactPerson,
      contactPhone,
      contactEmail,
      serviceTypes,
      status,
      notes
    } = req.body;

    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.customerType !== 'business') {
      return res.status(400).json({ message: 'Only business customers can have multiple sites' });
    }

    // Validate required fields
    if (!siteName || !address) {
      return res.status(400).json({ message: 'Site name and address are required' });
    }

    // Add new site
    customer.sites.push({
      siteName,
      address,
      contactPerson,
      contactPhone,
      contactEmail,
      serviceTypes,
      status,
      notes
    });

    const updatedCustomer = await customer.save();
    const newSite = updatedCustomer.sites[updatedCustomer.sites.length - 1];
    
    logInfo(`✅ Site added to customer ${customer.customerId}: ${siteName}`);
    res.status(201).json(newSite);
  } catch (error) {
    logError('Add customer site error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer site
// @route   PUT /api/customers/:id/sites/:siteId
// @access  Private
export const updateCustomerSite = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.customerType !== 'business') {
      return res.status(400).json({ message: 'Only business customers have multiple sites' });
    }

    const site = customer.sites.id(req.params.siteId);

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Update site fields
    const updateableFields = ['siteName', 'address', 'contactPerson', 'contactPhone', 'contactEmail', 'serviceTypes', 'status', 'notes'];
    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        site[field] = req.body[field];
      }
    });

    const updatedCustomer = await customer.save();
    logInfo(`✅ Site updated for customer ${customer.customerId}: ${site.siteName}`);
    res.json(site);
  } catch (error) {
    logError('Update customer site error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete customer site
// @route   DELETE /api/customers/:id/sites/:siteId
// @access  Private
export const deleteCustomerSite = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.customerType !== 'business') {
      return res.status(400).json({ message: 'Only business customers have multiple sites' });
    }

    // Check if this is the last site
    if (customer.sites.length === 1) {
      return res.status(409).json({ 
        message: 'Cannot delete the last site. Business customers must have at least one site.' 
      });
    }

    const site = customer.sites.id(req.params.siteId);

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const siteName = site.siteName;
    site.deleteOne();
    
    await customer.save();
    logInfo(`✅ Site deleted from customer ${customer.customerId}: ${siteName}`);
    res.json({ message: 'Site removed successfully' });
  } catch (error) {
    logError('Delete customer site error:', error);
    res.status(500).json({ message: error.message });
  }
};
