/**
 * @file CustomerSelfServicePanel.jsx
 * @description Customer self-service workspace for profile editing, registered machines, and grouped service insights.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deriveCustomerAssets } from '../utils/customerAssets';
import { getCustomerRouteSegment } from '../utils/authRedirect';
import api from '../api/axios';

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const EMPTY_ASSET = {
  assetName: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  notes: '',
  status: 'active',
};

const extractNotesText = (rawNotes) => {
  if (!rawNotes) return '';

  try {
    const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
    if (parsed && typeof parsed === 'object') {
      return parsed.extraNotes || parsed.notes || '';
    }
  } catch {
    return String(rawNotes);
  }

  return String(rawNotes || '');
};

const hasAddressDetails = (address = {}) => Object.values(address || {}).some((value) => String(value || '').trim());

const parseFlatAddress = (address = '') => {
  const parsed = {
    streetAddress: '',
    complexName: '',
    siteAddressDetail: '',
    suburb: '',
    cityDistrict: '',
    province: '',
    postalCode: '',
  };

  const rawParts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawParts.length === 0) return parsed;

  const unlabeledParts = [];

  rawParts.forEach((part) => {
    if (/^complex\/industrial park\s*:/i.test(part)) {
      parsed.complexName = part.replace(/^complex\/industrial park\s*:/i, '').trim();
      return;
    }

    if (/^unit\/site detail\s*:/i.test(part)) {
      parsed.siteAddressDetail = part.replace(/^unit\/site detail\s*:/i, '').trim();
      return;
    }

    unlabeledParts.push(part);
  });

  if (unlabeledParts.length > 0) {
    const maybePostal = unlabeledParts[unlabeledParts.length - 1];
    if (/^(postal code\s*:)?\s*[A-Za-z0-9 -]{3,10}$/i.test(maybePostal) && /\d/.test(maybePostal)) {
      parsed.postalCode = maybePostal.replace(/^postal code\s*:/i, '').trim();
      unlabeledParts.pop();
    }
  }

  if (unlabeledParts.length === 1) {
    parsed.streetAddress = unlabeledParts[0];
  } else if (unlabeledParts.length === 2) {
    [parsed.streetAddress, parsed.cityDistrict] = unlabeledParts;
  } else if (unlabeledParts.length === 3) {
    [parsed.streetAddress, parsed.cityDistrict, parsed.province] = unlabeledParts;
  } else if (unlabeledParts.length >= 4) {
    parsed.province = unlabeledParts[unlabeledParts.length - 1] || '';
    parsed.cityDistrict = unlabeledParts[unlabeledParts.length - 2] || '';
    parsed.suburb = unlabeledParts[unlabeledParts.length - 3] || '';
    parsed.streetAddress = unlabeledParts.slice(0, -3).join(', ');
  }

  return parsed;
};

const buildInitialFormData = (customer) => {
  const existingDetails = customer?.physicalAddressDetails || {};
  const parsedFallback = parseFlatAddress(customer?.physicalAddress || '');
  const mergedDetails = hasAddressDetails(existingDetails)
    ? {
        streetAddress: existingDetails?.streetAddress || parsedFallback.streetAddress,
        complexName: existingDetails?.complexName || parsedFallback.complexName,
        siteAddressDetail: existingDetails?.siteAddressDetail || parsedFallback.siteAddressDetail,
        suburb: existingDetails?.suburb || parsedFallback.suburb,
        cityDistrict: existingDetails?.cityDistrict || parsedFallback.cityDistrict,
        province: existingDetails?.province || parsedFallback.province,
        postalCode: existingDetails?.postalCode || parsedFallback.postalCode,
      }
    : parsedFallback;

  return {
    contactFirstName: customer?.contactFirstName || '',
    contactLastName: customer?.contactLastName || '',
    email: customer?.email || '',
    phoneNumber: customer?.phoneNumber || '',
    alternatePhone: customer?.alternatePhone || '',
    streetAddress: mergedDetails.streetAddress || '',
    complexName: mergedDetails.complexName || '',
    siteAddressDetail: mergedDetails.siteAddressDetail || '',
    suburb: mergedDetails.suburb || '',
    cityDistrict: mergedDetails.cityDistrict || '',
    province: mergedDetails.province || '',
    postalCode: mergedDetails.postalCode || '',
    notes: extractNotesText(customer?.notes),
    password: '',
    confirmPassword: '',
    serviceAssets: Array.isArray(customer?.serviceAssets) && customer.serviceAssets.length > 0
      ? customer.serviceAssets.map((asset) => ({ ...EMPTY_ASSET, ...asset }))
      : [{ ...EMPTY_ASSET }],
  };
};

const getAgentLabel = (call) => {
  const first = call?.assignedAgent?.firstName || '';
  const last = call?.assignedAgent?.lastName || '';
  const name = `${first} ${last}`.trim();
  return name || call?.assignedAgent?.employeeId || 'Unassigned Agent';
};

const normalizeAssets = (assets = []) => assets
  .filter((asset) => asset?.assetName?.trim())
  .map((asset) => ({
    assetName: asset.assetName.trim(),
    category: asset.category?.trim() || 'general',
    brand: asset.brand?.trim() || '',
    model: asset.model?.trim() || '',
    serialNumber: asset.serialNumber?.trim() || '',
    notes: asset.notes?.trim() || '',
    status: asset.status || 'active',
  }));

const getServiceCountLabel = (count) => (count === 1 ? 'View 1 service' : `View ${count} services`);

const CustomerSelfServicePanel = ({ customerId, customer, setCustomer, serviceCalls = [], token, isOwnProfile }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [formData, setFormData] = useState(buildInitialFormData(customer));

  useEffect(() => {
    setFormData(buildInitialFormData(customer));
  }, [customer]);

  const latestReview = useMemo(() => {
    const stagedEntries = serviceCalls.flatMap((call) => {
      const historyEntries = Array.isArray(call?.feedbackHistory) ? call.feedbackHistory : [];

      if (historyEntries.length > 0) {
        return historyEntries.map((entry) => ({
          ...entry,
          call,
          agentLabel: getAgentLabel(call),
          serviceType: call?.serviceType || 'General Service',
        }));
      }

      if (call?.rating || call?.customerFeedback) {
        return [{
          stage: 'completedService',
          rating: call.rating || 0,
          feedback: call.customerFeedback || '',
          submittedAt: call.ratedDate || call.updatedAt || call.createdAt,
          call,
          agentLabel: getAgentLabel(call),
          serviceType: call?.serviceType || 'General Service',
        }];
      }

      return [];
    });

    return stagedEntries
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0] || null;
  }, [serviceCalls]);

  const groupedServices = useMemo(() => {
    return serviceCalls.reduce((acc, call) => {
      const category = call?.serviceType || 'General Service';
      const agent = getAgentLabel(call);

      if (!acc[category]) acc[category] = {};
      if (!acc[category][agent]) acc[category][agent] = [];
      acc[category][agent].push(call);

      return acc;
    }, {});
  }, [serviceCalls]);

  const assetInventory = useMemo(() => deriveCustomerAssets(customer, serviceCalls), [customer, serviceCalls]);
  const customerProfileSegment = getCustomerRouteSegment(customer?.customerType);

  const handleOpenAssetHistory = (asset) => {
    if (!customerProfileSegment || !asset?.assetKey) return;

    navigate(
      `/customers/${customerProfileSegment}/${customerId}/assets/${encodeURIComponent(asset.assetKey)}`,
      {
        state: {
          asset,
          returnPath: `/customers/${customerProfileSegment}/${customerId}`,
        },
      }
    );
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateAsset = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      serviceAssets: current.serviceAssets.map((asset, assetIndex) => (
        assetIndex === index ? { ...asset, [field]: value } : asset
      )),
    }));
  };

  const addAsset = () => {
    setFormData((current) => ({
      ...current,
      serviceAssets: [...current.serviceAssets, { ...EMPTY_ASSET }],
    }));
  };

  const removeAsset = (index) => {
    setFormData((current) => ({
      ...current,
      serviceAssets: current.serviceAssets.filter((_, assetIndex) => assetIndex !== index),
    }));
  };

  const handleSave = async () => {
    const trimmedPassword = formData.password.trim();
    const trimmedConfirmPassword = formData.confirmPassword.trim();

    if (trimmedPassword || trimmedConfirmPassword) {
      if (trimmedPassword.length < 6) {
        setSaveError('Password must be at least 6 characters.');
        setSaveMessage('');
        return;
      }

      if (trimmedPassword !== trimmedConfirmPassword) {
        setSaveError('Passwords do not match.');
        setSaveMessage('');
        return;
      }
    }

    try {
      setSaving(true);
      setSaveError('');
      setSaveMessage('');

      const normalizedNotes = (() => {
        try {
          const parsed = typeof customer?.notes === 'string' ? JSON.parse(customer.notes) : customer?.notes;
          if (parsed && typeof parsed === 'object') {
            return JSON.stringify({ ...parsed, extraNotes: formData.notes });
          }
        } catch {
          return formData.notes;
        }

        return formData.notes;
      })();

      const nextPhysicalAddressDetails = {
        streetAddress: formData.streetAddress.trim(),
        complexName: formData.complexName.trim(),
        siteAddressDetail: formData.siteAddressDetail.trim(),
        suburb: formData.suburb.trim(),
        cityDistrict: formData.cityDistrict.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim(),
      };

      const physicalAddress = [
        nextPhysicalAddressDetails.streetAddress,
        nextPhysicalAddressDetails.complexName,
        nextPhysicalAddressDetails.siteAddressDetail,
        nextPhysicalAddressDetails.suburb,
        [nextPhysicalAddressDetails.cityDistrict, nextPhysicalAddressDetails.province].filter(Boolean).join(', '),
        nextPhysicalAddressDetails.postalCode,
      ].filter(Boolean).join(', ') || customer?.physicalAddress || '';

      const payload = {
        contactFirstName: formData.contactFirstName.trim(),
        contactLastName: formData.contactLastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        alternatePhone: formData.alternatePhone.trim(),
        physicalAddress,
        physicalAddressDetails: hasAddressDetails(nextPhysicalAddressDetails)
          ? nextPhysicalAddressDetails
          : (customer?.physicalAddressDetails || {}),
        notes: normalizedNotes,
        serviceAssets: normalizeAssets(formData.serviceAssets),
      };

      const response = await api.put(
        `/customers/${customerId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (trimmedPassword) {
        const authResponse = await api.put(
          '/auth/profile',
          {
            email: payload.email,
            phoneNumber: payload.phoneNumber,
            physicalAddress,
            password: trimmedPassword,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (typeof updateUser === 'function') {
          updateUser(authResponse.data);
        }
      } else if (typeof updateUser === 'function' && user) {
        updateUser({
          ...user,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          physicalAddress,
        });
      }

      setCustomer(response.data);
      setFormData(buildInitialFormData(response.data));
      setSaveMessage(
        trimmedPassword
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully. Your service preferences are now up to date.'
      );
      setIsEditing(false);
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {isOwnProfile ? (
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-100">Manage your service profile</p>
              <p className="mt-1 text-xs text-cyan-50/80">
                Update your contact details, address, machines, and account password in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setFormData(buildInitialFormData(customer));
                }
                setIsEditing((current) => !current);
                setSaveError('');
                setSaveMessage('');
              }}
              className="rounded-lg border border-cyan-500/40 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-slate-900/70"
            >
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>
        </div>
      ) : null}

      {saveError ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{saveError}</div> : null}
      {saveMessage ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{saveMessage}</div> : null}

      {isOwnProfile && isEditing ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="contactFirstName">
              First Name
              <input id="contactFirstName" value={formData.contactFirstName} onChange={(e) => updateField('contactFirstName', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="contactLastName">
              Last Name
              <input id="contactLastName" value={formData.contactLastName} onChange={(e) => updateField('contactLastName', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="email">
              Email
              <input id="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="phoneNumber">
              Phone
              <input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2" htmlFor="alternatePhone">
              Alternate Phone
              <input id="alternatePhone" value={formData.alternatePhone} onChange={(e) => updateField('alternatePhone', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2" htmlFor="streetAddress">
              Street Address
              <input id="streetAddress" value={formData.streetAddress} onChange={(e) => updateField('streetAddress', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="suburb">
              Suburb
              <input id="suburb" value={formData.suburb} onChange={(e) => updateField('suburb', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="cityDistrict">
              City / District
              <input id="cityDistrict" value={formData.cityDistrict} onChange={(e) => updateField('cityDistrict', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="province">
              Province
              <input id="province" value={formData.province} onChange={(e) => updateField('province', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="postalCode">
              Postal Code
              <input id="postalCode" value={formData.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/90">Registered Machines / Assets</p>
                <p className="text-xs text-white/50">Add future service items so your profile stays service-ready.</p>
              </div>
              <button type="button" onClick={addAsset} className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/70">
                + Add Machine
              </button>
            </div>

            <div className="space-y-3">
              {formData.serviceAssets.map((asset, index) => (
                <div key={`asset-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-white/10 bg-white/5 p-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    Machine / Asset Name
                    <input value={asset.assetName} onChange={(e) => updateAsset(index, 'assetName', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    Category
                    <input value={asset.category} onChange={(e) => updateAsset(index, 'category', e.target.value)} placeholder="Electrical, Generator, HVAC..." className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    Brand
                    <input value={asset.brand} onChange={(e) => updateAsset(index, 'brand', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    Model / Serial
                    <input value={asset.model} onChange={(e) => updateAsset(index, 'model', e.target.value)} placeholder="Model" className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-white/60 md:col-span-2">
                    Notes
                    <input value={asset.notes} onChange={(e) => updateAsset(index, 'notes', e.target.value)} placeholder="Anything we should know before the next booking" className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                  </label>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="button" onClick={() => removeAsset(index)} className="text-xs font-semibold text-red-300 hover:text-red-200">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-amber-100">Change Password</p>
              <p className="mt-1 text-xs text-amber-50/80">
                Leave these fields blank if you do not want to change your login password today.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="password">
                New Password
                <input id="password" type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="confirmPassword">
                Confirm New Password
                <input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-white/60" htmlFor="notes">
            Service Notes / Preferences
            <textarea id="notes" rows={3} value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
          </label>

          <div className="flex justify-end">
            <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-cyan-700 bg-cyan-950 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-900 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/90">Machines and Serviceable Assets</p>
        <p className="mt-1 text-xs text-white/50">Registered assets plus machines detected from the services already rendered for this customer.</p>
        {assetInventory.length > 0 ? (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {assetInventory.map((asset) => (
              <div key={asset.assetKey} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white/90">{asset.assetName || 'Serviced Machine'}</p>
                    <p className="mt-1 text-xs text-white/50">{asset.notes || 'Machine record from your customer profile and completed service history.'}</p>
                  </div>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">
                    {asset.status || 'active'}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-white/75">
                  <p><span className="font-semibold text-white/90">Name:</span> {asset.assetName || '—'}</p>
                  <p><span className="font-semibold text-white/90">Brand:</span> {asset.brand || '—'}</p>
                  <p><span className="font-semibold text-white/90">Model:</span> {asset.model || '—'}</p>
                  <p><span className="font-semibold text-white/90">Category:</span> {asset.category || 'General'}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Total Services</p>
                    <p className="text-lg font-extrabold text-white">{asset.serviceCount || 0}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAssetHistory(asset)}
                    disabled={!asset.serviceCount}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {asset.serviceCount ? getServiceCountLabel(asset.serviceCount) : 'No services yet'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/40">No machines registered yet.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/90">Latest Customer Review</p>
        {latestReview ? (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-100">
              <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 uppercase tracking-wide">{latestReview.stage}</span>
              <span>{'★'.repeat(Number(latestReview.rating || 0))}</span>
              <span>Customer sentiment snapshot</span>
            </div>
            <p className="mt-2 text-sm text-white/85">{latestReview.feedback || 'No written feedback provided.'}</p>
            <p className="mt-2 text-[11px] text-white/50">Submitted {formatDate(latestReview.submittedAt)}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/40">No review has been posted yet.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/90">Services Rendered</p>
        <p className="mt-1 text-xs text-white/50">Grouped by service category and field service agent for clear history tracking.</p>

        {Object.keys(groupedServices).length === 0 ? (
          <p className="mt-3 text-sm text-white/40">No grouped service history is available yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(groupedServices).map(([category, agents]) => (
              <div key={category} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">{category}</p>
                <div className="mt-3 space-y-3">
                  {Object.entries(agents).map(([agent, calls]) => (
                    <div key={`${category}-${agent}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-semibold text-cyan-100">{agent}</p>
                      <ul className="mt-2 space-y-1 text-sm text-white/80">
                        {calls
                          .slice()
                          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                          .map((call) => (
                            <li key={call._id}>
                              {call.callNumber || call._id} — {call.title || call.description || 'Service Job'}
                              <span className="text-white/50"> · {call.status || 'pending'} · {formatDate(call.createdAt)}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSelfServicePanel;
