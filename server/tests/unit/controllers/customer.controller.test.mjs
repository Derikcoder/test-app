/**
 * @file customer.controller.test.mjs
 * @description Unit tests for Customer controller (ESM Jest pattern)
 */
import { jest } from '@jest/globals';

describe('Customer Controller', () => {
  let getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer;
  let getCustomerSites, addCustomerSite, updateCustomerSite, deleteCustomerSite;
  let Customer, User, ServiceCall;
  let req;
  let res;
  let mockSite;
  let mockBusinessCustomer;
  let mockResidentialCustomer;

  beforeAll(async () => {
    // Setup ESM mocks
    await jest.unstable_mockModule('../../../models/Customer.model.js', () => ({
      __esModule: true,
      default: {},
    }));
    await jest.unstable_mockModule('../../../models/User.model.js', () => ({
      __esModule: true,
      default: {},
    }));
    await jest.unstable_mockModule('../../../models/ServiceCall.model.js', () => ({
      __esModule: true,
      default: {},
    }));
    await jest.unstable_mockModule('../../../utils/sequence.util.js', () => ({
      __esModule: true,
      getNextSequenceValue: jest.fn().mockResolvedValue(1),
      formatSequenceId: jest.fn().mockReturnValue('CUST-000001'),
    }));
    await jest.unstable_mockModule('../../../middleware/logger.middleware.js', () => ({
      __esModule: true,
      logError: jest.fn(),
      logInfo: jest.fn(),
    }));

    // Dynamic import after mocks
    const controller = await import('../../../controllers/customer.controller.js');
    getCustomers = controller.getCustomers;
    getCustomerById = controller.getCustomerById;
    createCustomer = controller.createCustomer;
    updateCustomer = controller.updateCustomer;
    deleteCustomer = controller.deleteCustomer;
    getCustomerSites = controller.getCustomerSites;
    addCustomerSite = controller.addCustomerSite;
    updateCustomerSite = controller.updateCustomerSite;
    deleteCustomerSite = controller.deleteCustomerSite;

    Customer = (await import('../../../models/Customer.model.js')).default;
    User = (await import('../../../models/User.model.js')).default;
    ServiceCall = (await import('../../../models/ServiceCall.model.js')).default;
  });

  beforeEach(() => {
    mockSite = {
      _id: 'site-1',
      siteName: 'Main Branch',
      address: '123 Main St, Johannesburg',
      addressDetails: { streetAddress: '123 Main St', suburb: 'Johannesburg' },
      contactPerson: 'Bob',
      contactPhone: '0800001111',
      contactEmail: 'bob@example.com',
      serviceTypes: ['HVAC'],
      status: 'active',
      notes: '',
      deleteOne: jest.fn(),
    };

    mockBusinessCustomer = {
      _id: 'customer-1',
      customerType: 'headOffice',
      businessName: 'ACME Corp',
      contactFirstName: 'Alice',
      contactLastName: 'Smith',
      email: 'alice@acme.com',
      phoneNumber: '0800001234',
      customerId: 'CUST-001',
      sites: [mockSite],
      createdBy: 'user-1',
      save: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({}),
    };

    mockResidentialCustomer = {
      _id: 'customer-2',
      customerType: 'residential',
      contactFirstName: 'Bob',
      contactLastName: 'Jones',
      email: 'bob@example.com',
      phoneNumber: '0800005678',
      customerId: 'CUST-002',
      physicalAddress: '45 Oak Ave, Cape Town',
      sites: [],
      createdBy: 'user-1',
      save: jest.fn(),
      deleteOne: jest.fn().mockResolvedValue({}),
    };

    req = {
      params: {},
      body: {},
      query: {},
      user: { _id: 'user-1' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
    ServiceCall.findOne = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      }),
    });

    Customer.IMMUTABLE_FIELDS = ['businessName', 'customerId', 'customerType', 'createdAt', '_id', 'createdBy'];
    Customer.EDITABLE_FIELDS = [
      'contactFirstName', 'contactLastName', 'email', 'phoneNumber', 'alternatePhone',
      'physicalAddress', 'physicalAddressDetails', 'billingAddress', 'billingAddressDetails',
      'vatNumber', 'taxNumber', 'registrationNumber', 'sites', 'maintenanceManager',
      'accountStatus', 'notes',
    ];
  });

  test('returns customer list for authenticated owner', async () => {
    const expected = [mockBusinessCustomer, mockResidentialCustomer];
    Customer.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(expected),
    });

    await getCustomers(req, res);

    expect(Customer.find).toHaveBeenCalledWith({ createdBy: 'user-1' });
    expect(res.json).toHaveBeenCalledWith(expected);
  });
});
