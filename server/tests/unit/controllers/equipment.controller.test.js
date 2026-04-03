/**
 * @file equipment.controller.test.js
 * @description Unit tests for Equipment controller
 */

import {
  getEquipment,
  getEquipmentByCustomer,
  getEquipmentBySite,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentServiceHistory,
  getEquipmentWarrantyStatus,
} from '../../../controllers/equipment.controller.js';
import Equipment from '../../../models/Equipment.model.js';
import ServiceCall from '../../../models/ServiceCall.model.js';

jest.mock('../../../models/Equipment.model.js', () => {
  const mock = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    IMMUTABLE_FIELDS: ['equipmentId', 'createdAt', '_id', 'createdBy'],
    EDITABLE_FIELDS: [
      'customer', 'siteId', 'equipmentType', 'customType', 'brand', 'model',
      'serialNumber', 'installationDate', 'warrantyExpiry', 'lastServiceDate',
      'nextServiceDate', 'status', 'location', 'serviceHistory', 'notes',
    ],
  };
  return { default: mock };
});

jest.mock('../../../models/ServiceCall.model.js', () => {
  const mock = {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };
  return { default: mock };
});

jest.mock('../../../middleware/logger.middleware.js', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

describe('Equipment Controller', () => {
  let req;
  let res;

  const mockCustomer = {
    _id: 'customer-1',
    businessName: 'ACME Corp',
    contactFirstName: 'Alice',
    contactLastName: 'Smith',
    customerId: 'CUST-001',
    customerType: 'headOffice',
  };

  const mockEquipment = {
    _id: 'equip-1',
    equipmentId: 'EQ-000001',
    customer: mockCustomer,
    siteId: 'site-1',
    equipmentType: 'HVAC',
    brand: 'Daikin',
    model: 'FTX35',
    serialNumber: 'SN-123456',
    warrantyExpiry: null,
    serviceHistory: [],
    status: 'operational',
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

    // Restore static properties after clearAllMocks
    Equipment.IMMUTABLE_FIELDS = ['equipmentId', 'createdAt', '_id', 'createdBy'];
    Equipment.EDITABLE_FIELDS = [
      'customer', 'siteId', 'equipmentType', 'customType', 'brand', 'model',
      'serialNumber', 'installationDate', 'warrantyExpiry', 'lastServiceDate',
      'nextServiceDate', 'status', 'location', 'serviceHistory', 'notes',
    ];
  });

  // ─── getEquipment ─────────────────────────────────────────────────────────────

  describe('getEquipment', () => {
    test('returns all equipment for the authenticated user', async () => {
      const equipmentList = [mockEquipment];
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(equipmentList),
        }),
      });

      await getEquipment(req, res);

      expect(Equipment.find).toHaveBeenCalledWith({ createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(equipmentList);
    });

    test('returns 500 on database error', async () => {
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
    });
  });

  // ─── getEquipmentByCustomer ───────────────────────────────────────────────────

  describe('getEquipmentByCustomer', () => {
    test('returns equipment filtered by customer', async () => {
      req.params.customerId = 'customer-1';
      const equipmentList = [mockEquipment];
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(equipmentList),
        }),
      });

      await getEquipmentByCustomer(req, res);

      expect(Equipment.find).toHaveBeenCalledWith({
        customer: 'customer-1',
        createdBy: 'user-1',
      });
      expect(res.json).toHaveBeenCalledWith(equipmentList);
    });

    test('returns empty array when no equipment found for customer', async () => {
      req.params.customerId = 'customer-2';
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });

      await getEquipmentByCustomer(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('returns 500 on database error', async () => {
      req.params.customerId = 'customer-1';
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getEquipmentByCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getEquipmentBySite ───────────────────────────────────────────────────────

  describe('getEquipmentBySite', () => {
    test('returns equipment filtered by customer and site', async () => {
      req.params.customerId = 'customer-1';
      req.params.siteId = 'site-1';
      const equipmentList = [mockEquipment];
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(equipmentList),
        }),
      });

      await getEquipmentBySite(req, res);

      expect(Equipment.find).toHaveBeenCalledWith({
        customer: 'customer-1',
        siteId: 'site-1',
        createdBy: 'user-1',
      });
      expect(res.json).toHaveBeenCalledWith(equipmentList);
    });

    test('returns 500 on database error', async () => {
      req.params.customerId = 'customer-1';
      req.params.siteId = 'site-1';
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getEquipmentBySite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getEquipmentById ─────────────────────────────────────────────────────────

  describe('getEquipmentById', () => {
    test('returns equipment when found', async () => {
      req.params.id = 'equip-1';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockEquipment),
        }),
      });

      await getEquipmentById(req, res);

      expect(Equipment.findOne).toHaveBeenCalledWith({ _id: 'equip-1', createdBy: 'user-1' });
      expect(res.json).toHaveBeenCalledWith(mockEquipment);
    });

    test('returns 404 when equipment not found', async () => {
      req.params.id = 'nonexistent';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await getEquipmentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Equipment not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'equip-1';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      });

      await getEquipmentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── createEquipment ─────────────────────────────────────────────────────────

  describe('createEquipment', () => {
    const validBody = {
      customer: 'customer-1',
      equipmentType: 'HVAC',
      brand: 'Daikin',
      model: 'FTX35',
    };

    test('creates equipment with valid data', async () => {
      req.body = validBody;
      const createdEquipment = {
        ...mockEquipment,
        populate: jest.fn().mockResolvedValue(undefined),
      };
      Equipment.create = jest.fn().mockResolvedValue(createdEquipment);

      await createEquipment(req, res);

      expect(Equipment.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'customer-1', equipmentType: 'HVAC', createdBy: 'user-1' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 400 when customer is missing', async () => {
      req.body = { equipmentType: 'HVAC' };

      await createEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer and equipment type are required' });
    });

    test('returns 400 when equipmentType is missing', async () => {
      req.body = { customer: 'customer-1' };

      await createEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Customer and equipment type are required' });
    });

    test('returns 400 when equipmentType is "Other" without customType', async () => {
      req.body = { customer: 'customer-1', equipmentType: 'Other' };

      await createEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Custom type is required when equipment type is "Other"' });
    });

    test('creates equipment when equipmentType is "Other" with customType provided', async () => {
      req.body = { customer: 'customer-1', equipmentType: 'Other', customType: 'Solar Panel' };
      const createdEquipment = {
        ...mockEquipment,
        equipmentType: 'Other',
        customType: 'Solar Panel',
        populate: jest.fn().mockResolvedValue(undefined),
      };
      Equipment.create = jest.fn().mockResolvedValue(createdEquipment);

      await createEquipment(req, res);

      expect(Equipment.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('returns 500 on database error', async () => {
      req.body = validBody;
      Equipment.create = jest.fn().mockRejectedValue(new Error('DB error'));

      await createEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── updateEquipment ─────────────────────────────────────────────────────────

  describe('updateEquipment', () => {
    test('updates editable fields successfully', async () => {
      req.params.id = 'equip-1';
      req.body = { brand: 'Samsung', status: 'under-maintenance' };

      const updatedEquipment = { ...mockEquipment, brand: 'Samsung', status: 'under-maintenance' };
      const equipmentInstance = {
        ...mockEquipment,
        save: jest.fn().mockResolvedValue(updatedEquipment),
        populate: jest.fn().mockResolvedValue(undefined),
      };
      updatedEquipment.populate = jest.fn().mockResolvedValue(undefined);
      equipmentInstance.save.mockResolvedValue(updatedEquipment);

      Equipment.findOne = jest.fn().mockResolvedValue(equipmentInstance);

      await updateEquipment(req, res);

      expect(equipmentInstance.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    test('returns 404 when equipment not found', async () => {
      req.params.id = 'nonexistent';
      req.body = { brand: 'Samsung' };
      Equipment.findOne = jest.fn().mockResolvedValue(null);

      await updateEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Equipment not found' });
    });

    test('returns 403 when trying to update immutable fields', async () => {
      req.params.id = 'equip-1';
      req.body = { equipmentId: 'EQ-NEWID' };

      Equipment.findOne = jest.fn().mockResolvedValue({ ...mockEquipment });

      await updateEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot update protected fields' })
      );
    });

    test('allows setting immutable field to same value (no-op)', async () => {
      req.params.id = 'equip-1';
      req.body = { equipmentId: 'EQ-000001', brand: 'Daikin' }; // same equipmentId

      const updatedEquipment = { ...mockEquipment };
      updatedEquipment.populate = jest.fn().mockResolvedValue(undefined);
      const equipmentInstance = {
        ...mockEquipment,
        equipmentId: 'EQ-000001',
        save: jest.fn().mockResolvedValue(updatedEquipment),
      };
      Equipment.findOne = jest.fn().mockResolvedValue(equipmentInstance);

      await updateEquipment(req, res);

      expect(res.status).not.toHaveBeenCalledWith(403);
      expect(equipmentInstance.save).toHaveBeenCalled();
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'equip-1';
      req.body = { brand: 'Samsung' };
      Equipment.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await updateEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── deleteEquipment ─────────────────────────────────────────────────────────

  describe('deleteEquipment', () => {
    test('deletes equipment without service history', async () => {
      req.params.id = 'equip-1';
      const equipmentInstance = { ...mockEquipment, serviceHistory: [], deleteOne: jest.fn().mockResolvedValue({}) };
      Equipment.findOne = jest.fn().mockResolvedValue(equipmentInstance);

      await deleteEquipment(req, res);

      expect(equipmentInstance.deleteOne).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Equipment removed successfully' });
    });

    test('returns 409 when equipment has service history', async () => {
      req.params.id = 'equip-1';
      const equipmentInstance = {
        ...mockEquipment,
        serviceHistory: ['call-1', 'call-2'],
      };
      Equipment.findOne = jest.fn().mockResolvedValue(equipmentInstance);

      await deleteEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Cannot delete equipment with service history'),
          serviceHistoryCount: 2,
        })
      );
    });

    test('returns 404 when equipment not found', async () => {
      req.params.id = 'nonexistent';
      Equipment.findOne = jest.fn().mockResolvedValue(null);

      await deleteEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Equipment not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'equip-1';
      Equipment.findOne = jest.fn().mockRejectedValue(new Error('DB error'));

      await deleteEquipment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getEquipmentServiceHistory ───────────────────────────────────────────────

  describe('getEquipmentServiceHistory', () => {
    test('returns service history for found equipment', async () => {
      req.params.id = 'equip-1';
      const populatedEquipment = {
        ...mockEquipment,
        serviceHistory: [{ _id: 'call-1', callNumber: 'SC-000001' }],
      };
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(populatedEquipment),
      });

      await getEquipmentServiceHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        equipmentId: 'EQ-000001',
        equipmentType: 'HVAC',
        brand: 'Daikin',
        model: 'FTX35',
        serviceHistory: [{ _id: 'call-1', callNumber: 'SC-000001' }],
      });
    });

    test('returns empty service history when none exists', async () => {
      req.params.id = 'equip-1';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({ ...mockEquipment, serviceHistory: null }),
      });

      await getEquipmentServiceHistory(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.serviceHistory).toEqual([]);
    });

    test('returns 404 when equipment not found', async () => {
      req.params.id = 'nonexistent';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getEquipmentServiceHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Equipment not found' });
    });

    test('returns 500 on database error', async () => {
      req.params.id = 'equip-1';
      Equipment.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getEquipmentServiceHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getEquipmentWarrantyStatus ───────────────────────────────────────────────

  describe('getEquipmentWarrantyStatus', () => {
    const now = new Date();
    const future60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now
    const future15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now (expiring soon)
    const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    test('categorizes equipment by warranty status', async () => {
      const allEquipment = [
        { ...mockEquipment, _id: 'eq-1', equipmentId: 'EQ-000001', warrantyExpiry: future60, customer: mockCustomer },
        { ...mockEquipment, _id: 'eq-2', equipmentId: 'EQ-000002', warrantyExpiry: future15, customer: mockCustomer },
        { ...mockEquipment, _id: 'eq-3', equipmentId: 'EQ-000003', warrantyExpiry: past, customer: mockCustomer },
        { ...mockEquipment, _id: 'eq-4', equipmentId: 'EQ-000004', warrantyExpiry: null, customer: mockCustomer },
      ];

      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(allEquipment),
      });

      await getEquipmentWarrantyStatus(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.summary.total).toBe(4);
      expect(response.summary.underWarranty).toBe(2); // future60 and future15
      expect(response.summary.expiringSoon).toBe(1); // only future15 (within 30 days)
      expect(response.summary.expired).toBe(1); // past
      expect(response.summary.noWarranty).toBe(1); // null warrantyExpiry
    });

    test('returns correct expiringSoon and expired arrays', async () => {
      const allEquipment = [
        { ...mockEquipment, _id: 'eq-2', equipmentId: 'EQ-000002', warrantyExpiry: future15, customer: mockCustomer },
        { ...mockEquipment, _id: 'eq-3', equipmentId: 'EQ-000003', warrantyExpiry: past, customer: mockCustomer },
      ];

      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(allEquipment),
      });

      await getEquipmentWarrantyStatus(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.expiringSoon).toHaveLength(1);
      expect(response.expiringSoon[0].equipmentId).toBe('EQ-000002');
      expect(response.expired).toHaveLength(1);
      expect(response.expired[0].equipmentId).toBe('EQ-000003');
    });

    test('returns empty summary when no equipment exists', async () => {
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await getEquipmentWarrantyStatus(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.summary.total).toBe(0);
      expect(response.expiringSoon).toHaveLength(0);
      expect(response.expired).toHaveLength(0);
    });

    test('returns 500 on database error', async () => {
      Equipment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('DB error')),
      });

      await getEquipmentWarrantyStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
