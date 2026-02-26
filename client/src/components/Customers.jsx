import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const Customers = () => {
  const { user } = useAuth();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [customers, setCustomers] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('business');
  const [serviceCategory, setServiceCategory] = useState('generator');
  const [generatorServiceType, setGeneratorServiceType] = useState('service');
  const [electricalType, setElectricalType] = useState('appliance');
  const [plumbingType, setPlumbingType] = useState('storage');
  const [servicedBefore, setServicedBefore] = useState('no');
  const [formData, setFormData] = useState({
    businessName: '',
    branchName: '',
    contactFirstName: '',
    contactLastName: '',
    email: '',
    phoneNumber: '',
    alternatePhone: '',
    customerId: '',
    physicalAddress: '',
    residentialAddress: '',
    billingAddress: '',
    vatNumber: '',
    accountStatus: 'active',
    notes: '',
    bookingLocation: '',
    serviceLocation: '',
    locationRelationship: '',
    isMultiBranch: 'no',
    branchCount: '',
    branchContactSame: 'yes',
    machineCount: '',
    machinesDistributed: 'no'
  });
  const [generatorDetails, setGeneratorDetails] = useState({
    brand: '',
    model: '',
    rating: '',
    phases: '',
    fuelType: '',
    buildType: '',
    subject: '',
    message: ''
  });
  const [applianceDetails, setApplianceDetails] = useState({
    applianceType: '',
    brand: '',
    model: '',
    rating: '',
    phases: '',
    fuelType: '',
    buildType: '',
    subject: '',
    message: ''
  });
  const [plumbingDetails, setPlumbingDetails] = useState({
    subject: '',
    message: ''
  });
  const [mapCenter, setMapCenter] = useState({ lat: -26.2041, lng: 28.0473 });
  const [markerPosition, setMarkerPosition] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchServiceCalls();
  }, []);

  useEffect(() => {
    requestCurrentLocation();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setCustomers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceCalls = async () => {
    try {
      const response = await api.get('/service-calls', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setServiceCalls(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch service calls');
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(customer => customer._id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const lastServiceCall = useMemo(() => {
    if (!selectedCustomerId) return null;
    const matchingCalls = serviceCalls.filter(call => call.customer?._id === selectedCustomerId);
    if (matchingCalls.length === 0) return null;
    return matchingCalls.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  }, [serviceCalls, selectedCustomerId]);

  const parseNotes = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (err) {
      return null;
    }
  };

  const lastServiceDetails = useMemo(() => {
    return lastServiceCall ? parseNotes(lastServiceCall.notes) : null;
  }, [lastServiceCall]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString();
  };

  const addressFieldName = customerType === 'private' ? 'residentialAddress' : 'physicalAddress';

  const setAddressValue = (value) => {
    setFormData((prev) => ({ ...prev, [addressFieldName]: value }));
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
          lng: position.coords.longitude
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

  const isElectricalUnsupported = serviceCategory === 'electrical' && electricalType === 'building-wiring';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place?.geometry?.location) return;
    const coords = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };
    updateMapLocation(coords, place.formatted_address || place.name || '');
  };

  const handleMapClick = (event) => {
    if (!event?.latLng) return;
    const coords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    updateMapLocation(coords, null);
  };

  const handleMarkerDragEnd = (event) => {
    if (!event?.latLng) return;
    const coords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    updateMapLocation(coords, null);
  };

  const handleGeneratorChange = (e) => {
    setGeneratorDetails({ ...generatorDetails, [e.target.name]: e.target.value });
  };

  const handleApplianceChange = (e) => {
    setApplianceDetails({ ...applianceDetails, [e.target.name]: e.target.value });
  };

  const handlePlumbingChange = (e) => {
    setPlumbingDetails({ ...plumbingDetails, [e.target.name]: e.target.value });
  };

  const buildCustomerPayload = () => {
    const isPrivate = customerType === 'private';
    const customerId = formData.customerId || `CUST-${Date.now()}`;
    const businessName = isPrivate
      ? `Private - ${formData.contactFirstName} ${formData.contactLastName}`.trim()
      : formData.businessName;

    const customerNotes = {
      customerType,
      branchName: isPrivate ? null : formData.branchName,
      residentialAddress: formData.residentialAddress,
      bookingLocation: formData.bookingLocation,
      serviceLocation: formData.serviceLocation,
      locationRelationship: formData.locationRelationship,
      isMultiBranch: formData.isMultiBranch,
      branchCount: formData.branchCount,
      branchContactSame: formData.branchContactSame,
      machineCount: formData.machineCount,
      machinesDistributed: formData.machinesDistributed,
      extraNotes: formData.notes
    };

    return {
      businessName,
      contactFirstName: formData.contactFirstName,
      contactLastName: formData.contactLastName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      alternatePhone: formData.alternatePhone,
      customerId,
      physicalAddress: isPrivate ? formData.residentialAddress : formData.physicalAddress,
      billingAddress: formData.billingAddress,
      vatNumber: formData.vatNumber,
      accountStatus: formData.accountStatus,
      notes: JSON.stringify(customerNotes)
    };
  };

  const buildServiceCallPayload = (customerId) => {
    let jobDetails = {
      customerType,
      servicedBefore,
      bookingLocation: formData.bookingLocation,
      serviceLocation: formData.serviceLocation,
      locationRelationship: formData.locationRelationship
    };

    let title = 'Service Request';
    let description = '';
    let serviceType = serviceCategory;

    if (serviceCategory === 'generator') {
      title = generatorDetails.subject || 'Generator Service Request';
      description = generatorDetails.message;
      serviceType = `generator-${generatorServiceType}`;
      jobDetails = {
        ...jobDetails,
        serviceCategory: 'generator',
        serviceType: generatorServiceType,
        generator: { ...generatorDetails }
      };
    }

    if (serviceCategory === 'electrical') {
      title = applianceDetails.subject || 'Electrical Service Request';
      description = applianceDetails.message;
      serviceType = `electrical-${electricalType}`;
      jobDetails = {
        ...jobDetails,
        serviceCategory: 'electrical',
        serviceType: electricalType,
        appliance: electricalType === 'appliance' ? { ...applianceDetails } : null
      };
    }

    if (serviceCategory === 'plumbing') {
      title = plumbingDetails.subject || 'Plumbing Service Request';
      description = plumbingDetails.message;
      serviceType = `plumbing-${plumbingType}`;
      jobDetails = {
        ...jobDetails,
        serviceCategory: 'plumbing',
        serviceType: plumbingType,
        plumbing: { ...plumbingDetails }
      };
    }

    return {
      customer: customerId,
      title,
      description,
      priority: 'medium',
      status: 'open',
      serviceType,
      serviceLocation: formData.serviceLocation || formData.physicalAddress || formData.residentialAddress,
      notes: JSON.stringify(jobDetails)
    };
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      branchName: '',
      contactFirstName: '',
      contactLastName: '',
      email: '',
      phoneNumber: '',
      alternatePhone: '',
      customerId: '',
      physicalAddress: '',
      residentialAddress: '',
      billingAddress: '',
      vatNumber: '',
      accountStatus: 'active',
      notes: '',
      bookingLocation: '',
      serviceLocation: '',
      locationRelationship: '',
      isMultiBranch: 'no',
      branchCount: '',
      branchContactSame: 'yes',
      machineCount: '',
      machinesDistributed: 'no'
    });
    setGeneratorDetails({
      brand: '',
      model: '',
      rating: '',
      phases: '',
      fuelType: '',
      buildType: '',
      subject: '',
      message: ''
    });
    setApplianceDetails({
      applianceType: '',
      brand: '',
      model: '',
      rating: '',
      phases: '',
      fuelType: '',
      buildType: '',
      subject: '',
      message: ''
    });
    setPlumbingDetails({
      subject: '',
      message: ''
    });
    setUseExistingCustomer(false);
    setSelectedCustomerId('');
    setServicedBefore('no');
    setServiceCategory('generator');
    setGeneratorServiceType('service');
    setElectricalType('appliance');
    setPlumbingType('storage');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (useExistingCustomer && !selectedCustomerId) {
      setError('Please select an existing customer.');
      return;
    }

    if (isElectricalUnsupported) {
      setError('We do not perform building wiring electrical services.');
      return;
    }

    if (serviceCategory === 'generator') {
      if (!generatorDetails.brand.trim() || !generatorDetails.model.trim()) {
        setError('Generator brand and model are required.');
        return;
      }
      if (!generatorDetails.subject.trim() || !generatorDetails.message.trim()) {
        setError('Please provide a subject and message for the generator request.');
        return;
      }
    }

    if (serviceCategory === 'electrical' && electricalType === 'appliance') {
      if (!applianceDetails.applianceType.trim() || !applianceDetails.brand.trim() || !applianceDetails.model.trim()) {
        setError('Appliance type, brand, and model are required.');
        return;
      }
      if (!applianceDetails.subject.trim() || !applianceDetails.message.trim()) {
        setError('Please provide a subject and message for the electrical request.');
        return;
      }
    }

    if (serviceCategory === 'plumbing') {
      if (!plumbingDetails.subject.trim() || !plumbingDetails.message.trim()) {
        setError('Please provide a subject and message for the plumbing request.');
        return;
      }
    }

    try {
      let customerId = selectedCustomerId;

      if (!useExistingCustomer) {
        const customerPayload = buildCustomerPayload();
        const customerResponse = await api.post('/customers', customerPayload, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        customerId = customerResponse.data._id;
      }

      const serviceCallPayload = buildServiceCallPayload(customerId);
      await api.post('/service-calls', serviceCallPayload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setSuccess('Customer and service request saved successfully.');
      fetchCustomers();
      fetchServiceCalls();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer request');
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-2">Log customer details and service requests</p>
          </div>

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="business">Business</option>
                    <option value="private">Private/Residential</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Existing Customer?</label>
                  <select
                    value={useExistingCustomer ? 'yes' : 'no'}
                    onChange={(e) => setUseExistingCustomer(e.target.value === 'yes')}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="no">No, create new</option>
                    <option value="yes">Yes, select existing</option>
                  </select>
                </div>
              </div>

              {useExistingCustomer && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Select Customer</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.businessName} - {customer.customerId}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {useExistingCustomer && selectedCustomer && (
                <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm text-indigo-700">
                    Selected: {selectedCustomer.businessName} ({selectedCustomer.customerId})
                  </p>
                  {lastServiceCall && (
                    <div className="mt-3 text-sm text-indigo-700">
                      Last service call: {lastServiceCall.callNumber} - {lastServiceCall.title}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!useExistingCustomer && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customerType === 'business' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Business Name *</label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  {customerType === 'business' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Branch Name *</label>
                      <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {customerType === 'business' ? 'Contact Person Name *' : 'Name *'}
                    </label>
                    <input
                      type="text"
                      name="contactFirstName"
                      value={formData.contactFirstName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {customerType === 'business' ? 'Contact Person Surname *' : 'Surname *'}
                    </label>
                    <input
                      type="text"
                      name="contactLastName"
                      value={formData.contactLastName}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alternate Phone</label>
                    <input
                      type="text"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                    <input
                      type="text"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleInputChange}
                      placeholder="Auto-generated if empty"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {customerType === 'business' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Physical Address *</label>
                      <input
                        type="text"
                        name="physicalAddress"
                        value={formData.physicalAddress}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Residential Address *</label>
                      <input
                        type="text"
                        name="residentialAddress"
                        value={formData.residentialAddress}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Location Picker</label>
                      <button
                        type="button"
                        onClick={requestCurrentLocation}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
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
                      <div className="mt-3 text-sm text-gray-600">
                        Set VITE_GOOGLE_MAPS_API_KEY to enable the map picker.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <LoadScript
                          googleMapsApiKey={googleMapsApiKey}
                          libraries={['places']}
                          onLoad={() => {
                            if (pendingCoords && !formData[addressFieldName]) {
                              reverseGeocode(pendingCoords);
                            }
                          }}
                        >
                          <Autocomplete
                            onLoad={(instance) => setAutocomplete(instance)}
                            onPlaceChanged={handlePlaceChanged}
                          >
                            <input
                              type="text"
                              placeholder="Search for address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </Autocomplete>
                          <div className="h-72 w-full rounded-lg overflow-hidden border border-gray-200">
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
                        </LoadScript>
                        <p className="text-xs text-gray-500">
                          Default location uses your current position. Move the pin or search if the customer is not on site.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {customerType === 'business' && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Branches</label>
                        <select
                          name="isMultiBranch"
                          value={formData.isMultiBranch}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="no">One branch</option>
                          <option value="yes">Many branches</option>
                        </select>
                      </div>
                      {formData.isMultiBranch === 'yes' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Number of Branches</label>
                            <input
                              type="number"
                              name="branchCount"
                              value={formData.branchCount}
                              onChange={handleInputChange}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Same contact for all branches?</label>
                            <select
                              name="branchContactSame"
                              value={formData.branchContactSame}
                              onChange={handleInputChange}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="yes">Yes</option>
                              <option value="no">No, per-branch contact</option>
                            </select>
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Number of Machines</label>
                        <input
                          type="number"
                          name="machineCount"
                          value={formData.machineCount}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Machines distributed across locations?</label>
                        <select
                          name="machinesDistributed"
                          value={formData.machinesDistributed}
                          onChange={handleInputChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="no">All at one location</option>
                          <option value="yes">Various locations</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Service Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Category</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="generator">Generator Services</option>
                    <option value="electrical">Electrical Services</option>
                    <option value="plumbing">Plumbing Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serviced Before?</label>
                  <select
                    value={servicedBefore}
                    onChange={(e) => setServicedBefore(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              {servicedBefore === 'yes' && (
                <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-indigo-800">Review Last Service Call</h3>
                  {lastServiceCall ? (
                    <div className="mt-3 text-sm text-indigo-700 space-y-2">
                      <div>
                        {lastServiceCall.callNumber} - {lastServiceCall.title}
                      </div>
                      <div>
                        Date: {formatDate(lastServiceCall.createdAt)} | Type: {lastServiceCall.serviceType}
                      </div>
                      {lastServiceCall.description && (
                        <div>Description: {lastServiceCall.description}</div>
                      )}
                      {lastServiceDetails?.generator && (
                        <div>
                          Generator: {lastServiceDetails.generator.brand || 'N/A'} {lastServiceDetails.generator.model || ''}
                        </div>
                      )}
                      {lastServiceDetails?.appliance && (
                        <div>
                          Appliance: {lastServiceDetails.appliance.applianceType || 'N/A'} {lastServiceDetails.appliance.brand || ''}
                        </div>
                      )}
                      {lastServiceDetails?.plumbing && (
                        <div>
                          Plumbing: {lastServiceDetails.plumbing.subject || 'Service details on file'}
                        </div>
                      )}
                      {!lastServiceDetails && (
                        <div>Previous job details are not in the new format.</div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-indigo-700">
                      No previous service calls found for this customer.
                    </p>
                  )}
                </div>
              )}

              {serviceCategory === 'generator' && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Service Type</label>
                      <select
                        value={generatorServiceType}
                        onChange={(e) => setGeneratorServiceType(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="service">Service</option>
                        <option value="repair">Repair</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="installation">Installation</option>
                        <option value="transportation">Transportation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Generator Brand</label>
                      <input
                        type="text"
                        name="brand"
                        value={generatorDetails.brand}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Model</label>
                      <input
                        type="text"
                        name="model"
                        value={generatorDetails.model}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rating</label>
                      <input
                        type="text"
                        name="rating"
                        value={generatorDetails.rating}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phases</label>
                      <input
                        type="text"
                        name="phases"
                        value={generatorDetails.phases}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                      <input
                        type="text"
                        name="fuelType"
                        value={generatorDetails.fuelType}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Build Type</label>
                      <input
                        type="text"
                        name="buildType"
                        value={generatorDetails.buildType}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={generatorDetails.subject}
                        onChange={handleGeneratorChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Message</label>
                      <textarea
                        name="message"
                        value={generatorDetails.message}
                        onChange={handleGeneratorChange}
                        rows="4"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {serviceCategory === 'electrical' && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Electrical Service Type</label>
                      <select
                        value={electricalType}
                        onChange={(e) => setElectricalType(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="appliance">Appliance Repairs</option>
                        <option value="building-wiring">Building/Structural Wiring</option>
                      </select>
                    </div>
                  </div>

                  {isElectricalUnsupported && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
                      We do not perform building wiring electrical services. We can recommend our electrical
                      contract partners to ensure installations meet spec and are properly certified.
                    </div>
                  )}

                  {electricalType === 'appliance' && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Appliance Type</label>
                        <input
                          type="text"
                          name="applianceType"
                          value={applianceDetails.applianceType}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                        <input
                          type="text"
                          name="brand"
                          value={applianceDetails.brand}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Model</label>
                        <input
                          type="text"
                          name="model"
                          value={applianceDetails.model}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rating</label>
                        <input
                          type="text"
                          name="rating"
                          value={applianceDetails.rating}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phases</label>
                        <input
                          type="text"
                          name="phases"
                          value={applianceDetails.phases}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                        <input
                          type="text"
                          name="fuelType"
                          value={applianceDetails.fuelType}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Build Type</label>
                        <input
                          type="text"
                          name="buildType"
                          value={applianceDetails.buildType}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                          type="text"
                          name="subject"
                          value={applianceDetails.subject}
                          onChange={handleApplianceChange}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                          name="message"
                          value={applianceDetails.message}
                          onChange={handleApplianceChange}
                          rows="4"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {serviceCategory === 'plumbing' && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Plumbing Service Type</label>
                      <select
                        value={plumbingType}
                        onChange={(e) => setPlumbingType(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="storage">Water Storage Solutions</option>
                        <option value="reticulation">Water Reticulation Solutions</option>
                        <option value="drainage">Water Drainage Solutions</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        name="subject"
                        value={plumbingDetails.subject}
                        onChange={handlePlumbingChange}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Message</label>
                      <textarea
                        name="message"
                        value={plumbingDetails.message}
                        onChange={handlePlumbingChange}
                        rows="4"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-500">
                    Storage: hot/cold tanks, installs, repairs. Reticulation: borehole/pressure/heat pumps, valves
                    and pipes affecting supply. Drainage: storm, grey, sewage, septic systems, unblocking.
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Locations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking Location</label>
                  <input
                    type="text"
                    name="bookingLocation"
                    value={formData.bookingLocation}
                    onChange={handleInputChange}
                    placeholder="Where the booking is logged"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Location</label>
                  <input
                    type="text"
                    name="serviceLocation"
                    value={formData.serviceLocation}
                    onChange={handleInputChange}
                    placeholder="Where service is needed"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Location Relationship</label>
                  <input
                    type="text"
                    name="locationRelationship"
                    value={formData.locationRelationship}
                    onChange={handleInputChange}
                    placeholder="If different, describe the relationship"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isElectricalUnsupported}
                className={`px-6 py-2 rounded-lg text-white ${
                  isElectricalUnsupported ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                Save Customer Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Customers;
