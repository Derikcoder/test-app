import Customer from '../models/Customer.model.js';
import User from '../models/User.model.js';
import ServiceCall from '../models/ServiceCall.model.js';
import { logError, logInfo } from '../middleware/logger.middleware.js';
import { formatSequenceId, getNextSequenceValue } from '../utils/sequence.util.js';

const BUSINESS_TYPES = ['headOffice', 'branch', 'franchise', 'singleBusiness'];

const buildReadableCustomerFilter = (req, customerId = null) => {
  if (req.user?.role === 'customer' && req.user?.customerProfile) {
    if (customerId && String(customerId) !== String(req.user.customerProfile)) {
      return null;
    }

    return { _id: req.user.customerProfile };
  }

  const filter = { createdBy: req.user._id };
  if (customerId) filter._id = customerId;
  return filter;
};

const buildWritableCustomerFilter = (req, customerId = null) => {
  if (req.user?.role === 'customer' && req.user?.customerProfile) {
    if (customerId && String(customerId) !== String(req.user.customerProfile)) {
      return null;
    }

    return { _id: req.user.customerProfile };
  }

  return {
    _id: customerId,
    createdBy: req.user._id,
  };
};

const syncLinkedCustomerUser = async (customer) => {
  if (!customer?._id) return;

  const linkedUser = await User.findOne({ customerProfile: customer._id });
  if (!linkedUser) return;

  linkedUser.email = customer.email || linkedUser.email;
  linkedUser.phoneNumber = customer.phoneNumber || linkedUser.phoneNumber;
  linkedUser.physicalAddress = customer.physicalAddress || linkedUser.physicalAddress;
  await linkedUser.save();
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

const hasAddressDetails = (address = {}) => Object.values(address || {}).some((value) => String(value || '').trim());

const normalizeAddress = (addressDetails, fallback = '') => {
  const rawAddress = addressDetails && typeof addressDetails === 'object' ? addressDetails : {};
  const normalized = Object.fromEntries(
    Object.entries(rawAddress).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );
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

const getAddressDetailsFromBookingRequest = (bookingRequest = {}) => {
  const machineAddress = bookingRequest?.machineAddress || {};
  if (hasAddressDetails(machineAddress)) {
    return machineAddress;
  }

  const administrativeAddress = bookingRequest?.administrativeAddress || {};
  if (hasAddressDetails(administrativeAddress)) {
    return administrativeAddress;
  }

  return {};
};

const backfillCustomerAddressFromLatestServiceCall = async (customer) => {
  if (!customer?._id || typeof ServiceCall.findOne !== 'function') {
    return customer;
  }

  const hasPhysicalAddress = Boolean(String(customer.physicalAddress || '').trim());
  const hasPhysicalAddressDetails = hasAddressDetails(customer.physicalAddressDetails || {});

  if (hasPhysicalAddress && hasPhysicalAddressDetails) {
    return customer;
  }

  const latestServiceCall = await ServiceCall.findOne({ customer: customer._id })
    .select('serviceLocation bookingRequest')
    .sort({ createdAt: -1 });

  if (!latestServiceCall) {
    return customer;
  }

  const derivedAddressDetails = getAddressDetailsFromBookingRequest(latestServiceCall.bookingRequest || {});
  const derivedAddress = formatAddress(derivedAddressDetails) || String(latestServiceCall.serviceLocation || '').trim();

  if (!derivedAddress) {
    return customer;
  }

  let changed = false;
  if (!hasPhysicalAddress) {
    customer.physicalAddress = derivedAddress;
    changed = true;
  }

  if (!hasPhysicalAddressDetails && hasAddressDetails(derivedAddressDetails)) {
    customer.physicalAddressDetails = derivedAddressDetails;
    changed = true;
  }

  if (changed && typeof customer.save === 'function') {
    await customer.save();
    await syncLinkedCustomerUser(customer);
  }

  return customer;
};

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = async (req, res) => {
  try {
    const filter = buildReadableCustomerFilter(req);
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
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
    const filter = buildReadableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await backfillCustomerAddressFromLatestServiceCall(customer);

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
      physicalAddress,
      physicalAddressDetails,
      billingAddress,
      billingAddressDetails,
      taxNumber,
      registrationNumber,
      vatNumber,
      sites,
      maintenanceManager,
      accountStatus,
      notes,
      serviceAssets,
      groupName = ''
    } = req.body;

    const normalizedPhysicalAddress = normalizeAddress(physicalAddressDetails, physicalAddress);
    const normalizedBillingAddress = normalizeAddress(billingAddressDetails, billingAddress);
    const normalizedSites = normalizeSites(sites);

    // Validate required fields
    if (!customerType || !contactFirstName || !contactLastName || !email || !phoneNumber) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Validate customer type specific requirements
    if (BUSINESS_TYPES.includes(customerType)) {
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

    // Reject duplicate email
    const existingCustomer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existingCustomer) {
      return res.status(409).json({ message: 'A customer with this email address already exists' });
    }

    // Customer IDs are generated by the system to keep sequence integrity.
    let customerId;
    let attempts = 0;

    do {
      const nextCustomerSequence = await getNextSequenceValue('customer_id');
      customerId = formatSequenceId('CUST', nextCustomerSequence);
      attempts += 1;
    } while (await Customer.findOne({ customerId }) && attempts < 5);

    if (await Customer.findOne({ customerId })) {
      return res.status(500).json({ message: 'Failed to generate a unique customer ID' });
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
      taxNumber,
      registrationNumber,
      vatNumber,
      sites: normalizedSites,
      maintenanceManager,
      accountStatus,
      notes,
      serviceAssets,
      groupName,
      createdBy: req.user._id
    });

    logInfo(`✅ Customer created: ${BUSINESS_TYPES.includes(customer.customerType) ? customer.businessName : `${customer.contactFirstName} ${customer.contactLastName}`} (${customer.customerId})`);
    res.status(201).json(customer);
  } catch (error) {
    logError('Create customer error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = async (req, res) => {
  try {
    const filter = buildWritableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check if trying to update immutable fields
    const attemptedImmutableUpdates = Customer.IMMUTABLE_FIELDS.filter(
      (field) => req.body[field] !== undefined && String(req.body[field]) !== String(customer[field])
    );

    if (attemptedImmutableUpdates.length > 0) {
      return res.status(403).json({
        message: 'Cannot update protected fields',
        protectedFields: attemptedImmutableUpdates,
      });
    }

    if (req.body.physicalAddressDetails !== undefined || req.body.physicalAddress !== undefined) {
      const normalizedPhysicalAddress = normalizeAddress(req.body.physicalAddressDetails, req.body.physicalAddress);

      if (normalizedPhysicalAddress.formatted) {
        customer.physicalAddress = normalizedPhysicalAddress.formatted;
      }

      if (hasAddressDetails(normalizedPhysicalAddress.details)) {
        customer.physicalAddressDetails = normalizedPhysicalAddress.details;
      }
    }

    if (req.body.billingAddressDetails !== undefined || req.body.billingAddress !== undefined) {
      const normalizedBillingAddress = normalizeAddress(req.body.billingAddressDetails, req.body.billingAddress);

      if (normalizedBillingAddress.formatted) {
        customer.billingAddress = normalizedBillingAddress.formatted;
      }

      if (hasAddressDetails(normalizedBillingAddress.details)) {
        customer.billingAddressDetails = normalizedBillingAddress.details;
      }
    }

    if (req.body.sites !== undefined) {
      customer.sites = normalizeSites(req.body.sites);
    }

    // Update editable fields
    Customer.EDITABLE_FIELDS.forEach((field) => {
      if (['physicalAddress', 'physicalAddressDetails', 'billingAddress', 'billingAddressDetails', 'sites'].includes(field)) {
        return;
      }

      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });

    const updatedCustomer = await customer.save();
    await syncLinkedCustomerUser(updatedCustomer);
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
    const filter = buildReadableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!BUSINESS_TYPES.includes(customer.customerType)) {
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

    const filter = buildWritableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!BUSINESS_TYPES.includes(customer.customerType)) {
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
    const filter = buildWritableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!BUSINESS_TYPES.includes(customer.customerType)) {
      return res.status(400).json({ message: 'Only business customers have multiple sites' });
    }

    const site = customer.sites.id(req.params.siteId);

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Update editable fields
    Customer.EDITABLE_FIELDS.forEach((field) => {
      if ([
        'physicalAddress',
        'physicalAddressDetails',
        'billingAddress',
        'billingAddressDetails',
        'sites'
      ].includes(field)) {
        return;
      }

      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });
    // Allow groupName update
    if (req.body.groupName !== undefined) {
      customer.groupName = req.body.groupName;
    }
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
    const filter = buildWritableCustomerFilter(req, req.params.id);

    if (!filter) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findOne(filter);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!BUSINESS_TYPES.includes(customer.customerType)) {
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
