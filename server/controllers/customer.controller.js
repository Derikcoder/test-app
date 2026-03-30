import Customer from '../models/Customer.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';

const BUSINESS_CUSTOMER_TYPES = ['headOffice', 'branch', 'franchise', 'singleBusiness'];

const isBusinessCustomerType = (customerType) => BUSINESS_CUSTOMER_TYPES.includes(customerType);

/**
 * Validates hub-branch relationship rules
 * - headOffice must have exactly one site with isDepot: true
 * - branch/franchise/singleBusiness must NOT have sites with isDepot: true
 * - branch/franchise must have a valid parentAccount pointing to a headOffice
 */
const validateHubBranchStructure = async (customerType, sites, parentAccountId) => {
  // Validate depot sites
  if (customerType === 'headOffice') {
    const depotSites = sites.filter(s => s.isDepot === true);
    if (depotSites.length !== 1) {
      throw new Error('Head Office must have exactly one depot (hub) site');
    }
  } else if (['branch', 'franchise', 'singleBusiness'].includes(customerType)) {
    const depotSites = sites.filter(s => s.isDepot === true);
    if (depotSites.length > 0) {
      throw new Error(`${customerType} customers cannot have depot sites`);
    }
  }

  // Validate parent account for branches/franchises
  if (['branch', 'franchise'].includes(customerType)) {
    if (!parentAccountId) {
      throw new Error(`${customerType} must have a parent account (headOffice)`);
    }

    const parentAccount = await Customer.findById(parentAccountId);
    if (!parentAccount) {
      throw new Error('Parent account not found');
    }

    if (parentAccount.customerType !== 'headOffice') {
      throw new Error('Parent account must be a Head Office');
    }
  }
};

const formatAddress = (address = {}) => {
  if (!address || typeof address !== 'object') return '';

  return [
    address.streetAddress,
    address.complexName ? `Complex/Industrial Park: ${address.complexName}` : null,
    address.siteAddressDetail ? `Unit/Site Detail: ${address.siteAddressDetail}` : null,
    address.suburb,
    address.cityDistrict,
    address.province,
    address.postalCode ? `Postal Code: ${address.postalCode}` : null,
  ].filter(Boolean).join(', ');
};

const normalizeAddress = (addressDetails, fallback = '') => {
  const normalized = addressDetails && typeof addressDetails === 'object' ? addressDetails : {};
  const formatted = formatAddress(normalized);

  return {
    details: normalized,
    formatted: formatted || fallback || '',
  };
};

const normalizeSites = (sites = []) => {
  if (!Array.isArray(sites)) return [];

  return sites.map((site) => {
    const normalizedAddress = normalizeAddress(site.addressDetails, site.address);

    return {
      ...site,
      address: normalizedAddress.formatted,
      addressDetails: normalizedAddress.details,
    };
  });
};

const classifyCustomerPersistenceError = (error) => {
  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
    return {
      status: 409,
      message: `Duplicate value for ${duplicateField}`,
    };
  }

  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return {
      status: 400,
      message: error.message,
    };
  }

  return null;
};

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
      physicalAddressDetails,
      billingAddress,
      billingAddressDetails,
      billingAddressPolicy,
      taxNumber,
      registrationNumber,
      vatNumber,
      sites,
      parentAccount,
      maintenanceManager,
      accountStatus,
      notes
    } = req.body;

    const normalizedPhysicalAddress = normalizeAddress(physicalAddressDetails, physicalAddress);
    const normalizedBillingAddress = normalizeAddress(billingAddressDetails, billingAddress);
    const normalizedSites = normalizeSites(sites);

    // Validate required fields
    if (!customerType || !contactFirstName || !contactLastName || !email || !phoneNumber || !customerId) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Validate customer type specific requirements
    if (isBusinessCustomerType(customerType)) {
      if (!businessName) {
        return res.status(400).json({ message: 'Business name is required for business customers' });
      }
      if (!normalizedSites || normalizedSites.length === 0) {
        return res.status(400).json({ message: 'At least one site is required for business customers' });
      }
    } else if (customerType === 'residential') {
      if (!normalizedPhysicalAddress.formatted) {
        return res.status(400).json({ message: 'Physical address is required for residential customers' });
      }
    }

    // Validate hub-branch structure
    try {
      await validateHubBranchStructure(customerType, normalizedSites, parentAccount);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
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
      physicalAddress: normalizedPhysicalAddress.formatted,
      physicalAddressDetails: normalizedPhysicalAddress.details,
      billingAddress: normalizedBillingAddress.formatted,
      billingAddressDetails: normalizedBillingAddress.details,
      billingAddressPolicy: billingAddressPolicy === 'customerBillingAddress' ? 'customerBillingAddress' : 'serviceSite',
      taxNumber,
      registrationNumber,
      vatNumber,
      sites: normalizedSites,
      parentAccount,
      maintenanceManager,
      accountStatus,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Customer created: ${isBusinessCustomerType(customer.customerType) ? customer.businessName : `${customer.contactFirstName} ${customer.contactLastName}`} (${customer.customerId})`);
    res.status(201).json({ data: customer });
  } catch (error) {
    logError('Create customer error:', error);
    const classifiedError = classifyCustomerPersistenceError(error);
    if (classifiedError) {
      return res.status(classifiedError.status).json({ message: classifiedError.message });
    }

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

    if (!isBusinessCustomerType(customer.customerType)) {
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
      addressDetails,
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

    if (!isBusinessCustomerType(customer.customerType)) {
      return res.status(400).json({ message: 'Only business customers can have multiple sites' });
    }

    const normalizedAddress = normalizeAddress(addressDetails, address);

    // Validate required fields
    if (!siteName || !normalizedAddress.formatted) {
      return res.status(400).json({ message: 'Site name and address are required' });
    }

    // Add new site
    customer.sites.push({
      siteName,
      address: normalizedAddress.formatted,
      addressDetails: normalizedAddress.details,
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

    if (!isBusinessCustomerType(customer.customerType)) {
      return res.status(400).json({ message: 'Only business customers have multiple sites' });
    }

    const site = customer.sites.id(req.params.siteId);

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Update site fields
    const updateableFields = ['siteName', 'contactPerson', 'contactPhone', 'contactEmail', 'serviceTypes', 'status', 'notes'];
    updateableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        site[field] = req.body[field];
      }
    });

    if (req.body.address !== undefined || req.body.addressDetails !== undefined) {
      const normalizedAddress = normalizeAddress(req.body.addressDetails, req.body.address ?? site.address);
      site.address = normalizedAddress.formatted;
      site.addressDetails = normalizedAddress.details;
    }

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

    if (!isBusinessCustomerType(customer.customerType)) {
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

// @desc    Get all branches for a headOffice customer
// @route   GET /api/customers/:id/branches
// @access  Private
export const getCustomerBranches = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.customerType !== 'headOffice') {
      return res.status(400).json({ message: 'Only headOffice customers can have branches' });
    }

    const branches = await Customer.find({
      parentAccount: customer._id,
      createdBy: req.user._id
    }).sort({ createdAt: -1 });

    res.json(branches);
  } catch (error) {
    logError('Get customer branches error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new branch for a headOffice customer
// @route   POST /api/customers/:id/branches
// @access  Private
export const createBranchForCustomer = async (req, res) => {
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
      physicalAddressDetails,
      billingAddress,
      billingAddressDetails,
      billingAddressPolicy,
      taxNumber,
      registrationNumber,
      vatNumber,
      sites,
      maintenanceManager,
      accountStatus,
      notes
    } = req.body;

    // Validate parent exists and is headOffice
    const parentCustomer = await Customer.findOne({
      _id: req.params.id,
      customerType: 'headOffice',
      createdBy: req.user._id
    });

    if (!parentCustomer) {
      return res.status(404).json({ message: 'Parent headOffice customer not found' });
    }

    // Validate branch type and requirements
    if (!['branch', 'franchise'].includes(customerType)) {
      return res.status(400).json({ message: 'Only branch and franchise types can be created for a headOffice' });
    }

    if (!contactFirstName || !contactLastName || !email || !phoneNumber || !customerId || !businessName) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    if (!sites || sites.length === 0) {
      return res.status(400).json({ message: 'At least one site is required for branches' });
    }

    // Check if customerId already exists
    const customerExists = await Customer.findOne({ customerId });
    if (customerExists) {
      return res.status(400).json({ message: 'Customer ID already exists' });
    }

    const normalizedPhysicalAddress = normalizeAddress(physicalAddressDetails, physicalAddress);
    const normalizedBillingAddress = normalizeAddress(billingAddressDetails, billingAddress);
    const normalizedSites = normalizeSites(sites);

    // Validate hub-branch structure (branches should not have depot sites)
    try {
      await validateHubBranchStructure(customerType, normalizedSites, req.params.id);
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    // Create branch
    const branch = await Customer.create({
      customerType,
      businessName,
      contactFirstName,
      contactLastName,
      email,
      phoneNumber,
      alternatePhone,
      customerId,
      physicalAddress: normalizedPhysicalAddress.formatted,
      physicalAddressDetails: normalizedPhysicalAddress.details,
      billingAddress: normalizedBillingAddress.formatted,
      billingAddressDetails: normalizedBillingAddress.details,
      billingAddressPolicy: billingAddressPolicy === 'customerBillingAddress' ? 'customerBillingAddress' : 'serviceSite',
      taxNumber,
      registrationNumber,
      vatNumber,
      sites: normalizedSites,
      parentAccount: req.params.id,
      maintenanceManager,
      accountStatus,
      notes,
      createdBy: req.user._id
    });

    logInfo(`✅ Branch created: ${businessName} (${customerId}) for headOffice ${parentCustomer.customerId}`);
    res.status(201).json({ data: branch });
  } catch (error) {
    logError('Create branch error:', error);
    const classifiedError = classifyCustomerPersistenceError(error);
    if (classifiedError) {
      return res.status(classifiedError.status).json({ message: classifiedError.message });
    }

    res.status(500).json({ message: error.message });
  }
};
