/**
 * @file customer.controller.test.js
 * @description Unit tests for Customer controller
 */

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSites,
  addCustomerSite,
  updateCustomerSite,
  deleteCustomerSite,
} from '../../../controllers/customer.controller.js';
import Customer from '../../../models/Customer.model.js';
import User from '../../../models/User.model.js';

jest.mock('../../../models/Customer.model.js');
jest.mock('../../../models/User.model.js');
jest.mock('../../../utils/sequence.util.js', () => ({
  getNextSequenceValue: jest.fn().mockResolvedValue(1),
  formatSequenceId: jest.fn().mockReturnValue('CUST-000001'),
}));
jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Customer Controller', () => {
  let req;
  let res;

  const mockSite = {
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

  const mockBusinessCustomer = {
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

  const mockResidentialCustomer = {
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

  beforeEach(() => {
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

    Customer.IMMUTABLE_FIELDS = ['businessName', 'customerId', 'customerType', 'createdAt', '_id', 'createdBy'];
    Customer.EDITABLE_FIELDS = [
      'contactFirstName', 'contactLastName', 'email', 'phoneNumber', 'alternatePhone',
      'physicalAddress', 'physicalAddressDetails', 'billingAddress', 'billingAddressDetails',
      'vatNumber', 'taxNumber', 'registrationNumber', 'sites', 'maintenanceManager',
      'accountStatus', 'notes',
    ];
  });

  // ─── getCustomers ─────────────────────────────────────────────────────────────

  describe('getCustomers', () => {
    test('returns list of customers for the authenticated user', async () => {
      const customers = [mockBusinessCustomer, mockResidentialCustomer];
      Customer.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(customers),
      });

      await getCustomers(req, res);

      expect(Customer.find).toHaveBeenCalledWith({ createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(customers);
    });

    test('returns 500 on database error', async () => {
      Customer.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getCustomers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
  });

  // ─── getCustomerById ──────────────────────────────────────────────────────────

  describe('getCustomerById', () => {
    test('returns customer when found', async () => {
      req.params.id = 'customer-1';
      Customer.findOne = jest.fn().mockResolvedValue(mockBusinessCustomer);

      await getCustomerById(req, res);

      expect(Customer.findOne).toHaveBeenCalledWith({ _id: 'customer-1', createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(mockBusinessCustomer);
    });

    test('allows a customer user to fetch their own linked profile', async () => {
      req.params.id = 'customer-2';
      req.user = { _id: 'customer-user-1', role: 'customer', customerProfile: 'customer-2' };
      Customer.findOne = jest.fn().mockResolvedValue(mockResidentialCustomer);

      await getCustomerById(req, res);

      expect(Customer.findOne).toHaveBeenCalledWith({ _id: 'customer-2' });
      expect(res.json).toHaveBeenCalledWith(mockResidentialCustomer);
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await getCustomerById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'customer-1';
      Customer.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await getCustomerById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCustomer', () => {
    test('allows a logged-in customer to update their own editable profile fields', async () => {
      req.params.id = 'customer-2';
      req.user = { _id: 'customer-user-1', role: 'customer', customerProfile: 'customer-2' };
      req.body = {
        phoneNumber: '0821112222',
        alternatePhone: '0823334444',
        physicalAddress: '99 Updated Avenue, Pretoria',
        email: 'updated@example.com',
      };

      const save = jest.fn().mockResolvedValue({
        ...mockResidentialCustomer,
        ...req.body,
      });

      Customer.findOne = jest.fn().mockResolvedValue({
        ...mockResidentialCustomer,
        save,
      });

      User.findOne = jest.fn().mockResolvedValue({
        email: 'bob@example.com',
        phoneNumber: '0800005678',
        physicalAddress: '45 Oak Ave, Cape Town',
        save: jest.fn().mockResolvedValue(true),
      });

      await updateCustomer(req, res);

      expect(Customer.findOne).toHaveBeenCalledWith({ _id: 'customer-2' });
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '0821112222',
          email: 'updated@example.com',
        })
      );
    });
  });

  // ─── createCustomer ───────────────────────────────────────────────────────────

  describe('createCustomer', () => {
    const validResidentialBody = {
      customerType: 'residential',
      contactFirstName: 'Bob',
      contactLastName: 'Jones',
      email: 'bob@example.com',
      phoneNumber: '0800005678',
      customerId: 'CUST-NEW',
      physicalAddressDetails: {
        streetAddress: '45 Oak Ave',
        suburb: 'Cape Town',
        cityDistrict: 'Cape Town',
        province: 'Western Cape',
      },
    };

    const validBusinessBody = {
      customerType: 'headOffice',
      businessName: 'New Corp',
      contactFirstName: 'Carol',
      contactLastName: 'White',
      email: 'carol@newcorp.com',
      phoneNumber: '0800009999',
      customerId: 'CUST-BIZ',
      sites: [
        {
          siteName: 'HQ',
          addressDetails: { streetAddress: '1 Corp Ave', suburb: 'Sandton' },
        },
      ],
    };

    test('creates a residential customer with valid data', async () => {
      req.body = validResidentialBody;
      Customer.findOne = jest.fn().mockResolvedValue(null);
      Customer.create = jest.fn().mockResolvedValue({ ...mockResidentialCustomer, customerId: 'CUST-NEW' });

      await createCustomer(req, res);

      expect(Customer.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('creates a business customer with valid data', async () => {
      req.body = validBusinessBody;
      Customer.findOne = jest.fn().mockResolvedValue(null);
      Customer.create = jest.fn().mockResolvedValue({
        ...mockBusinessCustomer,
        customerId: 'CUST-BIZ',
        businessName: 'New Corp',
        contactFirstName: 'Carol',
        contactLastName: 'White',
      });

      await createCustomer(req, res);

      expect(Customer.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 when required fields are missing', async () => {
      req.body = { customerType: 'residential' };

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please fill in all required fields' });
    });

    test('returns 400 for business customer without businessName', async () => {
      req.body = {
        ...validBusinessBody,
        businessName: undefined,
      };

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Business name is required for business customers' });
    });

    test('returns 400 for business customer without sites', async () => {
      req.body = {
        ...validBusinessBody,
        sites: [],
      };

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'At least one site is required for business customers' });
    });

    test('returns 400 for residential customer without physical address', async () => {
      req.body = {
        ...validResidentialBody,
        physicalAddressDetails: undefined,
        physicalAddress: undefined,
      };

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Physical address is required for residential customers' });
    });

    test('returns 500 when ID generation cannot produce a unique customer ID', async () => {
      req.body = validResidentialBody;
      // First call is the duplicate-email check (returns null = no duplicate),
      // subsequent calls are the ID-collision checks (return a customer to exhaust the retry loop)
      Customer.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockResidentialCustomer);

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to generate a unique customer ID' });
    });

    test('returns 500 on database error', async () => {
      req.body = validResidentialBody;
      Customer.findOne = jest.fn().mockResolvedValue(null);
      Customer.create = jest.fn().mockRejectedValue(new Error('DB error'));

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateCustomer ───────────────────────────────────────────────────────────

  describe('updateCustomer', () => {
    test('updates editable fields successfully', async () => {
      req.params.id = 'customer-1';
      req.body = { email: 'newemail@acme.com' };

      const customerInstance = {
        ...mockBusinessCustomer,
        save: jest.fn().mockResolvedValue({ ...mockBusinessCustomer, email: 'newemail@acme.com' }),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await updateCustomer(req, res);

      expect(customerInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('preserves the existing residential physical address when legacy onboarding data has no structured address fields', async () => {
      req.params.id = 'customer-2';
      req.user = { _id: 'customer-user-1', role: 'customer', customerProfile: 'customer-2' };
      req.body = {
        phoneNumber: '0821112222',
        physicalAddressDetails: {},
      };

      const customerInstance = {
        ...mockResidentialCustomer,
        physicalAddressDetails: {},
        save: jest.fn().mockImplementation(async function saveCustomer() {
          return this;
        }),
      };

      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);
      User.findOne = jest.fn().mockResolvedValue(null);

      await updateCustomer(req, res);

      expect(customerInstance.physicalAddress).toBe('45 Oak Ave, Cape Town');
      expect(customerInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        physicalAddress: '45 Oak Ave, Cape Town',
      }));
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { email: 'new@example.com' };
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await updateCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    test('returns 403 when trying to update immutable fields', async () => {
      req.params.id = 'customer-1';
      req.body = { businessName: 'New Name' };

      Customer.findOne = jest.fn().mockResolvedValue({ ...mockBusinessCustomer });

      await updateCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot update protected fields' })
      );
    });

    test('allows same immutable value without error', async () => {
      req.params.id = 'customer-1';
      req.body = { businessName: 'ACME Corp', email: 'alice2@acme.com' }; // same as existing

      const customerInstance = {
        ...mockBusinessCustomer,
        save: jest.fn().mockResolvedValue({}),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await updateCustomer(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(customerInstance.save).toHaveBeenCalled();
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'customer-1';
      req.body = { email: 'new@acme.com' };
      Customer.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await updateCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── deleteCustomer ───────────────────────────────────────────────────────────

  describe('deleteCustomer', () => {
    test('deletes customer successfully', async () => {
      req.params.id = 'customer-1';
      const customerInstance = { ...mockBusinessCustomer, deleteOne: jest.fn().mockResolvedValue({}) };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await deleteCustomer(req, res);

      expect(customerInstance.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer removed successfully' });
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'customer-1';
      Customer.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await deleteCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getCustomerSites ─────────────────────────────────────────────────────────

  describe('getCustomerSites', () => {
    test('returns sites for a business customer', async () => {
      req.params.id = 'customer-1';
      Customer.findOne = jest.fn().mockResolvedValue(mockBusinessCustomer);

      await getCustomerSites(req, res);

      expect(res.json).toHaveBeenCalledWith(mockBusinessCustomer.sites);
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await getCustomerSites(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 for residential customers', async () => {
      req.params.id = 'customer-2';
      Customer.findOne = jest.fn().mockResolvedValue(mockResidentialCustomer);

      await getCustomerSites(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only business customers have multiple sites' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'customer-1';
      Customer.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await getCustomerSites(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── addCustomerSite ──────────────────────────────────────────────────────────

  describe('addCustomerSite', () => {
    const validSiteBody = {
      siteName: 'New Branch',
      addressDetails: { streetAddress: '99 New St', suburb: 'Durban' },
    };

    test('adds site to business customer successfully', async () => {
      req.params.id = 'customer-1';
      req.body = validSiteBody;

      const newSite = { _id: 'site-2', siteName: 'New Branch', address: '99 New St, Durban' };
      const customerInstance = {
        ...mockBusinessCustomer,
        sites: {
          push: jest.fn(),
          length: 2,
        },
        save: jest.fn().mockResolvedValue({
          ...mockBusinessCustomer,
          sites: [mockSite, newSite],
        }),
      };
      customerInstance.save.mockResolvedValue({
        ...mockBusinessCustomer,
        sites: [mockSite, newSite],
      });
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await addCustomerSite(req, res);

      expect(customerInstance.sites.push).toHaveBeenCalled();
      expect(customerInstance.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 when siteName is missing', async () => {
      req.params.id = 'customer-1';
      req.body = { addressDetails: { streetAddress: '99 New St' } };

      Customer.findOne = jest.fn().mockResolvedValue(mockBusinessCustomer);

      await addCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Site name and address are required' });
    });

    test('returns 400 when address details are missing', async () => {
      req.params.id = 'customer-1';
      req.body = { siteName: 'Branch' };

      Customer.findOne = jest.fn().mockResolvedValue(mockBusinessCustomer);

      await addCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      req.body = validSiteBody;
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await addCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when trying to add site to residential customer', async () => {
      req.params.id = 'customer-2';
      req.body = validSiteBody;
      Customer.findOne = jest.fn().mockResolvedValue(mockResidentialCustomer);

      await addCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only business customers can have multiple sites' });
    });
  });

  // ─── updateCustomerSite ───────────────────────────────────────────────────────

  describe('updateCustomerSite', () => {
    test('updates site successfully', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'site-1';
      req.body = { siteName: 'Updated Branch' };

      const siteInstance = { ...mockSite };
      const customerInstance = {
        ...mockBusinessCustomer,
        sites: {
          id: jest.fn().mockReturnValue(siteInstance),
        },
        save: jest.fn().mockResolvedValue({}),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await updateCustomerSite(req, res);

      expect(siteInstance.siteName).toBe('Updated Branch');
      expect(customerInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(siteInstance);
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      req.params.siteId = 'site-1';
      req.body = { siteName: 'Updated' };
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await updateCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer not found' });
    });

    test('returns 400 when customer is residential', async () => {
      req.params.id = 'customer-2';
      req.params.siteId = 'site-1';
      req.body = { siteName: 'Updated' };
      Customer.findOne = jest.fn().mockResolvedValue(mockResidentialCustomer);

      await updateCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when site not found', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'nonexistent-site';
      req.body = { siteName: 'Updated' };

      const customerInstance = {
        ...mockBusinessCustomer,
        sites: { id: jest.fn().mockReturnValue(null) },
        save: jest.fn(),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await updateCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Site not found' });
    });

    test('normalizes address when address fields are provided', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'site-1';
      req.body = { addressDetails: { streetAddress: '200 New Rd', suburb: 'Pretoria' } };

      const siteInstance = { ...mockSite };
      const customerInstance = {
        ...mockBusinessCustomer,
        sites: { id: jest.fn().mockReturnValue(siteInstance) },
        save: jest.fn().mockResolvedValue({}),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await updateCustomerSite(req, res);

      expect(siteInstance.address).toContain('200 New Rd');
      expect(siteInstance.addressDetails).toMatchObject({ streetAddress: '200 New Rd' });
    });
  });

  // ─── deleteCustomerSite ───────────────────────────────────────────────────────

  describe('deleteCustomerSite', () => {
    test('deletes site successfully when more than one site exists', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'site-1';

      const siteInstance = { ...mockSite, deleteOne: jest.fn(), siteName: 'Main Branch' };
      const customerInstance = {
        ...mockBusinessCustomer,
        sites: {
          length: 2,
          id: jest.fn().mockReturnValue(siteInstance),
        },
        save: jest.fn().mockResolvedValue({}),
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await deleteCustomerSite(req, res);

      expect(siteInstance.deleteOne).toHaveBeenCalled();
      expect(customerInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Site removed successfully' });
    });

    test('returns 409 when trying to delete the last site', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'site-1';

      const customerInstance = {
        ...mockBusinessCustomer,
        sites: { length: 1 },
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await deleteCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Cannot delete the last site') })
      );
    });

    test('returns 404 when customer not found', async () => {
      req.params.id = 'nonexistent';
      req.params.siteId = 'site-1';
      Customer.findOne = jest.fn().mockResolvedValue(null);

      await deleteCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when customer is residential', async () => {
      req.params.id = 'customer-2';
      req.params.siteId = 'site-1';
      Customer.findOne = jest.fn().mockResolvedValue(mockResidentialCustomer);

      await deleteCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when site not found', async () => {
      req.params.id = 'customer-1';
      req.params.siteId = 'nonexistent-site';

      const customerInstance = {
        ...mockBusinessCustomer,
        sites: {
          length: 2,
          id: jest.fn().mockReturnValue(null),
        },
      };
      Customer.findOne = jest.fn().mockResolvedValue(customerInstance);

      await deleteCustomerSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Site not found' });
    });
  });
});
