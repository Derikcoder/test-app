/**
 * @file quotationAutoResolver.service.js
 * @description Resolves machine/service context for Auto quotation templates
 * @module Services/QuotationAutoResolver
 */

import Equipment from '../models/Equipment.model.js';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const isServiceTypeMatch = (requestedType, candidateType) => {
  if (!requestedType || !candidateType) return false;
  return requestedType.includes(candidateType) || candidateType.includes(requestedType);
};

const toTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapServiceHistoryEvent = (event = null) => ({
  callNumber: event?.callNumber || '',
  serviceType: event?.serviceType || '',
  status: event?.status || '',
  completedDate: event?.completedDate || null,
  createdAt: event?.createdAt || null,
});

const getBookingMachineSeed = (bookingRequest = null) => {
  const generatorDetails = bookingRequest?.generatorDetails || {};

  return {
    machineModelNumber: String(
      generatorDetails.machineModelNumber || generatorDetails.generatorMakeModel || ''
    ).trim(),
    generatorMakeModel: String(generatorDetails.generatorMakeModel || '').trim(),
    siteName: String(generatorDetails.siteName || '').trim(),
    generatorCapacityKva: Number.isFinite(Number(generatorDetails.generatorCapacityKva))
      ? Number(generatorDetails.generatorCapacityKva)
      : null,
  };
};

const scoreEquipmentCandidate = ({ equipment, serviceType, siteId }) => {
  const normalizedRequestedServiceType = normalizeText(serviceType);
  const normalizedEquipmentType = normalizeText(equipment?.equipmentType);
  const history = Array.isArray(equipment?.serviceHistory) ? equipment.serviceHistory : [];

  const hasHistory = history.length > 0;
  const historyServiceTypeMatch = history.some((entry) =>
    isServiceTypeMatch(normalizedRequestedServiceType, normalizeText(entry?.serviceType))
  );
  const equipmentTypeMatch = isServiceTypeMatch(normalizedRequestedServiceType, normalizedEquipmentType);
  const siteMatches = siteId && equipment?.siteId && String(siteId) === String(equipment.siteId);
  const hasMachineIdentity = Boolean(equipment?.model || equipment?.brand || equipment?.serialNumber);

  let score = 0;
  if (hasHistory) score += 40;
  if (equipment?.lastServiceDate) score += 15;
  if (historyServiceTypeMatch || equipmentTypeMatch) score += 25;
  if (siteMatches) score += 10;
  if (hasMachineIdentity) score += 10;

  return {
    score,
    hasHistory,
    equipmentTypeMatch,
    historyServiceTypeMatch,
    siteMatches,
    hasMachineIdentity,
  };
};

/**
 * Resolve machine and service seed data for Auto quotation templates.
 *
 * Source priority:
 * 1) equipment-history (customer machine records + service history)
 * 2) booking-request (service call intake payload)
 * 3) generic-fallback
 *
 * @param {Object} params - Resolver input
 * @param {string|ObjectId} params.customerId - Customer identifier
 * @param {string|ObjectId} [params.siteId] - Optional site identifier
 * @param {string} [params.serviceType] - Requested service type
 * @param {Object} [params.bookingRequest] - Service call booking payload
 * @param {string|ObjectId} [params.createdBy] - User scope for ownership filtering
 * @returns {Promise<Object>} Resolved machine/service seed and provenance
 */
export const resolveAutoMachineDataForQuote = async ({
  customerId,
  siteId = null,
  serviceType = '',
  bookingRequest = null,
  createdBy = null,
}) => {
  if (!customerId) {
    throw new Error('customerId is required for auto machine-data resolution');
  }

  const equipmentFilter = { customer: customerId };
  if (siteId) equipmentFilter.siteId = siteId;
  if (createdBy) equipmentFilter.createdBy = createdBy;

  const equipmentRecords = await Equipment.find(equipmentFilter)
    .populate({
      path: 'serviceHistory',
      select: 'callNumber serviceType status completedDate createdAt',
      match: {
        ...(createdBy ? { createdBy } : {}),
        status: { $in: ['completed', 'invoiced', 'in-progress', 'assigned', 'scheduled'] },
      },
      options: {
        sort: { completedDate: -1, createdAt: -1 },
        limit: 5,
      },
    })
    .sort({ lastServiceDate: -1, updatedAt: -1, createdAt: -1 })
    .lean();

  const equipmentCandidates = (equipmentRecords || []).map((equipment) => {
    const scoring = scoreEquipmentCandidate({ equipment, serviceType, siteId });
    const history = Array.isArray(equipment.serviceHistory) ? equipment.serviceHistory : [];
    return {
      equipment,
      history,
      ...scoring,
      latestHistoryEvent: history[0] || null,
    };
  });

  equipmentCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return toTimestamp(b.equipment?.lastServiceDate) - toTimestamp(a.equipment?.lastServiceDate);
  });

  const bestEquipmentMatch = equipmentCandidates[0] || null;
  const totalHistoryEventsConsidered = equipmentCandidates.reduce(
    (sum, candidate) => sum + candidate.history.length,
    0
  );
  const normalizedRequestedServiceType = normalizeText(serviceType);
  const matchedServiceTypeEvents = equipmentCandidates.reduce(
    (sum, candidate) => sum + candidate.history.filter((entry) =>
      isServiceTypeMatch(normalizedRequestedServiceType, normalizeText(entry?.serviceType))
    ).length,
    0
  );

  const evaluatedEquipment = equipmentCandidates.slice(0, 5).map((candidate) => ({
    equipmentId: candidate.equipment?.equipmentId || '',
    equipmentType: candidate.equipment?.equipmentType || '',
    brand: candidate.equipment?.brand || '',
    model: candidate.equipment?.model || '',
    siteId: candidate.equipment?.siteId || null,
    score: candidate.score,
    hasHistory: candidate.hasHistory,
    historyServiceTypeMatch: candidate.historyServiceTypeMatch,
    equipmentTypeMatch: candidate.equipmentTypeMatch,
    siteMatches: candidate.siteMatches,
    historyCount: candidate.history.length,
    lastServiceDate: candidate.equipment?.lastServiceDate || null,
  }));

  if (bestEquipmentMatch && (bestEquipmentMatch.hasHistory || bestEquipmentMatch.hasMachineIdentity)) {
    const { equipment, latestHistoryEvent } = bestEquipmentMatch;
    const resolvedServiceType =
      serviceType ||
      latestHistoryEvent?.serviceType ||
      equipment?.equipmentType ||
      'Scheduled Maintenance';

    return {
      source: 'equipment-history',
      confidence: bestEquipmentMatch.hasHistory ? 'high' : 'medium',
      templateSeed: {
        serviceType: resolvedServiceType,
        machineModelNumber: String(equipment?.model || equipment?.brand || '').trim(),
      },
      requestedContext: {
        customerId,
        siteId,
        requestedServiceType: serviceType || '',
      },
      equipment: {
        id: equipment?._id || null,
        equipmentId: equipment?.equipmentId || '',
        equipmentType: equipment?.equipmentType || '',
        brand: equipment?.brand || '',
        model: equipment?.model || '',
        serialNumber: equipment?.serialNumber || '',
        siteId: equipment?.siteId || null,
        lastServiceDate: equipment?.lastServiceDate || null,
      },
      recentServiceCall: latestHistoryEvent
        ? mapServiceHistoryEvent(latestHistoryEvent)
        : null,
      recentServiceHistory: bestEquipmentMatch.history.map(mapServiceHistoryEvent),
      historyStats: {
        totalEquipmentEvaluated: equipmentCandidates.length,
        totalHistoryEventsConsidered,
        matchedServiceTypeEvents,
        selectedEquipmentScore: bestEquipmentMatch.score,
      },
      evaluatedEquipment,
    };
  }

  const bookingMachineSeed = getBookingMachineSeed(bookingRequest);
  if (bookingMachineSeed.machineModelNumber || bookingMachineSeed.generatorMakeModel || bookingMachineSeed.siteName) {
    return {
      source: 'booking-request',
      confidence: 'medium',
      templateSeed: {
        serviceType: serviceType || 'Scheduled Maintenance',
        machineModelNumber: bookingMachineSeed.machineModelNumber || bookingMachineSeed.generatorMakeModel,
      },
      requestedContext: {
        customerId,
        siteId,
        requestedServiceType: serviceType || '',
      },
      equipment: null,
      recentServiceCall: null,
      recentServiceHistory: [],
      bookingSeed: bookingMachineSeed,
      historyStats: {
        totalEquipmentEvaluated: equipmentCandidates.length,
        totalHistoryEventsConsidered,
        matchedServiceTypeEvents,
        selectedEquipmentScore: 0,
      },
      evaluatedEquipment,
    };
  }

  return {
    source: 'generic-fallback',
    confidence: 'low',
    templateSeed: {
      serviceType: serviceType || 'Scheduled Maintenance',
      machineModelNumber: '',
    },
    requestedContext: {
      customerId,
      siteId,
      requestedServiceType: serviceType || '',
    },
    equipment: null,
    recentServiceCall: null,
    recentServiceHistory: [],
    historyStats: {
      totalEquipmentEvaluated: equipmentCandidates.length,
      totalHistoryEventsConsidered,
      matchedServiceTypeEvents,
      selectedEquipmentScore: 0,
    },
    evaluatedEquipment,
  };
};

export default resolveAutoMachineDataForQuote;
