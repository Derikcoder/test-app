/**
 * @file BusinessCustomerProfile.jsx
 * @description Shared business customer profile with site and machine onboarding.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const EQUIPMENT_TYPES = [
  'Generator',
  'Emergency Power System',
  'UPS',
  'Solar System',
  'Pump',
  'Boiler',
  'Water Heater',
  'Compressor',
  'Other',
];

const EQUIPMENT_STATUS_OPTIONS = [
  'operational',
  'needs-service',
  'under-repair',
  'out-of-order',
  'decommissioned',
];

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

const getCustomerDisplayName = (customer) => {
  if (!customer) return '';

  return customer.businessName || `${customer.contactFirstName || ''} ${customer.contactLastName || ''}`.trim();
};

const getTypeTone = (customerType) => {
  const toneMap = {
    headOffice: 'border-purple-400/60 bg-purple-500/15 text-purple-100',
    branch: 'border-blue-400/60 bg-blue-500/15 text-blue-100',
    franchise: 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100',
    singleBusiness: 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100',
  };

  return toneMap[customerType] || 'border-white/20 bg-white/10 text-white';
};

const buildEmptySiteForm = (customer) => ({
  siteName: '',
  streetAddress: '',
  complexName: '',
  siteAddressDetail: '',
  suburb: '',
  cityDistrict: '',
  province: '',
  postalCode: '',
  contactPerson: `${customer?.contactFirstName || ''} ${customer?.contactLastName || ''}`.trim(),
  contactPhone: customer?.phoneNumber || '',
  contactEmail: customer?.email || '',
  serviceTypes: '',
  notes: '',
});

const buildEmptyEquipmentForm = (siteId = '') => ({
  siteId,
  equipmentType: 'Generator',
  customType: '',
  brand: '',
  model: '',
  serialNumber: '',
  location: '',
  installationDate: '',
  warrantyExpiry: '',
  nextServiceDate: '',
  status: 'operational',
  notes: '',
});

const BusinessCustomerProfile = ({ expectedType, typeLabel }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authToken = user?.token || '';
  const [customer, setCustomer] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteError, setSiteError] = useState('');
  const [equipmentError, setEquipmentError] = useState('');
  const [siteSuccess, setSiteSuccess] = useState('');
  const [equipmentSuccess, setEquipmentSuccess] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('all');
  const [siteForm, setSiteForm] = useState(buildEmptySiteForm(null));
  const [equipmentForm, setEquipmentForm] = useState(buildEmptyEquipmentForm(''));

  useEffect(() => {
    if (!authToken) {
      return undefined;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      setError('');

      try {
        const [customerResponse, equipmentResponse] = await Promise.all([
          api.get(`/customers/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
          api.get(`/equipment/customer/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        ]);

        const fetchedCustomer = customerResponse.data;

        if (expectedType && fetchedCustomer?.customerType !== expectedType) {
          setError(`This customer is not a ${typeLabel.toLowerCase()} profile.`);
          setCustomer(null);
          setEquipment([]);
          return;
        }

        setCustomer(fetchedCustomer);
        setEquipment(Array.isArray(equipmentResponse.data) ? equipmentResponse.data : []);
        setSiteForm(buildEmptySiteForm(fetchedCustomer));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch customer profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
    return undefined;
  }, [authToken, expectedType, id, typeLabel]);

  useEffect(() => {
    if (!customer?.sites?.length) {
      setSelectedSiteFilter('all');
      setEquipmentForm(buildEmptyEquipmentForm(''));
      return;
    }

    const firstSiteId = customer.sites[0]._id;

    setEquipmentForm((prev) => ({
      ...prev,
      siteId: prev.siteId || firstSiteId,
    }));
  }, [customer]);

  const filteredEquipment = useMemo(() => {
    if (selectedSiteFilter === 'all') {
      return equipment;
    }

    return equipment.filter((item) => String(item.siteId) === String(selectedSiteFilter));
  }, [equipment, selectedSiteFilter]);

  const equipmentBySite = useMemo(() => {
    return equipment.reduce((accumulator, item) => {
      const siteId = String(item.siteId || 'unassigned');
      accumulator[siteId] = (accumulator[siteId] || 0) + 1;
      return accumulator;
    }, {});
  }, [equipment]);

  const handleSiteInputChange = (event) => {
    setSiteForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleEquipmentInputChange = (event) => {
    setEquipmentForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const submitSite = async (event) => {
    event.preventDefault();
    setSiteError('');
    setSiteSuccess('');
    setSavingSite(true);

    try {
      const payload = {
        siteName: siteForm.siteName.trim(),
        addressDetails: {
          streetAddress: siteForm.streetAddress.trim(),
          complexName: siteForm.complexName.trim(),
          siteAddressDetail: siteForm.siteAddressDetail.trim(),
          suburb: siteForm.suburb.trim(),
          cityDistrict: siteForm.cityDistrict.trim(),
          province: siteForm.province.trim(),
          postalCode: siteForm.postalCode.trim(),
        },
        contactPerson: siteForm.contactPerson.trim(),
        contactPhone: siteForm.contactPhone.trim(),
        contactEmail: siteForm.contactEmail.trim(),
        serviceTypes: siteForm.serviceTypes
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        status: 'active',
        notes: siteForm.notes.trim(),
      };

      const response = await api.post(`/customers/${id}/sites`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const newSite = response.data;

      setCustomer((prev) => ({
        ...prev,
        sites: [...(prev?.sites || []), newSite],
      }));
      setSelectedSiteFilter(String(newSite._id));
      setEquipmentForm(buildEmptyEquipmentForm(String(newSite._id)));
      setSiteForm(buildEmptySiteForm(customer));
      setSiteSuccess(`${newSite.siteName} added successfully.`);
    } catch (err) {
      setSiteError(err.response?.data?.message || 'Failed to add site');
    } finally {
      setSavingSite(false);
    }
  };

  const submitEquipment = async (event) => {
    event.preventDefault();
    setEquipmentError('');
    setEquipmentSuccess('');
    setSavingEquipment(true);

    try {
      const payload = {
        customer: id,
        siteId: equipmentForm.siteId,
        equipmentType: equipmentForm.equipmentType,
        customType: equipmentForm.equipmentType === 'Other' ? equipmentForm.customType.trim() : '',
        brand: equipmentForm.brand.trim(),
        model: equipmentForm.model.trim(),
        serialNumber: equipmentForm.serialNumber.trim(),
        location: equipmentForm.location.trim(),
        installationDate: equipmentForm.installationDate || undefined,
        warrantyExpiry: equipmentForm.warrantyExpiry || undefined,
        nextServiceDate: equipmentForm.nextServiceDate || undefined,
        status: equipmentForm.status,
        notes: equipmentForm.notes.trim(),
      };

      const response = await api.post('/equipment', payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setEquipment((prev) => [response.data, ...prev]);
      setSelectedSiteFilter(String(payload.siteId || 'all'));
      setEquipmentForm(buildEmptyEquipmentForm(payload.siteId));
      setEquipmentSuccess(`${response.data.equipmentId} created successfully.`);
    } catch (err) {
      setEquipmentError(err.response?.data?.message || 'Failed to add equipment');
    } finally {
      setSavingEquipment(false);
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-white/70">Loading customer profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !customer) {
    return (
      <>
        <Sidebar />
        <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <p className="text-red-300">{error || 'Customer not found'}</p>
            <button onClick={() => navigate('/customers')} className="glass-btn-primary mt-4 px-6 py-2">
              Back to Customers
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                onClick={() => navigate('/customers')}
                className="text-white/50 hover:text-white text-sm mb-2 flex items-center gap-1"
              >
                ← Back to Customers
              </button>
              <h1 className="glass-heading text-3xl">{getCustomerDisplayName(customer)}</h1>
              <p className="text-white/60 text-sm mt-1">{customer.customerId} · {typeLabel}</p>
            </div>
            <div className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${getTypeTone(customer.customerType)}`}>
              {typeLabel} Onboarding
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="glass-card p-8">
              <h2 className="glass-heading text-xl mb-6">Customer Overview</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm text-white/80">
                <div><span className="text-white/50">Primary Contact:</span> {customer.contactFirstName} {customer.contactLastName}</div>
                <div><span className="text-white/50">Email:</span> {customer.email}</div>
                <div><span className="text-white/50">Phone:</span> {customer.phoneNumber}</div>
                <div><span className="text-white/50">Alternate:</span> {customer.alternatePhone || '—'}</div>
                <div className="md:col-span-2"><span className="text-white/50">Primary Address:</span> {customer.physicalAddress || formatAddress(customer.physicalAddressDetails) || '—'}</div>
                <div><span className="text-white/50">Sites:</span> {customer.sites?.length || 0}</div>
                <div><span className="text-white/50">Machines:</span> {equipment.length}</div>
                <div><span className="text-white/50">VAT:</span> {customer.vatNumber || '—'}</div>
                <div><span className="text-white/50">Registration:</span> {customer.registrationNumber || '—'}</div>
              </div>
              {customer.notes && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Notes</p>
                  <p>{customer.notes}</p>
                </div>
              )}
            </section>

            <section className="glass-card p-8">
              <h2 className="glass-heading text-xl mb-6">Operational Snapshot</h2>
              <div className="space-y-4 text-sm text-white/80">
                {(customer.sites || []).map((site) => (
                  <div key={site._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{site.siteName}</p>
                      <span className="text-xs uppercase tracking-wide text-white/45">
                        {equipmentBySite[String(site._id)] || 0} machine{(equipmentBySite[String(site._id)] || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-white/65">{site.address || formatAddress(site.addressDetails) || 'No address recorded'}</p>
                    <p className="mt-2 text-white/55">{site.contactPerson || 'No contact'} · {site.contactPhone || 'No phone'}</p>
                    {site.serviceTypes?.length > 0 && (
                      <p className="mt-2 text-white/55">Service Types: {site.serviceTypes.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="glass-card p-8">
              <div className="mb-6">
                <h2 className="glass-heading text-xl">Multi-Site Onboarding</h2>
                <p className="mt-2 text-sm text-white/65">Add operational sites for this business customer. Each site can later carry its own machines and service preferences.</p>
              </div>

              {siteSuccess && <div className="glass-alert-success mb-4 rounded-lg p-4">{siteSuccess}</div>}
              {siteError && <div className="glass-alert-error mb-4 rounded-lg p-4">{siteError}</div>}

              <form onSubmit={submitSite} className="space-y-4">
                <div>
                  <label htmlFor="siteName" className="glass-form-label">Site Name *</label>
                  <input id="siteName" name="siteName" value={siteForm.siteName} onChange={handleSiteInputChange} required className="glass-form-input" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input name="streetAddress" value={siteForm.streetAddress} onChange={handleSiteInputChange} required placeholder="Street Address" className="glass-form-input" />
                  <input name="complexName" value={siteForm.complexName} onChange={handleSiteInputChange} placeholder="Complex / Industrial Park" className="glass-form-input" />
                  <input name="siteAddressDetail" value={siteForm.siteAddressDetail} onChange={handleSiteInputChange} placeholder="Unit / Site Detail" className="glass-form-input" />
                  <input name="suburb" value={siteForm.suburb} onChange={handleSiteInputChange} required placeholder="Suburb" className="glass-form-input" />
                  <input name="cityDistrict" value={siteForm.cityDistrict} onChange={handleSiteInputChange} required placeholder="City / District" className="glass-form-input" />
                  <input name="province" value={siteForm.province} onChange={handleSiteInputChange} required placeholder="Province" className="glass-form-input" />
                  <input name="postalCode" value={siteForm.postalCode} onChange={handleSiteInputChange} required placeholder="Postal / ZIP Code" className="glass-form-input" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input name="contactPerson" value={siteForm.contactPerson} onChange={handleSiteInputChange} placeholder="Site Contact Person" className="glass-form-input" />
                  <input name="contactPhone" value={siteForm.contactPhone} onChange={handleSiteInputChange} placeholder="Site Contact Phone" className="glass-form-input" />
                  <input name="contactEmail" value={siteForm.contactEmail} onChange={handleSiteInputChange} placeholder="Site Contact Email" className="glass-form-input md:col-span-2" />
                </div>
                <div>
                  <label htmlFor="serviceTypes" className="glass-form-label">Preferred Service Types</label>
                  <input id="serviceTypes" name="serviceTypes" value={siteForm.serviceTypes} onChange={handleSiteInputChange} placeholder="Generator service, Preventive maintenance, Plumbing" className="glass-form-input" />
                </div>
                <div>
                  <label htmlFor="siteNotes" className="glass-form-label">Site Notes</label>
                  <textarea id="siteNotes" name="notes" value={siteForm.notes} onChange={handleSiteInputChange} rows="3" className="glass-form-textarea" />
                </div>
                <button type="submit" disabled={savingSite} className={`glass-btn-primary px-6 py-2 ${savingSite ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {savingSite ? 'Adding Site...' : 'Add Site'}
                </button>
              </form>
            </section>

            <section className="glass-card p-8">
              <div className="mb-6">
                <h2 className="glass-heading text-xl">Machine Onboarding</h2>
                <p className="mt-2 text-sm text-white/65">Register customer machines against a specific site so operational history can stay tied to where the machine actually lives.</p>
              </div>

              {equipmentSuccess && <div className="glass-alert-success mb-4 rounded-lg p-4">{equipmentSuccess}</div>}
              {equipmentError && <div className="glass-alert-error mb-4 rounded-lg p-4">{equipmentError}</div>}

              <form onSubmit={submitEquipment} className="space-y-4">
                <div>
                  <label htmlFor="equipmentSiteId" className="glass-form-label">Assign To Site *</label>
                  <select id="equipmentSiteId" name="siteId" value={equipmentForm.siteId} onChange={handleEquipmentInputChange} required className="glass-form-select">
                    <option value="">Select a site</option>
                    {(customer.sites || []).map((site) => (
                      <option key={site._id} value={site._id}>{site.siteName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="equipmentType" className="glass-form-label">Machine Type *</label>
                    <select id="equipmentType" name="equipmentType" value={equipmentForm.equipmentType} onChange={handleEquipmentInputChange} className="glass-form-select">
                      {EQUIPMENT_TYPES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="equipmentStatus" className="glass-form-label">Status</label>
                    <select id="equipmentStatus" name="status" value={equipmentForm.status} onChange={handleEquipmentInputChange} className="glass-form-select">
                      {EQUIPMENT_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  {equipmentForm.equipmentType === 'Other' && (
                    <div className="md:col-span-2">
                      <label htmlFor="customType" className="glass-form-label">Custom Machine Type *</label>
                      <input id="customType" name="customType" value={equipmentForm.customType} onChange={handleEquipmentInputChange} required className="glass-form-input" />
                    </div>
                  )}
                  <input name="brand" value={equipmentForm.brand} onChange={handleEquipmentInputChange} placeholder="Brand" className="glass-form-input" />
                  <input name="model" value={equipmentForm.model} onChange={handleEquipmentInputChange} placeholder="Model" className="glass-form-input" />
                  <input name="serialNumber" value={equipmentForm.serialNumber} onChange={handleEquipmentInputChange} placeholder="Serial Number" className="glass-form-input" />
                  <input name="location" value={equipmentForm.location} onChange={handleEquipmentInputChange} placeholder="Plant room / bay / roof level" className="glass-form-input" />
                  <div>
                    <label htmlFor="installationDate" className="glass-form-label">Installation Date</label>
                    <input id="installationDate" type="date" name="installationDate" value={equipmentForm.installationDate} onChange={handleEquipmentInputChange} className="glass-form-input" />
                  </div>
                  <div>
                    <label htmlFor="warrantyExpiry" className="glass-form-label">Warranty Expiry</label>
                    <input id="warrantyExpiry" type="date" name="warrantyExpiry" value={equipmentForm.warrantyExpiry} onChange={handleEquipmentInputChange} className="glass-form-input" />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="nextServiceDate" className="glass-form-label">Next Service Date</label>
                    <input id="nextServiceDate" type="date" name="nextServiceDate" value={equipmentForm.nextServiceDate} onChange={handleEquipmentInputChange} className="glass-form-input" />
                  </div>
                </div>
                <div>
                  <label htmlFor="equipmentNotes" className="glass-form-label">Machine Notes</label>
                  <textarea id="equipmentNotes" name="notes" value={equipmentForm.notes} onChange={handleEquipmentInputChange} rows="3" className="glass-form-textarea" />
                </div>
                <button type="submit" disabled={savingEquipment || !customer.sites?.length} className={`glass-btn-primary px-6 py-2 ${(savingEquipment || !customer.sites?.length) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {savingEquipment ? 'Adding Machine...' : 'Add Machine'}
                </button>
              </form>
            </section>
          </div>

          <section className="glass-card p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="glass-heading text-xl">Registered Machines</h2>
                <p className="mt-2 text-sm text-white/65">Review machines already onboarded for this customer and filter them by site.</p>
              </div>
              <div>
                <label htmlFor="siteEquipmentFilter" className="glass-form-label">Filter by Site</label>
                <select id="siteEquipmentFilter" value={selectedSiteFilter} onChange={(event) => setSelectedSiteFilter(event.target.value)} className="glass-form-select min-w-[220px]">
                  <option value="all">All Sites</option>
                  {(customer.sites || []).map((site) => (
                    <option key={site._id} value={site._id}>{site.siteName}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredEquipment.length === 0 ? (
              <p className="text-white/60 text-sm">No machines have been onboarded for the selected scope yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredEquipment.map((item) => {
                  const site = (customer.sites || []).find((entry) => String(entry._id) === String(item.siteId));

                  return (
                    <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-white font-semibold">{item.equipmentId}</p>
                          <p className="text-white/70 text-sm mt-1">{[item.brand, item.model].filter(Boolean).join(' ') || item.equipmentType}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-white/70">
                        <div><span className="text-white/45">Type:</span> {item.customType || item.equipmentType}</div>
                        <div><span className="text-white/45">Serial:</span> {item.serialNumber || '—'}</div>
                        <div><span className="text-white/45">Site:</span> {site?.siteName || 'Unassigned'}</div>
                        <div><span className="text-white/45">Location:</span> {item.location || '—'}</div>
                        <div><span className="text-white/45">Warranty:</span> {item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default BusinessCustomerProfile;