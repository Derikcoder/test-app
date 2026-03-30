/**
 * @file RegisterNewCustomer.jsx
 * @description Dedicated customer registration screen for creating customer profiles only.
 * Business structure is defined before customer details so the form can collect the right data.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const DEFAULT_MAP_CENTER = { lat: -26.2041, lng: 28.0473 };

const BUSINESS_STRUCTURE_OPTIONS = [
  {
    value: 'singleBusiness',
    title: 'Single Business',
    summary: 'Standalone business with one primary operating profile.',
  },
  {
    value: 'headOffice',
    title: 'Head Office',
    summary: 'Parent account that can have branches or franchises added later from the customer profile.',
  },
];

const customerProfileRoute = (type, id) => {
  const routes = {
    headOffice: `/customers/head-office/${id}`,
    branch: `/customers/branch/${id}`,
    franchise: `/customers/franchise/${id}`,
    singleBusiness: `/customers/single-business/${id}`,
    residential: `/customers/residential/${id}`,
  };

  return routes[type] || `/customers/${id}`;
};

const RegisterNewCustomer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
    id: 'appatunid-google-maps-script',
    googleMapsApiKey,
    libraries: ['places'],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [customerKind, setCustomerKind] = useState('business');
  const [businessStructure, setBusinessStructure] = useState('singleBusiness');
  const [formData, setFormData] = useState({
    businessName: '',
    siteName: '',
    contactFirstName: '',
    contactLastName: '',
    email: '',
    phoneNumber: '',
    alternatePhone: '',
    customerId: '',
    streetAddress: '',
    complexName: '',
    siteAddressDetail: '',
    suburb: '',
    cityDistrict: '',
    province: '',
    postalCode: '',
    billingAddress: '',
    vatNumber: '',
    taxNumber: '',
    registrationNumber: '',
    notes: '',
  });
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);

  const isBusinessCustomer = customerKind === 'business';
  const resolvedCustomerType = isBusinessCustomer ? businessStructure : 'residential';
  const businessNameLabel = businessStructure === 'headOffice' ? 'Head Office Name *' : 'Business Name *';
  const siteNameLabel = businessStructure === 'headOffice' ? 'Primary Head Office Site Name *' : 'Primary Site Name *';

  const physicalAddressDetails = useMemo(() => ({
    streetAddress: formData.streetAddress,
    complexName: formData.complexName,
    siteAddressDetail: formData.siteAddressDetail,
    suburb: formData.suburb,
    cityDistrict: formData.cityDistrict,
    province: formData.province,
    postalCode: formData.postalCode,
  }), [
    formData.streetAddress,
    formData.complexName,
    formData.siteAddressDetail,
    formData.suburb,
    formData.cityDistrict,
    formData.province,
    formData.postalCode,
  ]);

  useEffect(() => {
    requestCurrentLocation();
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !pendingCoords || formData.streetAddress) {
      return;
    }

    reverseGeocode(pendingCoords);
  }, [isGoogleMapsLoaded, pendingCoords, formData.streetAddress]);

  const formatStructuredAddress = (address) => {
    if (!address) return '';

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

  const setAddressValue = (value) => {
    setFormData((prev) => ({ ...prev, streetAddress: value }));
  };

  const reverseGeocode = (coords) => {
    if (!window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: coords }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setAddressValue(results[0].formatted_address || '');
        setPendingCoords(null);
      }
    });
  };

  const updateMapLocation = (coords, address) => {
    setMapCenter(coords);
    setMarkerPosition(coords);

    if (address) {
      setAddressValue(address);
    } else {
      reverseGeocode(coords);
    }
  };

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocationError('');
        setPendingCoords(coords);
        setMapCenter(coords);
        setMarkerPosition(coords);

        if (window.google?.maps) {
          reverseGeocode(coords);
        }
      },
      () => {
        setLocationError('Unable to fetch current location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleInputChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place?.geometry?.location) return;

    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    updateMapLocation(coords, place.formatted_address || place.name || '');
  };

  const handleMapClick = (event) => {
    if (!event?.latLng) return;

    const coords = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    updateMapLocation(coords, null);
  };

  const handleMarkerDragEnd = (event) => {
    if (!event?.latLng) return;

    const coords = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };

    updateMapLocation(coords, null);
  };

  const clearFormValues = () => {
    setCustomerKind('business');
    setBusinessStructure('singleBusiness');
    setFormData({
      businessName: '',
      siteName: '',
      contactFirstName: '',
      contactLastName: '',
      email: '',
      phoneNumber: '',
      alternatePhone: '',
      customerId: '',
      streetAddress: '',
      complexName: '',
      siteAddressDetail: '',
      suburb: '',
      cityDistrict: '',
      province: '',
      postalCode: '',
      billingAddress: '',
      vatNumber: '',
      taxNumber: '',
      registrationNumber: '',
      notes: '',
    });
    setMapCenter(DEFAULT_MAP_CENTER);
    setMarkerPosition(null);
    setPendingCoords(null);
  };

  const resetForm = () => {
    setError('');
    setSuccess('');
    setCreatedCustomer(null);
    clearFormValues();
  };

  const buildCustomerPayload = () => {
    const formattedPhysicalAddress = formatStructuredAddress(physicalAddressDetails);
    const generatedCustomerId = formData.customerId.trim() || `CUST-${Date.now()}`;
    const contactPerson = `${formData.contactFirstName} ${formData.contactLastName}`.trim();

    return {
      customerType: resolvedCustomerType,
      businessName: isBusinessCustomer ? formData.businessName.trim() : undefined,
      contactFirstName: formData.contactFirstName.trim(),
      contactLastName: formData.contactLastName.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      alternatePhone: formData.alternatePhone.trim(),
      customerId: generatedCustomerId,
      physicalAddress: formattedPhysicalAddress,
      physicalAddressDetails,
      billingAddress: formData.billingAddress.trim(),
      vatNumber: formData.vatNumber.trim(),
      taxNumber: formData.taxNumber.trim(),
      registrationNumber: formData.registrationNumber.trim(),
      accountStatus: 'active',
      notes: formData.notes.trim(),
      sites: isBusinessCustomer
        ? [
            {
              siteName: formData.siteName.trim(),
              address: formattedPhysicalAddress,
              addressDetails: physicalAddressDetails,
              contactPerson,
              contactPhone: formData.phoneNumber.trim(),
              contactEmail: formData.email.trim(),
              status: 'active',
            },
          ]
        : [],
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setCreatedCustomer(null);

    if (isBusinessCustomer && !formData.businessName.trim()) {
      setError('Business name is required for business customers.');
      return;
    }

    if (isBusinessCustomer && !formData.siteName.trim()) {
      setError('Primary site name is required for business customers.');
      return;
    }

    setSaving(true);

    try {
      const payload = buildCustomerPayload();
      const response = await api.post('/customers', payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const savedCustomer = response.data?.data || response.data;
      const displayName = savedCustomer?.businessName || `${savedCustomer?.contactFirstName || ''} ${savedCustomer?.contactLastName || ''}`.trim();

      clearFormValues();
      setCreatedCustomer(savedCustomer);
      setSuccess(`${displayName || 'Customer'} registered successfully.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sidebar />
      <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-8">
            <h1 className="glass-heading text-3xl">Register Customer</h1>
            <p className="text-white/70 mt-2">
              Create the customer profile first. Branches, machines, and service preferences can be added later from the customer profile.
            </p>
          </div>

          {success && (
            <div className="glass-alert-success mb-4 rounded-lg p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span>{success}</span>
                {createdCustomer?._id && (
                  <button
                    type="button"
                    onClick={() => navigate(customerProfileRoute(createdCustomer.customerType, createdCustomer._id))}
                    className="glass-btn-outline w-auto px-4 py-2"
                  >
                    Open Customer Profile
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="glass-alert-error mb-4 rounded-lg p-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="glass-card rounded-2xl shadow-xl p-8">
              <h2 className="glass-heading text-xl mb-6">Customer Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="customerKind" className="glass-form-label">Customer Type</label>
                  <select
                    id="customerKind"
                    value={customerKind}
                    onChange={(event) => setCustomerKind(event.target.value)}
                    className="glass-form-select"
                  >
                    <option value="business">Business</option>
                    <option value="residential">Private / Residential</option>
                  </select>
                </div>
              </div>
            </div>

            {isBusinessCustomer && (
              <div className="glass-card rounded-2xl shadow-xl p-8">
                <h2 className="glass-heading text-xl mb-6">Business Structure</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {BUSINESS_STRUCTURE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="cursor-pointer rounded-2xl border p-5 transition-all"
                      style={{
                        borderColor: businessStructure === option.value ? 'rgba(250, 204, 21, 0.85)' : 'rgba(255,255,255,0.18)',
                        background: businessStructure === option.value ? 'rgba(250, 204, 21, 0.12)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="businessStructure"
                          value={option.value}
                          checked={businessStructure === option.value}
                          onChange={(event) => setBusinessStructure(event.target.value)}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <p className="font-semibold text-white">{option.title}</p>
                          <p className="mt-1 text-sm text-white/70">{option.summary}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl shadow-xl p-8">
              <h2 className="glass-heading text-xl mb-6">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isBusinessCustomer && (
                  <div className="md:col-span-2">
                    <label htmlFor="businessName" className="glass-form-label">{businessNameLabel}</label>
                    <input
                      id="businessName"
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      required={isBusinessCustomer}
                      className="glass-form-input"
                    />
                  </div>
                )}

                {isBusinessCustomer && (
                  <div className="md:col-span-2">
                    <label htmlFor="siteName" className="glass-form-label">{siteNameLabel}</label>
                    <input
                      id="siteName"
                      type="text"
                      name="siteName"
                      value={formData.siteName}
                      onChange={handleInputChange}
                      required={isBusinessCustomer}
                      className="glass-form-input"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="contactFirstName" className="glass-form-label">{isBusinessCustomer ? 'Contact Person Name *' : 'Name *'}</label>
                  <input
                    id="contactFirstName"
                    type="text"
                    name="contactFirstName"
                    value={formData.contactFirstName}
                    onChange={handleInputChange}
                    required
                    className="glass-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="contactLastName" className="glass-form-label">{isBusinessCustomer ? 'Contact Person Surname *' : 'Surname *'}</label>
                  <input
                    id="contactLastName"
                    type="text"
                    name="contactLastName"
                    value={formData.contactLastName}
                    onChange={handleInputChange}
                    required
                    className="glass-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="glass-form-label">Email *</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="glass-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="glass-form-label">Phone Number *</label>
                  <input
                    id="phoneNumber"
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="glass-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="alternatePhone" className="glass-form-label">Alternate Phone</label>
                  <input
                    id="alternatePhone"
                    type="text"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleInputChange}
                    className="glass-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="customerId" className="glass-form-label">Customer ID</label>
                  <input
                    id="customerId"
                    type="text"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="glass-form-input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="streetAddress" className="glass-form-label">{isBusinessCustomer ? 'Primary Site Address *' : 'Residential Address *'}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <input
                      id="streetAddress"
                      type="text"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleInputChange}
                      required
                      placeholder="Street Address"
                      className="glass-form-input"
                    />
                    <input
                      id="complexName"
                      type="text"
                      name="complexName"
                      value={formData.complexName}
                      onChange={handleInputChange}
                      placeholder="Complex / Industrial Park"
                      className="glass-form-input"
                    />
                    <input
                      id="siteAddressDetail"
                      type="text"
                      name="siteAddressDetail"
                      value={formData.siteAddressDetail}
                      onChange={handleInputChange}
                      placeholder="Unit / Site Detail"
                      className="glass-form-input"
                    />
                    <input
                      id="suburb"
                      type="text"
                      name="suburb"
                      value={formData.suburb}
                      onChange={handleInputChange}
                      required
                      placeholder="Suburb"
                      className="glass-form-input"
                    />
                    <input
                      id="cityDistrict"
                      type="text"
                      name="cityDistrict"
                      value={formData.cityDistrict}
                      onChange={handleInputChange}
                      required
                      placeholder="City / District"
                      className="glass-form-input"
                    />
                    <input
                      id="province"
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      required
                      placeholder="Province"
                      className="glass-form-input"
                    />
                    <input
                      id="postalCode"
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      placeholder="Postal / ZIP Code"
                      className="glass-form-input"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="glass-form-label">Location Picker</label>
                    <button
                      type="button"
                      onClick={requestCurrentLocation}
                      className="glass-link text-sm"
                    >
                      Use my current location
                    </button>
                  </div>

                  {locationError && (
                    <div className="mt-2 text-sm text-red-600">
                      {locationError}
                    </div>
                  )}

                  {!googleMapsApiKey ? (
                    <div className="mt-3 text-sm text-white/70">
                      Set VITE_GOOGLE_MAPS_API_KEY to enable the map picker.
                    </div>
                  ) : googleMapsLoadError ? (
                    <div className="mt-3 text-sm text-red-600">
                      Failed to load Google Maps. Please refresh the page and verify your API key restrictions.
                    </div>
                  ) : !isGoogleMapsLoaded ? (
                    <div className="mt-3 text-sm text-white/70">Loading map tools...</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <Autocomplete
                        onLoad={(instance) => setAutocomplete(instance)}
                        onPlaceChanged={handlePlaceChanged}
                      >
                        <input
                          type="text"
                          placeholder="Search for address"
                          className="glass-form-input w-full"
                        />
                      </Autocomplete>
                      <div className="h-72 w-full overflow-hidden rounded-lg border border-white/20">
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={markerPosition || mapCenter}
                          zoom={15}
                          onClick={handleMapClick}
                        >
                          <Marker
                            position={markerPosition || mapCenter}
                            draggable
                            onDragEnd={handleMarkerDragEnd}
                          />
                        </GoogleMap>
                      </div>
                      <p className="text-xs text-gray-500">
                        Default location uses your current position. Move the pin or search if the customer is not on site.
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="billingAddress" className="glass-form-label">Billing Address</label>
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Optional if billing address differs from the physical address"
                    className="glass-form-textarea"
                  />
                </div>

                {isBusinessCustomer && (
                  <>
                    <div>
                      <label htmlFor="vatNumber" className="glass-form-label">VAT Number</label>
                      <input
                        id="vatNumber"
                        type="text"
                        name="vatNumber"
                        value={formData.vatNumber}
                        onChange={handleInputChange}
                        className="glass-form-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="taxNumber" className="glass-form-label">Tax Number</label>
                      <input
                        id="taxNumber"
                        type="text"
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleInputChange}
                        className="glass-form-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="registrationNumber" className="glass-form-label">Registration Number</label>
                      <input
                        id="registrationNumber"
                        type="text"
                        name="registrationNumber"
                        value={formData.registrationNumber}
                        onChange={handleInputChange}
                        className="glass-form-input"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label htmlFor="notes" className="glass-form-label">Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Optional onboarding notes for this customer profile"
                    className="glass-form-textarea"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="glass-btn-outline px-6 py-2"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`glass-btn-primary px-6 py-2 ${saving ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {saving ? 'Registering Customer...' : 'Register Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RegisterNewCustomer;
