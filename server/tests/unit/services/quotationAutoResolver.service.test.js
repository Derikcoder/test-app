/**
 * @file quotationAutoResolver.service.test.js
 * @description Unit tests for quotation auto resolver service
 */

import { resolveAutoMachineDataForQuote } from '../../../services/quotationAutoResolver.service.js';
import Equipment from '../../../models/Equipment.model.js';

const buildFindChain = (result) => {
  const chain = {
    populate: jest.fn(),
    sort: jest.fn(),
    lean: jest.fn(),
  };

  chain.populate.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.lean.mockResolvedValue(result);

  return chain;
};

describe('quotationAutoResolver.service', () => {
  let findSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    findSpy = jest.spyOn(Equipment, 'find');
  });

  afterEach(() => {
    findSpy.mockRestore();
  });

  test('prefers equipment history over booking request data', async () => {
    const findChain = buildFindChain([
      {
        _id: 'eq-1',
        equipmentId: 'EQ-000001',
        equipmentType: 'Generator',
        brand: 'Perkins',
        model: 'Perkins 404A',
        serialNumber: 'SER-1',
        siteId: 'site-1',
        lastServiceDate: '2026-03-01T00:00:00.000Z',
        serviceHistory: [
          {
            callNumber: 'SC-000012',
            serviceType: 'Emergency Repair',
            status: 'completed',
            completedDate: '2026-03-01T00:00:00.000Z',
          },
        ],
      },
    ]);

    findSpy.mockReturnValue(findChain);

    const result = await resolveAutoMachineDataForQuote({
      customerId: 'customer-1',
      siteId: 'site-1',
      serviceType: 'Emergency Repair',
      bookingRequest: {
        generatorDetails: {
          machineModelNumber: 'Booking Model',
        },
      },
      createdBy: 'user-1',
    });

    expect(result.source).toBe('equipment-history');
    expect(result.templateSeed.machineModelNumber).toBe('Perkins 404A');
    expect(result.templateSeed.serviceType).toBe('Emergency Repair');
    expect(result.confidence).toBe('high');
    expect(result.recentServiceHistory).toHaveLength(1);
    expect(result.recentServiceHistory[0]).toEqual(
      expect.objectContaining({
        callNumber: 'SC-000012',
        serviceType: 'Emergency Repair',
      })
    );
    expect(result.historyStats).toEqual(
      expect.objectContaining({
        totalEquipmentEvaluated: 1,
        totalHistoryEventsConsidered: 1,
        matchedServiceTypeEvents: 1,
      })
    );
    expect(result.evaluatedEquipment).toHaveLength(1);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'customer-1',
        siteId: 'site-1',
        createdBy: 'user-1',
      })
    );
  });

  test('falls back to booking request when no equipment candidates are available', async () => {
    const findChain = buildFindChain([]);
    findSpy.mockReturnValue(findChain);

    const result = await resolveAutoMachineDataForQuote({
      customerId: 'customer-1',
      serviceType: 'Scheduled Maintenance',
      bookingRequest: {
        generatorDetails: {
          machineModelNumber: 'Cummins C55D5',
          siteName: 'Main Plant',
        },
      },
      createdBy: 'user-1',
    });

    expect(result.source).toBe('booking-request');
    expect(result.templateSeed.machineModelNumber).toBe('Cummins C55D5');
    expect(result.templateSeed.serviceType).toBe('Scheduled Maintenance');
    expect(result.confidence).toBe('medium');
    expect(result.recentServiceHistory).toEqual([]);
    expect(result.bookingSeed).toEqual(
      expect.objectContaining({
        machineModelNumber: 'Cummins C55D5',
        siteName: 'Main Plant',
      })
    );
  });

  test('returns generic fallback when no machine data is available', async () => {
    const findChain = buildFindChain([]);
    findSpy.mockReturnValue(findChain);

    const result = await resolveAutoMachineDataForQuote({
      customerId: 'customer-1',
      serviceType: '',
      bookingRequest: null,
      createdBy: 'user-1',
    });

    expect(result.source).toBe('generic-fallback');
    expect(result.templateSeed.machineModelNumber).toBe('');
    expect(result.templateSeed.serviceType).toBe('Scheduled Maintenance');
    expect(result.confidence).toBe('low');
    expect(result.recentServiceHistory).toEqual([]);
    expect(result.evaluatedEquipment).toEqual([]);
  });

  test('throws when customerId is missing', async () => {
    await expect(resolveAutoMachineDataForQuote({})).rejects.toThrow(
      'customerId is required for auto machine-data resolution'
    );
  });
});
