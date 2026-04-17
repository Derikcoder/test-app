/**
 * @file customerAssets.js
 * @description Helpers for deriving customer machine/assets and service history from saved assets plus rendered service calls.
 */

const normalizeValue = (value = '') => String(value || '').trim();
const normalizeKeyText = (value = '') => normalizeValue(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const splitBrandModel = (value = '') => {
  const normalized = normalizeValue(value);
  if (!normalized) return { brand: '', model: '' };

  const spacedParts = normalized.split(/\s+/).filter(Boolean);
  if (spacedParts.length === 1) {
    return { brand: spacedParts[0], model: '' };
  }

  return {
    brand: spacedParts[0],
    model: spacedParts.slice(1).join(' '),
  };
};

const buildAssetKeyFromParts = ({ assetName = '', brand = '', model = '', serialNumber = '', category = '' }) => {
  const normalizedSerial = normalizeKeyText(serialNumber);
  if (normalizedSerial) return `serial-${normalizedSerial}`;

  const normalizedBrand = normalizeKeyText(brand);
  const normalizedModel = normalizeKeyText(model);
  if (normalizedBrand || normalizedModel) return `machine-${normalizedBrand}-${normalizedModel}`.replace(/-+/g, '-').replace(/-$/g, '');

  const normalizedName = normalizeKeyText(assetName);
  const normalizedCategory = normalizeKeyText(category);
  return `asset-${normalizedName}-${normalizedCategory}`.replace(/-+/g, '-').replace(/-$/g, '');
};

const extractMachineSeedFromText = (text = '') => {
  const raw = String(text || '');
  const generatorMatch = raw.match(/Generator\s*:\s*([^\n]+)/i);
  const modelMatch = raw.match(/Machine Model Number\s*:\s*([^\n]+)/i);
  const siteMatch = raw.match(/Site Name\s*:\s*([^\n]+)/i);

  return {
    generatorMakeModel: normalizeValue(generatorMatch?.[1]),
    machineModelNumber: normalizeValue(modelMatch?.[1]),
    siteName: normalizeValue(siteMatch?.[1]),
  };
};

const getDerivedServiceAsset = (call) => {
  const generatorDetails = call?.bookingRequest?.generatorDetails || {};
  const descriptionSeed = extractMachineSeedFromText(`${call?.title || ''}\n${call?.description || ''}`);
  const generatedLabel = normalizeValue(generatorDetails.generatorMakeModel || descriptionSeed.generatorMakeModel);
  const parsedIdentity = splitBrandModel(generatedLabel);
  const siteName = normalizeValue(generatorDetails.siteName || descriptionSeed.siteName);
  const model = normalizeValue(generatorDetails.machineModelNumber || descriptionSeed.machineModelNumber) || parsedIdentity.model;
  const brand = parsedIdentity.brand;
  const category = normalizeValue(call?.equipment?.equipmentType) || (generatedLabel || model ? 'Generator' : normalizeValue(call?.serviceType));
  const assetName = siteName || [brand, model].filter(Boolean).join(' ') || normalizeValue(call?.serviceLocation) || '';

  if (!assetName && !brand && !model && !category) return null;

  return {
    assetName: assetName || 'Serviced Machine',
    brand,
    model,
    category: category || 'General',
    serialNumber: normalizeValue(call?.equipment?.serialNumber),
    notes: '',
    status: 'active',
  };
};

const sortByRecentService = (a, b) => {
  const left = Math.max(...(a.relatedCalls || []).map((call) => new Date(call?.createdAt || 0).getTime()), 0);
  const right = Math.max(...(b.relatedCalls || []).map((call) => new Date(call?.createdAt || 0).getTime()), 0);
  if (right !== left) return right - left;
  return String(a.assetName || '').localeCompare(String(b.assetName || ''));
};

export const deriveCustomerAssets = (customer, serviceCalls = []) => {
  const assetMap = new Map();

  const upsertAsset = (assetSeed, relatedCall = null) => {
    if (!assetSeed) return;

    const nextAsset = {
      assetName: normalizeValue(assetSeed.assetName),
      brand: normalizeValue(assetSeed.brand),
      model: normalizeValue(assetSeed.model),
      category: normalizeValue(assetSeed.category) || 'General',
      serialNumber: normalizeValue(assetSeed.serialNumber),
      notes: normalizeValue(assetSeed.notes),
      status: normalizeValue(assetSeed.status) || 'active',
    };

    if (!nextAsset.assetName && !nextAsset.brand && !nextAsset.model) return;

    const assetKey = buildAssetKeyFromParts(nextAsset);
    const existing = assetMap.get(assetKey) || {
      ...nextAsset,
      assetKey,
      serviceCount: 0,
      relatedCalls: [],
    };

    existing.assetName = existing.assetName || nextAsset.assetName || 'Serviced Machine';
    existing.brand = existing.brand || nextAsset.brand;
    existing.model = existing.model || nextAsset.model;
    existing.category = existing.category || nextAsset.category || 'General';
    existing.serialNumber = existing.serialNumber || nextAsset.serialNumber;
    existing.notes = existing.notes || nextAsset.notes;
    existing.status = existing.status || nextAsset.status || 'active';

    if (relatedCall && !existing.relatedCalls.some((call) => String(call?._id) === String(relatedCall?._id))) {
      existing.relatedCalls.push(relatedCall);
      existing.serviceCount = existing.relatedCalls.length;
    }

    assetMap.set(assetKey, existing);
  };

  (customer?.serviceAssets || []).forEach((asset) => upsertAsset(asset));
  (serviceCalls || []).forEach((call) => upsertAsset(getDerivedServiceAsset(call), call));

  return Array.from(assetMap.values()).sort(sortByRecentService);
};
