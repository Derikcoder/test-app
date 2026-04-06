/**
 * @file RegisterNewCustomer.jsx
 * @description Reusable modal/form for registering a new customer of any type.
 * Extracted from Customers.jsx — call this from anywhere a new customer needs to be created.
 * Supports: headOffice, branch, franchise, singleBusiness, residential
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import api from '../api/axios';

const RegisterNewCustomer = () => {
 const navigate = useNavigate();
 const { user } = useAuth();
 const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
 const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
  id: 'appatunid-google-maps-script',
  googleMapsApiKey,
  libraries: ['places'],
 });
 const [customers, setCustomers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [createdCustomer, setCreatedCustomer] = useState(null);
 const [customerType, setCustomerType] = useState('singleBusiness');
 const [formData, setFormData] = useState({
  businessName: '',
  branchName: '',
  contactFirstName: '',
  contactLastName: '',
  email: '',
  phoneNumber: '',
  alternatePhone: '',
    streetAddress: '',
    complexName: '',
    siteAddressDetail: '',
    suburb: '',
    cityDistrict: '',
    province: '',
    postalCode: '',
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
 const [mapCenter, setMapCenter] = useState({ lat: -26.2041, lng: 28.0473 });
 const [markerPosition, setMarkerPosition] = useState(null);
 const [locationError, setLocationError] = useState('');
 const [autocomplete, setAutocomplete] = useState(null);
 const [pendingCoords, setPendingCoords] = useState(null);

 useEffect(() => {
  fetchCustomers();
 }, []);

 useEffect(() => {
  requestCurrentLocation();
 }, []);

 useEffect(() => {
  if (!isGoogleMapsLoaded) return;
  if (pendingCoords && !formData.streetAddress) {
   reverseGeocode(pendingCoords);
  }
 }, [isGoogleMapsLoaded, pendingCoords, formData.streetAddress]);

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

 const physicalAddressDetails = {
  streetAddress: formData.streetAddress,
  complexName: formData.complexName,
  siteAddressDetail: formData.siteAddressDetail,
  suburb: formData.suburb,
  cityDistrict: formData.cityDistrict,
  province: formData.province,
  postalCode: formData.postalCode,
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

 const buildCustomerPayload = () => {
  const isResidential = customerType === 'residential';
  const businessName = isResidential
   ? `Private - ${formData.contactFirstName} ${formData.contactLastName}`.trim()
   : formData.businessName;
  const formattedPhysicalAddress = formatStructuredAddress(physicalAddressDetails);
  const businessSites = isResidential
   ? []
   : [
     {
      siteName: formData.branchName || formData.businessName,
      address: formattedPhysicalAddress,
      addressDetails: physicalAddressDetails,
      contactPerson: `${formData.contactFirstName} ${formData.contactLastName}`.trim(),
      contactPhone: formData.phoneNumber,
      contactEmail: formData.email,
      status: 'active',
      notes: formData.notes || '',
     }
    ];

  const customerNotes = {
   customerType,
   branchName: isResidential ? null : formData.branchName,
    physicalAddressDetails,
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
    customerType,
   businessName,
   contactFirstName: formData.contactFirstName,
   contactLastName: formData.contactLastName,
   email: formData.email,
   phoneNumber: formData.phoneNumber,
   alternatePhone: formData.alternatePhone,
  physicalAddress: formattedPhysicalAddress,
    physicalAddressDetails,
   billingAddress: formData.billingAddress,
   vatNumber: formData.vatNumber,
   accountStatus: formData.accountStatus,
  notes: JSON.stringify(customerNotes),
  sites: businessSites,
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
    streetAddress: '',
    complexName: '',
    siteAddressDetail: '',
    suburb: '',
    cityDistrict: '',
    province: '',
    postalCode: '',
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
  setCreatedCustomer(null);
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  try {
   const customerPayload = buildCustomerPayload();
   const customerResponse = await api.post('/customers', customerPayload, {
    headers: { Authorization: `Bearer ${user.token}` }
   });

   const created = customerResponse.data;
   setCreatedCustomer(created);
   setSuccess('Customer saved successfully. You can now continue to service booking.');
   fetchCustomers();
  } catch (err) {
   setError(err.response?.data?.message || 'Failed to save customer');
  }
 };

 const handleBookService = () => {
  if (!createdCustomer) {
   navigate('/service-call-registration');
   return;
  }

  navigate('/service-call-registration', {
   state: {
    prefillCustomer: {
     id: createdCustomer._id,
     customerType: createdCustomer.customerType,
     businessName: createdCustomer.businessName,
     contactFirstName: createdCustomer.contactFirstName,
     contactLastName: createdCustomer.contactLastName,
     email: createdCustomer.email,
     phoneNumber: createdCustomer.phoneNumber,
     physicalAddressDetails: createdCustomer.physicalAddressDetails,
    },
   },
  });
 };

 if (loading) {
  return (
   <>
    <Sidebar />
    <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center">
     <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-white/70">Loading customers...</p>
     </div>
    </div>
   </>
  );
 }

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-[1200px] mx-auto ">
     <div className="mb-8">
      <h1 className="glass-heading text-3xl">Customers</h1>
      <p className="text-white/70 mt-2">Log customer details and service requests</p>
     </div>

     {success && (
      <div className="glass-alert-success mb-4 p-4 rounded-lg">
       {success}
      </div>
     )}
     {error && (
      <div className="glass-alert-error mb-4 p-4 rounded-lg">
       {error}
      </div>
     )}

     <form onSubmit={handleSubmit} className="space-y-8">
      <div className="glass-card rounded-2xl shadow-xl p-8">
       <h2 className="glass-heading text-xl mb-6">Customer Type</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
         <label className="glass-form-label">Customer Type</label>
         <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
          className="glass-form-select"
         >
          <option value="headOffice">Head Office</option>
          <option value="branch">Branch</option>
          <option value="franchise">Franchise</option>
          <option value="singleBusiness">Single Business</option>
          <option value="residential">Residential</option>
         </select>
        </div>
       </div>
      </div>

      
       <div className="glass-card rounded-2xl shadow-xl p-8">
        <h2 className="glass-heading text-xl mb-6">Customer Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {customerType !== 'residential' && (
          <div className="md:col-span-2">
           <label className="glass-form-label">Business Name *</label>
           <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            required
            className="glass-form-input"
           />
          </div>
         )}
         {customerType !== 'residential' && (
          <div className="md:col-span-2">
          <label className="glass-form-label">Branch / Site Name</label>
           <input
            type="text"
            name="branchName"
            value={formData.branchName}
            onChange={handleInputChange}
          required={customerType === 'branch' || customerType === 'franchise'}
            className="glass-form-input"
           />
          </div>
         )}
         <div>
          <label className="glass-form-label">
           {customerType !== 'residential' ? 'Contact Person Name *' : 'Name *'}
          </label>
          <input
           type="text"
           name="contactFirstName"
           value={formData.contactFirstName}
           onChange={handleInputChange}
           required
           className="glass-form-input"
          />
         </div>
         <div>
          <label className="glass-form-label">
           {customerType !== 'residential' ? 'Contact Person Surname *' : 'Surname *'}
          </label>
          <input
           type="text"
           name="contactLastName"
           value={formData.contactLastName}
           onChange={handleInputChange}
           required
           className="glass-form-input"
          />
         </div>
         <div>
          <label className="glass-form-label">Email *</label>
          <input
           type="email"
           name="email"
           value={formData.email}
           onChange={handleInputChange}
           required
           className="glass-form-input"
          />
         </div>
         <div>
          <label className="glass-form-label">Phone Number *</label>
          <input
           type="text"
           name="phoneNumber"
           value={formData.phoneNumber}
           onChange={handleInputChange}
           required
           className="glass-form-input"
          />
         </div>
         <div>
          <label className="glass-form-label">Alternate Phone</label>
          <input
           type="text"
           name="alternatePhone"
           value={formData.alternatePhone}
           onChange={handleInputChange}
           className="glass-form-input"
          />
         </div>
         <div className="md:col-span-2">
          <label className="glass-form-label">
           {customerType !== 'residential' ? 'Physical Address *' : 'Residential Address *'}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
           <input
            type="text"
            name="streetAddress"
            value={formData.streetAddress}
            onChange={handleInputChange}
            required
            placeholder="Street Address"
            className="glass-form-input"
           />
           <input
            type="text"
            name="complexName"
            value={formData.complexName}
            onChange={handleInputChange}
            placeholder="Complex / Industrial Park"
            className="glass-form-input"
           />
           <input
            type="text"
            name="siteAddressDetail"
            value={formData.siteAddressDetail}
            onChange={handleInputChange}
            placeholder="Unit / Site Detail"
            className="glass-form-input"
           />
           <input
            type="text"
            name="suburb"
            value={formData.suburb}
            onChange={handleInputChange}
            required
            placeholder="Suburb"
            className="glass-form-input"
           />
           <input
            type="text"
            name="cityDistrict"
            value={formData.cityDistrict}
            onChange={handleInputChange}
            required
            placeholder="City / District"
            className="glass-form-input"
           />
           <input
            type="text"
            name="province"
            value={formData.province}
            onChange={handleInputChange}
            required
            placeholder="Province"
            className="glass-form-input"
           />
           <input
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
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
             </Autocomplete>
             <div className="h-72 w-full rounded-lg overflow-hidden border border-white/20">
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
        </div>

        {customerType !== 'residential' && (
         <div className="mt-8">
          <h3 className="glass-heading-secondary text-lg mb-4">Business Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
            <label className="glass-form-label">Branches</label>
            <select
             name="isMultiBranch"
             value={formData.isMultiBranch}
             onChange={handleInputChange}
             className="glass-form-select"
            >
             <option value="no">One branch</option>
             <option value="yes">Many branches</option>
            </select>
           </div>
           {formData.isMultiBranch === 'yes' && (
            <>
             <div>
              <label className="glass-form-label">Number of Branches</label>
              <input
               type="number"
               name="branchCount"
               value={formData.branchCount}
               onChange={handleInputChange}
               className="glass-form-select"
              />
             </div>
             <div>
              <label className="glass-form-label">Same contact for all branches?</label>
              <select
               name="branchContactSame"
               value={formData.branchContactSame}
               onChange={handleInputChange}
               className="glass-form-select"
              >
               <option value="yes">Yes</option>
               <option value="no">No, per-branch contact</option>
              </select>
             </div>
            </>
           )}
           <div>
            <label className="glass-form-label">Number of Machines</label>
            <input
             type="number"
             name="machineCount"
             value={formData.machineCount}
             onChange={handleInputChange}
             className="glass-form-select"
            />
           </div>
           <div>
            <label className="glass-form-label">Machines distributed across locations?</label>
            <select
             name="machinesDistributed"
             value={formData.machinesDistributed}
             onChange={handleInputChange}
             className="glass-form-select"
            >
             <option value="no">All at one location</option>
             <option value="yes">Various locations</option>
            </select>
           </div>
          </div>
         </div>
        )}
       </div>
      <div className="glass-card rounded-2xl shadow-xl p-8">
       <h2 className="glass-heading text-xl mb-6">Locations</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
         <label className="glass-form-label">Booking Location</label>
         <input
          type="text"
          name="bookingLocation"
          value={formData.bookingLocation}
          onChange={handleInputChange}
          placeholder="Where the booking is logged"
          className="glass-form-input"
         />
        </div>
        <div>
         <label className="glass-form-label">Service Location</label>
         <input
          type="text"
          name="serviceLocation"
          value={formData.serviceLocation}
          onChange={handleInputChange}
          placeholder="Where service is needed"
          className="glass-form-input"
         />
        </div>
        <div className="md:col-span-2">
         <label className="glass-form-label">Location Relationship</label>
         <input
          type="text"
          name="locationRelationship"
          value={formData.locationRelationship}
          onChange={handleInputChange}
          placeholder="If different, describe the relationship"
          className="glass-form-input"
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
        className="glass-btn-primary px-6 py-2"
       >
        Save Customer Profile
       </button>
       {createdCustomer && (
        <button
         type="button"
         onClick={handleBookService}
         className="glass-btn-outline px-6 py-2"
        >
         Book Service
        </button>
       )}
      </div>
     </form>
    </div>
   </div>
  </>
 );
};

export default RegisterNewCustomer;
