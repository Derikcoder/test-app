/**
 * @file ServiceCallRegistration.jsx
 * @description Dedicated service call booking form.
 * Accessible from /service-call-registration.
 * Navigates back to /service-calls on successful submission.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreateQuoteModal from './CreateQuoteModal';

const SERVICE_BOOKING_CATALOG = {
 'generator-backup-power': {
  label: 'Generator & Backup Power',
  serviceTypes: [
   { value: 'Preventive Maintenance', requiresEquipmentDetails: true, equipmentLabel: 'Generator', capacityLabel: 'Capacity (kVA)' },
   { value: 'Emergency Repair', requiresEquipmentDetails: true, equipmentLabel: 'Generator', capacityLabel: 'Capacity (kVA)' },
   { value: 'Load Bank Testing', requiresEquipmentDetails: true, equipmentLabel: 'Generator', capacityLabel: 'Capacity (kVA)' },
   { value: 'Fuel System Service', requiresEquipmentDetails: true, equipmentLabel: 'Generator', capacityLabel: 'Capacity (kVA)' },
  ],
 },
 plumbing: {
  label: 'Plumbing',
  serviceTypes: [
   { value: 'Drain Unblocking', requiresEquipmentDetails: false },
   { value: 'Leak Detection & Repair', requiresEquipmentDetails: false },
   { value: 'Pipe Installation / Replacement', requiresEquipmentDetails: false },
   { value: 'Water Pump Service', requiresEquipmentDetails: true, equipmentLabel: 'Pump', capacityLabel: 'Pump Capacity (kW / kVA)' },
   { value: 'Electric Water Heater Service', requiresEquipmentDetails: true, equipmentLabel: 'Water Heater', capacityLabel: 'Heater Capacity (L / kW)' },
  ],
 },
 electrical: {
  label: 'Electrical',
  serviceTypes: [
   { value: 'Electrical Fault Finding', requiresEquipmentDetails: false },
   { value: 'DB Board Maintenance', requiresEquipmentDetails: false },
   { value: 'Pump Control Panel Service', requiresEquipmentDetails: true, equipmentLabel: 'Control Panel / Pump', capacityLabel: 'Rated Capacity (kW / A)' },
  ],
 },
 'general-maintenance': {
  label: 'General Maintenance',
  serviceTypes: [
   { value: 'Inspection & Assessment', requiresEquipmentDetails: false },
   { value: 'Corrective Maintenance', requiresEquipmentDetails: false },
  ],
 },
};

const DEFAULT_SERVICE_CATEGORY = 'generator-backup-power';

const getDefaultServiceTypeForCategory = (category) =>
 SERVICE_BOOKING_CATALOG[category]?.serviceTypes?.[0]?.value || 'Preventive Maintenance';

const getServiceTypeConfig = (serviceCategory, serviceType) =>
 SERVICE_BOOKING_CATALOG[serviceCategory]?.serviceTypes?.find((item) => item.value === serviceType) || null;

const ServiceCallRegistration = () => {
 const navigate = useNavigate();
 const location = useLocation();
 const { user } = useAuth();
 const prefill = location.state?.prefillCustomer || null;
 const isCustomerPortalBooking = Boolean(location.state?.isCustomerPortalBooking);
 const portalCustomer = location.state?.customer || null;
 const portalServiceCalls = location.state?.portalServiceCalls || [];

 // Derive business-type defaults from the customer's registered customerType
 const _portalTypeMap = {
  headOffice: { customerType: 'business', businessStructure: 'group', businessRole: 'headOffice' },
  branch:     { customerType: 'business', businessStructure: 'group', businessRole: 'branch' },
  franchise:  { customerType: 'business', businessStructure: 'group', businessRole: 'branch' },
  singleBusiness: { customerType: 'business', businessStructure: 'single', businessRole: 'headOffice' },
  residential: { customerType: 'private', businessStructure: 'single', businessRole: 'headOffice' },
 };
 const _portalDefaults = _portalTypeMap[portalCustomer?.customerType] || {
  customerType: 'business', businessStructure: 'single', businessRole: 'headOffice',
 };
 const _portalAddr = portalCustomer?.physicalAddressDetails || {};
 const _portalParentAccountId =
  typeof portalCustomer?.parentAccount === 'string'
   ? portalCustomer.parentAccount
   : portalCustomer?.parentAccount?._id || '';
 const _portalHasPastCalls = portalServiceCalls.some(
  (c) => c.status === 'completed' || c.status === 'invoiced',
 );

 const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
 const roleLabelMap = {
  superAdmin: 'Super Admin',
  businessAdministrator: 'Business Administrator',
  fieldServiceAgent: 'Field Service Agent',
  customer: 'Customer',
 };
 const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');
 const [pendingQuotationBlock, setPendingQuotationBlock] = useState(null);
 const [successMessage, setSuccessMessage] = useState('');
 const [serviceCalls, setServiceCalls] = useState([]);
 const [lastServiceAutofillMeta, setLastServiceAutofillMeta] = useState(null);
 const [headOffices, setHeadOffices] = useState([]);
 const [isFetchingHeadOffices, setIsFetchingHeadOffices] = useState(false);
 const [headOfficeFetchError, setHeadOfficeFetchError] = useState('');
 const [portalBookingMode, setPortalBookingMode] = useState(
  isCustomerPortalBooking && _portalHasPastCalls ? 'repeat' : 'new',
 );
 const [selectedPastCallId, setSelectedPastCallId] = useState('');

 const [formData, setFormData] = useState({
  customerType: isCustomerPortalBooking
   ? _portalDefaults.customerType
   : (prefill?.customerType === 'residential' ? 'private' : 'business'),
  businessStructure: isCustomerPortalBooking ? _portalDefaults.businessStructure : 'single',
  businessRole: isCustomerPortalBooking ? _portalDefaults.businessRole : 'headOffice',
  selectedHeadOfficeId: isCustomerPortalBooking ? _portalParentAccountId : '',
  companyName: isCustomerPortalBooking
   ? (portalCustomer?.businessName || '')
   : (prefill?.businessName || user?.businessName || ''),
  contactPerson: isCustomerPortalBooking
   ? `${portalCustomer?.contactFirstName || ''} ${portalCustomer?.contactLastName || ''}`.trim()
   : (prefill ? `${prefill.contactFirstName || ''} ${prefill.contactLastName || ''}`.trim() : ''),
  contactEmail: isCustomerPortalBooking
   ? (portalCustomer?.email || '')
   : (prefill?.email || user?.email || ''),
  contactPhone: isCustomerPortalBooking
   ? (portalCustomer?.phoneNumber || '')
   : (prefill?.phoneNumber || user?.phoneNumber || ''),
  siteName: '',
  adminStreetAddress: isCustomerPortalBooking
   ? (_portalAddr.streetAddress || '')
   : (prefill?.physicalAddressDetails?.streetAddress || user?.physicalAddress || ''),
  adminComplexName: isCustomerPortalBooking
   ? (_portalAddr.complexName || '')
   : (prefill?.physicalAddressDetails?.complexName || ''),
  adminSiteAddressDetail: isCustomerPortalBooking
   ? (_portalAddr.siteAddressDetail || '')
   : (prefill?.physicalAddressDetails?.siteAddressDetail || ''),
  adminSuburb: isCustomerPortalBooking
   ? (_portalAddr.suburb || '')
   : (prefill?.physicalAddressDetails?.suburb || ''),
  adminCityDistrict: isCustomerPortalBooking
   ? (_portalAddr.cityDistrict || '')
   : (prefill?.physicalAddressDetails?.cityDistrict || ''),
  adminProvince: isCustomerPortalBooking
   ? (_portalAddr.province || '')
   : (prefill?.physicalAddressDetails?.province || ''),
  adminPostalCode: isCustomerPortalBooking
   ? (_portalAddr.postalCode || '')
   : (prefill?.physicalAddressDetails?.postalCode || ''),
  machineLocationSameAsAdmin: 'yes',
  machineStreetAddress: '',
  machineComplexName: '',
  machineAddressDetail: '',
  machineSuburb: '',
  machineCityDistrict: '',
  machineProvince: '',
  machinePostalCode: '',
  machineLocationNotes: '',
  generatorMakeModel: '',
  generatorCapacityKva: '',
  machineModelNumber: '',
  serviceCategory: DEFAULT_SERVICE_CATEGORY,
  serviceType: getDefaultServiceTypeForCategory(DEFAULT_SERVICE_CATEGORY),
  urgency: 'high',
  serviceHistoryType: (isCustomerPortalBooking && _portalHasPastCalls) ? 'existing-customer' : 'first-service-call',
  servicesInProgress: '',
  progressStatus: 'N/A',
  quotationHistory: '',
  invoicingHistory: '',
  dateOfLastService: '',
  dateOfPreferredServiceCall: '',
  outageWindowApplicable: 'no',
  outageStart: '',
  outageEnd: '',
  preferredTimeWindow: '08:00 - 12:00',
  notes: '',
  confirmAccuracy: false,
 });

 const getServiceCallContactEmail = (call) => {
  const bookingEmail = call?.bookingRequest?.contact?.contactEmail;
  if (bookingEmail) return String(bookingEmail).toLowerCase().trim();
  const match = call?.description?.match(/Email:\s*([^\s]+)/i);
  if (match?.[1]) return String(match[1]).toLowerCase().trim();
  return '';
 };

 const findLastServiceDateByEmail = (email) => {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const matching = serviceCalls
   .filter((call) => getServiceCallContactEmail(call) === normalizedEmail)
   .sort((a, b) => {
    const dateA = new Date(a.completedDate || a.scheduledDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.completedDate || b.scheduledDate || b.createdAt || 0).getTime();
    return dateB - dateA;
   });
  if (!matching.length) return null;
  const latestCall = matching[0];
  const latestDate =
   latestCall.bookingRequest?.dateOfLastService ||
   latestCall.completedDate ||
   latestCall.scheduledDate ||
   latestCall.createdAt;
  if (!latestDate) return null;
  return {
   date: new Date(latestDate).toISOString().slice(0, 10),
   callNumber: latestCall.callNumber || 'Unknown',
  };
 };

 const fetchServiceCalls = async () => {
  try {
   const response = await api.get('/service-calls', {
    headers: { Authorization: `Bearer ${user?.token}` },
   });
   setServiceCalls(response.data || []);
  } catch {
   setServiceCalls([]);
  }
 };

 useEffect(() => {
  if (!user?.token) return;
  fetchServiceCalls();
 }, [user?.token]);

 useEffect(() => {
  const isBranch =
   formData.customerType === 'business' &&
   formData.businessStructure === 'group' &&
   formData.businessRole === 'branch';
  if (!isBranch) {
   setHeadOffices([]);
   setHeadOfficeFetchError('');
   return;
  }
  setIsFetchingHeadOffices(true);
  setHeadOfficeFetchError('');
  api
   .get('/customers', { headers: { Authorization: `Bearer ${user?.token}` } })
   .then((res) => {
    const hos = (res.data || []).filter((c) => c.customerType === 'headOffice');
    setHeadOffices(hos);
    if (hos.length === 0) setHeadOfficeFetchError('none');
   })
   .catch(() => setHeadOfficeFetchError('error'))
   .finally(() => setIsFetchingHeadOffices(false));
 }, [formData.customerType, formData.businessStructure, formData.businessRole, user?.token]);

 useEffect(() => {
  if (formData.serviceHistoryType !== 'existing-customer') {
   setLastServiceAutofillMeta(null);
   return;
  }
  const lastServiceData = findLastServiceDateByEmail(formData.contactEmail);
  setLastServiceAutofillMeta(lastServiceData);
  setFormData((prev) => ({
   ...prev,
   dateOfLastService: lastServiceData?.date || prev.dateOfLastService,
  }));
 }, [formData.serviceHistoryType, formData.contactEmail, serviceCalls]);

 const handleInputChange = (event) => {
  const { name, value, type, checked } = event.target;

  if (name === 'customerType') {
   setFormData((prev) => ({
    ...prev,
    customerType: value,
    businessStructure: 'single',
    businessRole: 'headOffice',
    selectedHeadOfficeId: '',
   }));
   return;
  }

  if (name === 'businessStructure') {
   setFormData((prev) => ({
    ...prev,
    businessStructure: value,
    businessRole: 'headOffice',
    selectedHeadOfficeId: '',
   }));
   return;
  }

  if (name === 'businessRole') {
   setFormData((prev) => ({
    ...prev,
    businessRole: value,
    selectedHeadOfficeId: '',
   }));
   return;
  }

  if (name === 'serviceCategory') {
   const nextServiceType = getDefaultServiceTypeForCategory(value);
   const nextServiceTypeConfig = getServiceTypeConfig(value, nextServiceType);
   const requiresEquipmentDetails = Boolean(nextServiceTypeConfig?.requiresEquipmentDetails);

   setFormData((prev) => ({
    ...prev,
    serviceCategory: value,
    serviceType: nextServiceType,
    ...(requiresEquipmentDetails
     ? {}
     : {
        generatorMakeModel: '',
        machineModelNumber: '',
        generatorCapacityKva: '',
       }),
   }));
   return;
  }

  if (name === 'serviceType') {
   const nextServiceTypeConfig = getServiceTypeConfig(formData.serviceCategory, value);
   const requiresEquipmentDetails = Boolean(nextServiceTypeConfig?.requiresEquipmentDetails);

   setFormData((prev) => ({
    ...prev,
    serviceType: value,
    ...(requiresEquipmentDetails
     ? {}
     : {
        generatorMakeModel: '',
        machineModelNumber: '',
        generatorCapacityKva: '',
       }),
   }));
   return;
  }

  setFormData((prev) => ({
   ...prev,
  ...(name === 'outageWindowApplicable' && value === 'no'
   ? { outageStart: '', outageEnd: '' }
   : {}),
   [name]: type === 'checkbox' ? checked : value,
  }));
 };

 const handleSelectPastCall = (callId) => {
  setSelectedPastCallId(callId);
  if (!callId) return;
  const call = portalServiceCalls.find((c) => c._id === callId);
  if (!call) return;
  const br = call.bookingRequest || {};
  const gd = br.generatorDetails || {};
  const category = br.serviceCategory || DEFAULT_SERVICE_CATEGORY;
  const nextServiceType = call.serviceType || getDefaultServiceTypeForCategory(category);
  const lastDate =
   call.completedDate
    ? new Date(call.completedDate).toISOString().slice(0, 10)
    : call.updatedAt
    ? new Date(call.updatedAt).toISOString().slice(0, 10)
    : '';
  const machineAddr = br.machineAddress || {};
  setFormData((prev) => ({
   ...prev,
   serviceCategory: category,
   serviceType: nextServiceType,
   siteName: gd.siteName || prev.siteName,
   generatorMakeModel: gd.generatorMakeModel || '',
   machineModelNumber: gd.machineModelNumber || '',
   generatorCapacityKva: gd.generatorCapacityKva ? String(gd.generatorCapacityKva) : '',
   machineLocationSameAsAdmin: gd.machineLocationSameAsAdmin === false ? 'no' : 'yes',
   machineStreetAddress: machineAddr.streetAddress || '',
   machineComplexName: machineAddr.complexName || '',
   machineAddressDetail: machineAddr.siteAddressDetail || '',
   machineSuburb: machineAddr.suburb || '',
   machineCityDistrict: machineAddr.cityDistrict || '',
   machineProvince: machineAddr.province || '',
   machinePostalCode: machineAddr.postalCode || '',
   machineLocationNotes: gd.machineLocationNotes || '',
   dateOfLastService: lastDate,
  }));
 };

 const validateForm = () => {
  const serviceTypeConfig = getServiceTypeConfig(formData.serviceCategory, formData.serviceType);
  const requiresEquipmentDetails = Boolean(serviceTypeConfig?.requiresEquipmentDetails);

  if (!isCustomerPortalBooking && !formData.contactPerson.trim()) return 'Contact person is required.';
  if (!isCustomerPortalBooking && !/^\S+@\S+\.\S+$/.test(formData.contactEmail)) return 'A valid contact email is required.';
  if (!isCustomerPortalBooking && !formData.contactPhone.trim()) return 'Contact phone is required.';
  if (formData.customerType === 'business') {
   if (!isCustomerPortalBooking && !formData.companyName.trim()) return 'Company name is required.';
   if (!isCustomerPortalBooking && !formData.siteName.trim()) return 'Site name is required.';
   if (
    !isCustomerPortalBooking &&
    formData.businessStructure === 'group' &&
    formData.businessRole === 'branch' &&
    !formData.selectedHeadOfficeId
   ) return 'Please select a Head Office to link this branch service call to.';
  }
  if (formData.machineLocationSameAsAdmin === 'no') {
   if (!formData.machineStreetAddress.trim()) return 'Machine location street address is required.';
   if (!formData.machineSuburb.trim()) return 'Machine location suburb is required.';
   if (!formData.machineCityDistrict.trim()) return 'Machine location city/district is required.';
   if (!formData.machineProvince.trim()) return 'Machine location province is required.';
   if (!formData.machinePostalCode.trim()) return 'Machine location postal code is required.';
  }
  if (!formData.adminStreetAddress.trim())
   return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} street address is required.`;
  if (!formData.adminSuburb.trim())
   return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} suburb is required.`;
  if (!formData.adminCityDistrict.trim())
   return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} city/district is required.`;
  if (!formData.adminProvince.trim())
   return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} province is required.`;
  if (!formData.adminPostalCode.trim())
   return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} postal code is required.`;
  if (requiresEquipmentDetails) {
   if (!formData.generatorMakeModel.trim()) return 'Equipment make/model is required for this service type.';
   if (!formData.machineModelNumber.trim()) return 'Equipment model number is required for this service type.';
   if (!formData.generatorCapacityKva || Number(formData.generatorCapacityKva) <= 0)
    return 'Equipment capacity must be greater than 0 for this service type.';
  }
  if (formData.serviceHistoryType === 'first-service-call' && !formData.dateOfPreferredServiceCall)
   return 'Preferred site visit date is required.';
  if (formData.serviceHistoryType === 'existing-customer') {
  if (!isCustomerPortalBooking && !formData.dateOfLastService) return 'Date of last service is required for existing customers.';
  if (!isCustomerPortalBooking && !formData.servicesInProgress.trim()) return 'Services in progress is required for existing customers.';
  if (!isCustomerPortalBooking && !formData.progressStatus.trim()) return 'Progress status is required for existing customers.';
   if (!formData.dateOfPreferredServiceCall) return 'Preferred service call date is required.';
  }
  if (formData.outageWindowApplicable === 'yes' && (!formData.outageStart || !formData.outageEnd)) {
   return 'Outage window start and end are required when outage window is marked applicable.';
  }
  if (
   formData.outageWindowApplicable === 'yes'
   && formData.outageStart
   && formData.outageEnd
   && new Date(formData.outageStart) >= new Date(formData.outageEnd)
  )
    return 'Outage end time must be after outage start time.';
  if (!formData.confirmAccuracy) return 'Please confirm the information is accurate.';
  return null;
 };

 const formatAddress = (prefix) => {
  const street = formData[`${prefix}StreetAddress`]?.trim();
  const complex = formData[`${prefix}ComplexName`]?.trim();
  const detail =
   formData[`${prefix}AddressDetail`]?.trim() || formData[`${prefix}SiteAddressDetail`]?.trim();
  const suburb = formData[`${prefix}Suburb`]?.trim();
  const cityDistrict = formData[`${prefix}CityDistrict`]?.trim();
  const province = formData[`${prefix}Province`]?.trim();
  const postalCode = formData[`${prefix}PostalCode`]?.trim();
  return [
   street,
   complex ? `Complex/Industrial Park: ${complex}` : null,
   detail ? `Unit/Site Detail: ${detail}` : null,
   suburb,
   cityDistrict,
   province,
   postalCode ? `Postal Code: ${postalCode}` : null,
  ]
   .filter(Boolean)
   .join(', ');
 };

 const buildPayload = () => {
  const serviceTypeConfig = getServiceTypeConfig(formData.serviceCategory, formData.serviceType);
  const requiresEquipmentDetails = Boolean(serviceTypeConfig?.requiresEquipmentDetails);
  const serviceCategoryLabel = SERVICE_BOOKING_CATALOG[formData.serviceCategory]?.label || formData.serviceCategory;
  const equipmentLabel = serviceTypeConfig?.equipmentLabel || 'Equipment';
  const capacityLabel = serviceTypeConfig?.capacityLabel || 'Capacity';
  const isBusiness = formData.customerType === 'business';
  const administrativeAddress = {
   streetAddress: formData.adminStreetAddress,
   complexName: formData.adminComplexName,
   siteAddressDetail: formData.adminSiteAddressDetail,
   suburb: formData.adminSuburb,
   cityDistrict: formData.adminCityDistrict,
   province: formData.adminProvince,
   postalCode: formData.adminPostalCode,
  };
  const machineAddress =
   formData.machineLocationSameAsAdmin === 'yes'
    ? administrativeAddress
    : {
       streetAddress: formData.machineStreetAddress,
       complexName: formData.machineComplexName,
       siteAddressDetail: formData.machineAddressDetail,
       suburb: formData.machineSuburb,
       cityDistrict: formData.machineCityDistrict,
       province: formData.machineProvince,
       postalCode: formData.machinePostalCode,
      };
  const resolvedServiceLocation =
   formData.machineLocationSameAsAdmin === 'yes'
    ? formatAddress('admin')
    : formatAddress('machine');
  const outageWindowIsApplicable = formData.outageWindowApplicable === 'yes';
  const hasOutageWindow = outageWindowIsApplicable && Boolean(formData.outageStart && formData.outageEnd);
  const outageWindowSummary = hasOutageWindow
   ? `${new Date(formData.outageStart).toLocaleString()} -> ${new Date(formData.outageEnd).toLocaleString()}`
   : 'Not applicable';
  const resolvedHeadOfficeId =
   isBusiness && formData.businessStructure === 'group' && formData.businessRole === 'branch'
    ? (formData.selectedHeadOfficeId || _portalParentAccountId)
    : '';
  const title = isBusiness
   ? `${formData.serviceType} - ${formData.companyName}${formData.siteName ? ` (${formData.siteName})` : ''}`
   : `${formData.serviceType} - Private Customer (${formData.contactPerson})`;

  const equipmentDescriptionLines = requiresEquipmentDetails
   ? [
      `${equipmentLabel}: ${formData.generatorMakeModel}`,
      `Equipment Model Number: ${formData.machineModelNumber}`,
      `${capacityLabel}: ${formData.generatorCapacityKva}`,
     ]
   : ['Equipment Details: Not required for selected service type'];

  const descriptionLines = isBusiness
   ? [
      `Customer Type: Business`,
      `Company: ${formData.companyName}`,
      `Contact: ${formData.contactPerson}`,
      `Email: ${formData.contactEmail}`,
      `Phone: ${formData.contactPhone}`,
      `Service Category: ${serviceCategoryLabel}`,
      `Site Name: ${formData.siteName}`,
      `Administrative Address: ${formatAddress('admin')}`,
      `Machine Location Same As Admin: ${formData.machineLocationSameAsAdmin === 'yes' ? 'Yes' : 'No'}`,
      `Machine Technical Address: ${resolvedServiceLocation}`,
      `Machine Location Notes: ${formData.machineLocationNotes || 'None'}`,
      ...equipmentDescriptionLines,
      `Service History Type: ${formData.serviceHistoryType === 'existing-customer' ? 'Existing Customer' : 'First Service Call'}`,
      `Date of Last Service: ${formData.dateOfLastService || 'N/A'}`,
      `Services in Progress: ${formData.servicesInProgress || 'N/A'}`,
      `Progress Status: ${formData.progressStatus || 'N/A'}`,
      `Quotation History: ${formData.quotationHistory || 'N/A'}`,
      `Invoicing History: ${formData.invoicingHistory || 'N/A'}`,
      `Preferred Service Call Date: ${formData.dateOfPreferredServiceCall}`,
      `Service Type: ${formData.serviceType}`,
      `Urgency: ${formData.urgency}`,
      `Outage Window Applicable: ${outageWindowIsApplicable ? 'Yes' : 'No'}`,
      `Load Shedding Window: ${outageWindowSummary}`,
      `Preferred Time Window: ${formData.preferredTimeWindow}`,
      `Notes: ${formData.notes || 'None'}`,
     ]
   : [
      `Customer Type: Private`,
      `Contact: ${formData.contactPerson}`,
      `Email: ${formData.contactEmail}`,
      `Phone: ${formData.contactPhone}`,
      `Service Category: ${serviceCategoryLabel}`,
      `Residential Address: ${formatAddress('admin')}`,
      `Machine Located At Residential Address: ${formData.machineLocationSameAsAdmin === 'yes' ? 'Yes' : 'No'}`,
      `Machine Address: ${resolvedServiceLocation}`,
      `Machine Location Notes: ${formData.machineLocationNotes || 'None'}`,
      ...equipmentDescriptionLines,
      `Service History Type: ${formData.serviceHistoryType === 'existing-customer' ? 'Existing Customer' : 'First Service Call'}`,
      `Date of Last Service: ${formData.dateOfLastService || 'N/A'}`,
      `Services in Progress: ${formData.servicesInProgress || 'N/A'}`,
      `Progress Status: ${formData.progressStatus || 'N/A'}`,
      `Quotation History: ${formData.quotationHistory || 'N/A'}`,
      `Invoicing History: ${formData.invoicingHistory || 'N/A'}`,
      `Preferred Service Call Date: ${formData.dateOfPreferredServiceCall}`,
      `Service Type: ${formData.serviceType}`,
      `Urgency: ${formData.urgency}`,
      `Outage Window Applicable: ${outageWindowIsApplicable ? 'Yes' : 'No'}`,
      `Load Shedding Window: ${outageWindowSummary}`,
      `Preferred Time Window: ${formData.preferredTimeWindow}`,
      `Notes: ${formData.notes || 'None'}`,
     ];

  return {
   title,
   description: descriptionLines.join('\n'),
   priority: formData.urgency,
   serviceType: formData.serviceType,
   scheduledDate: new Date(formData.dateOfPreferredServiceCall).toISOString(),
   serviceLocation: resolvedServiceLocation,
   bookingRequest: {
    contact: {
     customerType: formData.customerType,
     businessStructure: isBusiness ? formData.businessStructure : '',
     businessRole: (isBusiness && formData.businessStructure === 'group') ? formData.businessRole : '',
    headOfficeId: resolvedHeadOfficeId,
     companyName: isBusiness ? formData.companyName : '',
     contactPerson: formData.contactPerson,
     contactEmail: formData.contactEmail,
     contactPhone: formData.contactPhone,
    },
    administrativeAddress,
    machineAddress,
    generatorDetails: {
     siteName: isBusiness ? formData.siteName : '',
     generatorMakeModel: requiresEquipmentDetails ? formData.generatorMakeModel : '',
     machineModelNumber: requiresEquipmentDetails ? formData.machineModelNumber : '',
     generatorCapacityKva: requiresEquipmentDetails && formData.generatorCapacityKva
      ? Number(formData.generatorCapacityKva)
      : null,
     machineLocationSameAsAdmin: formData.machineLocationSameAsAdmin === 'yes',
     machineLocationNotes: formData.machineLocationNotes,
    },
    outageWindow: hasOutageWindow
     ? {
        start: new Date(formData.outageStart).toISOString(),
        end: new Date(formData.outageEnd).toISOString(),
       }
     : null,
    serviceCategory: formData.serviceCategory,
    preferredDate: new Date(formData.dateOfPreferredServiceCall).toISOString(),
    dateOfLastService: formData.dateOfLastService
     ? new Date(formData.dateOfLastService).toISOString()
     : null,
    serviceHistoryType: formData.serviceHistoryType,
    servicesInProgress: formData.servicesInProgress,
    progressStatus: formData.progressStatus,
    quotationHistory: formData.quotationHistory,
    invoicingHistory: formData.invoicingHistory,
    preferredTimeWindow: formData.preferredTimeWindow,
    additionalNotes: formData.notes,
   },
  };
 };

 const handleSubmit = async (event) => {
  event.preventDefault();
  setErrorMessage('');
  setSuccessMessage('');
  const validationError = validateForm();
  if (validationError) {
   setErrorMessage(validationError);
   return;
  }
  try {
   setIsSubmitting(true);
   await api.post('/service-calls', buildPayload(), {
    headers: { Authorization: `Bearer ${user?.token}` },
   });
   setSuccessMessage('Service call booked successfully. Redirecting to the service call queue...');
  setTimeout(() => navigate(isCustomerPortalBooking ? '/customer/services' : '/service-calls'), 1500);
  } catch (error) {
   if (error?.response?.status === 409 && error?.response?.data?.canRegister) {
    setPendingQuotationBlock(error.response.data);
    return;
   }
   setErrorMessage(
    error?.response?.data?.message || 'Unable to submit booking. Please try again.'
   );
  } finally {
   setIsSubmitting(false);
  }
 };

 const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

 const selectedCategoryConfig =
  SERVICE_BOOKING_CATALOG[formData.serviceCategory] || SERVICE_BOOKING_CATALOG[DEFAULT_SERVICE_CATEGORY];
 const selectedServiceTypeConfig = getServiceTypeConfig(formData.serviceCategory, formData.serviceType);
 const requiresEquipmentDetails = Boolean(selectedServiceTypeConfig?.requiresEquipmentDetails);
 const equipmentLabel = selectedServiceTypeConfig?.equipmentLabel || 'Equipment';
 const capacityLabel = selectedServiceTypeConfig?.capacityLabel || 'Capacity';

 const quoteSourceData = useMemo(
  () => ({
   serviceType: formData.serviceType,
   machineModelNumber: requiresEquipmentDetails ? formData.machineModelNumber : '',
   generatorMakeModel: requiresEquipmentDetails ? formData.generatorMakeModel : '',
   title: `${formData.serviceType} Quotation`,
   description: [
    `Service Category: ${selectedCategoryConfig?.label || 'N/A'}`,
    `Customer Type: ${formData.customerType}`,
    `Contact Person: ${formData.contactPerson || 'N/A'}`,
    `${equipmentLabel}: ${requiresEquipmentDetails ? formData.generatorMakeModel || 'N/A' : 'Not required'}`,
    `Equipment Model Number: ${requiresEquipmentDetails ? formData.machineModelNumber || 'N/A' : 'Not required'}`,
    `${capacityLabel}: ${requiresEquipmentDetails ? formData.generatorCapacityKva || 'N/A' : 'Not required'}`,
   ].join('\n'),
   notes: formData.notes,
   lineItems: [{ description: formData.serviceType || 'Service Work', quantity: 1, unitPrice: 0 }],
  }),
  [
   formData.serviceType,
    formData.serviceCategory,
   formData.machineModelNumber,
   formData.generatorMakeModel,
   formData.customerType,
   formData.contactPerson,
   formData.generatorCapacityKva,
   formData.notes,
    requiresEquipmentDetails,
    selectedCategoryConfig?.label,
    equipmentLabel,
    capacityLabel,
  ]
 );

 if (!user) return null;

 return (
  <>
   <Sidebar />
   <div className="page-body sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
     <section className="service-booking-hero section-transition">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
       <div>
        <p className="service-booking-kicker">Service Workspace</p>
        <div className="service-booking-crumb mt-2">
         <span>Service Calls</span>
         <span className="text-white/40">/</span>
         <span className="font-semibold text-cyan-100">Registration</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Book a Service Call</h1>
        <p className="mt-2 text-sm text-white/85">
         Register a new service request with category-aware dispatch details.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
         <span className="service-booking-chip service-booking-chip-entity">Entity: Service Call Registration</span>
         <span className={`service-booking-chip ${isSuperAdmin ? 'service-booking-chip-admin' : 'service-booking-chip-role'}`}>
          Role: {roleLabel}
         </span>
         {prefill && (
          <span className="service-booking-chip service-booking-chip-prefill">Pre-filled from customer profile</span>
         )}
        </div>
       </div>

       <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <article className="service-booking-metric">
         <p className="service-booking-metric-label">Category</p>
         <p className="service-booking-metric-value">{selectedCategoryConfig?.label || 'N/A'}</p>
        </article>
        <article className="service-booking-metric">
         <p className="service-booking-metric-label">Request</p>
         <p className="service-booking-metric-value">{formData.serviceType}</p>
        </article>
        <article className="service-booking-metric">
         <p className="service-booking-metric-label">Equipment</p>
         <p className="service-booking-metric-value">{requiresEquipmentDetails ? 'Required' : 'Not Required'}</p>
        </article>
        <article className="service-booking-metric">
         <p className="service-booking-metric-label">Urgency</p>
         <p className="service-booking-metric-value">{formData.urgency}</p>
        </article>
       </div>
      </div>
     </section>

     <div className="card card-glass glass-card rounded-2xl shadow-xl overflow-hidden section-transition">
      <form onSubmit={handleSubmit} className="service-booking-form">
       {pendingQuotationBlock && (
        <div className="rounded-xl p-6 border border-amber-400/40 bg-amber-500/10">
         <div className="flex items-start gap-4">
          <span className="text-2xl leading-none mt-0.5">&#9888;&#65039;</span>
          <div className="flex-1">
           <h3 className="text-sm font-bold text-amber-300 uppercase tracking-widest mb-1">
            Pending Quotation Detected
           </h3>
           <p className="text-sm text-white/80 mb-4">
            Quotation{' '}
            <span className="font-semibold text-yellow-300">{pendingQuotationBlock.quotationNumber}</span>{' '}
            is still awaiting acceptance for{' '}
            <span className="font-semibold">{pendingQuotationBlock.email}</span>.
            A new service call is not required until the current quotation is resolved.
           </p>
           <div className="flex flex-wrap gap-3">
            <button
             type="button"
             onClick={() =>
              navigate('/customers/register', {
               state: {
                prefillEmail: pendingQuotationBlock.email,
                prefillQuotationNumber: pendingQuotationBlock.quotationNumber,
               },
              })
             }
             className="glass-btn-primary py-2 px-5 text-sm"
            >
             Register Customer Account
            </button>
            <button
             type="button"
             onClick={() => setPendingQuotationBlock(null)}
             className="glass-btn-secondary py-2 px-5 text-sm"
            >
             &larr; Back to Form
            </button>
           </div>
          </div>
         </div>
        </div>
       )}
       {errorMessage && (
        <div className="rounded-lg px-4 py-3 border border-red-300/40 bg-red-500/20 text-white">
         {errorMessage}
        </div>
       )}
       {successMessage && (
        <div className="rounded-lg px-4 py-3 border border-emerald-300/40 bg-emerald-500/20 text-white">
         {successMessage}
        </div>
       )}

       {/* ── Portal mode: Service Mode selector ────────────────────────────────── */}
       {isCustomerPortalBooking && (
        <section className="space-y-4">
         <h2 className="glass-heading-secondary">Service Mode</h2>
         <div className="flex flex-wrap gap-4">
          <label className={`flex items-center gap-2 cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${portalBookingMode === 'repeat' ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-100' : 'border-white/20 bg-slate-900/40 text-white/75 hover:border-white/40'}`}>
           <input
            type="radio"
            name="portalBookingMode"
            value="repeat"
            checked={portalBookingMode === 'repeat'}
            onChange={() => { setPortalBookingMode('repeat'); setSelectedPastCallId(''); }}
            className="accent-cyan-400"
           />
           Repeat a previous service
          </label>
          <label className={`flex items-center gap-2 cursor-pointer rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${portalBookingMode === 'new' ? 'border-emerald-400/60 bg-emerald-950/50 text-emerald-100' : 'border-white/20 bg-slate-900/40 text-white/75 hover:border-white/40'}`}>
           <input
            type="radio"
            name="portalBookingMode"
            value="new"
            checked={portalBookingMode === 'new'}
            onChange={() => { setPortalBookingMode('new'); setSelectedPastCallId(''); }}
            className="accent-emerald-400"
           />
           Book a new service
          </label>
         </div>

         {portalBookingMode === 'repeat' && (
          <div className="space-y-3">
           {portalServiceCalls.filter((c) => c.status === 'completed' || c.status === 'invoiced').length === 0 ? (
            <p className="text-sm text-white/60 rounded-xl border border-white/10 bg-slate-900/40 p-4">
             No completed services found. Choose <strong className="text-white/80">Book a new service</strong> to get started.
            </p>
           ) : (
            <>
             <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/60">Select a completed service to repeat</label>
             <select
              value={selectedPastCallId}
              onChange={(e) => handleSelectPastCall(e.target.value)}
              className="dark-field-input"
             >
              <option value="" className="text-black">— Choose a previous service call —</option>
              {portalServiceCalls
               .filter((c) => c.status === 'completed' || c.status === 'invoiced')
               .sort((a, b) => new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt))
               .map((c) => {
                const gd = c.bookingRequest?.generatorDetails || {};
                const label = [
                 c.callNumber,
                 c.serviceType,
                 gd.siteName,
                 gd.generatorMakeModel,
                ].filter(Boolean).join(' — ');
                return (
                 <option key={c._id} value={c._id} className="text-black">{label}</option>
                );
               })}
             </select>
             {selectedPastCallId && (
              <div className="flex flex-wrap gap-2 pt-1">
               <span className="service-booking-chip service-booking-chip-prefill">
                Service type pre-filled
               </span>
               {formData.generatorMakeModel && (
                <span className="service-booking-chip service-booking-chip-entity">
                 {formData.generatorMakeModel}
                 {formData.generatorCapacityKva ? ` · ${formData.generatorCapacityKva} kVA` : ''}
                </span>
               )}
              </div>
             )}
            </>
           )}
          </div>
         )}
        </section>
       )}

        <section className="space-y-4">
         <h2 className="glass-heading-secondary">Service Category & Request Type</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
           name="serviceCategory"
           value={formData.serviceCategory}
           onChange={handleInputChange}
           className="dark-field-input"
          >
           {Object.entries(SERVICE_BOOKING_CATALOG).map(([key, category]) => (
            <option key={key} value={key} className="text-black">{category.label}</option>
           ))}
          </select>
          <select
           name="serviceType"
           value={formData.serviceType}
           onChange={handleInputChange}
           className="dark-field-input"
          >
           {selectedCategoryConfig.serviceTypes.map((serviceTypeOption) => (
            <option key={serviceTypeOption.value} value={serviceTypeOption.value} className="text-black">
             {serviceTypeOption.value}
            </option>
           ))}
          </select>
         </div>
         <p className="text-xs text-white/70">
          Select category first. Equipment details appear only for request types that require machine-specific information.
         </p>
        </section>

        {isCustomerPortalBooking ? (
         <section className="space-y-3">
          <h2 className="glass-heading-secondary">Your Account</h2>
          <div className="rounded-xl border border-cyan-400/25 bg-slate-900/60 p-4 space-y-3">
           <div className="flex flex-wrap gap-2 mb-1">
            <span className="service-booking-chip service-booking-chip-entity">
             {formData.customerType === 'private'
              ? 'Private Customer'
              : formData.businessStructure === 'single'
              ? 'Single Business'
              : formData.businessRole === 'headOffice'
              ? 'Group — Head Office'
              : 'Group — Branch / Franchise'}
            </span>
            <span className="service-booking-chip service-booking-chip-prefill">Verified Profile</span>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {formData.companyName && (
             <div>
              <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Company</p>
              <p className="text-white/90 font-medium">{formData.companyName}</p>
             </div>
            )}
            <div>
             <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Contact</p>
             <p className="text-white/90 font-medium">{formData.contactPerson || '—'}</p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Email</p>
             <p className="text-white/90">{formData.contactEmail || '—'}</p>
            </div>
            <div>
             <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Phone</p>
             <p className="text-white/90">{formData.contactPhone || '—'}</p>
            </div>
            {formData.adminStreetAddress && (
             <div className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">Address</p>
              <p className="text-white/90">
               {[formData.adminStreetAddress, formData.adminSuburb, formData.adminCityDistrict, formData.adminProvince].filter(Boolean).join(', ')}
              </p>
             </div>
            )}
           </div>
          </div>
          <p className="text-xs text-white/45">Contact and address details are pre-filled from your registered profile. To update them, visit your profile settings.</p>
         </section>
        ) : (
         <>
          <section className="space-y-4">
           <h2 className="glass-heading-secondary">Customer Type</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
             <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60">Customer Category</label>
             <select
              name="customerType"
              value={formData.customerType}
              onChange={handleInputChange}
              className="dark-field-input"
             >
              <option value="business" className="text-black">Business</option>
              <option value="private" className="text-black">Private</option>
             </select>
            </div>
            {formData.customerType === 'business' && (
             <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60">Business Structure</label>
              <select
               name="businessStructure"
               value={formData.businessStructure}
               onChange={handleInputChange}
               className="dark-field-input"
              >
               <option value="single" className="text-black">Single Business</option>
               <option value="group" className="text-black">Group Business</option>
              </select>
             </div>
            )}
           </div>
           {formData.customerType === 'business' && formData.businessStructure === 'group' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60">Business Role</label>
              <select
               name="businessRole"
               value={formData.businessRole}
               onChange={handleInputChange}
               className="dark-field-input"
              >
               <option value="headOffice" className="text-black">Head Office</option>
               <option value="branch" className="text-black">Branch / Franchise</option>
              </select>
             </div>
             {formData.businessRole === 'branch' && (
              <div>
               <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/60">Link to Head Office</label>
               {isFetchingHeadOffices ? (
                <p className="text-sm text-white/60">Loading registered head offices…</p>
               ) : headOfficeFetchError === 'error' ? (
                <p className="text-sm text-red-400">Failed to load head offices. Please refresh and try again.</p>
               ) : headOfficeFetchError === 'none' ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
                 <p className="text-sm font-semibold text-amber-300">No Head Office registered yet.</p>
                 <p className="mt-1 text-xs text-amber-200/80">
                  A Head Office must be registered before a Branch can be linked. Please register the Head Office first, then return to book this service call.
                 </p>
                 <button
                  type="button"
                  className="mt-3 quick-action-btn quick-action-btn-sm quick-action-btn-warning"
                  onClick={() => navigate('/customers/register')}
                 >
                  Register Head Office →
                 </button>
                </div>
               ) : (
                <select
                 name="selectedHeadOfficeId"
                 value={formData.selectedHeadOfficeId}
                 onChange={handleInputChange}
                 className="dark-field-input"
                >
                 <option value="" className="text-black">— Select Head Office —</option>
                 {headOffices.map((ho) => (
                  <option key={ho._id} value={ho._id} className="text-black">
                   {ho.businessName} ({ho.customerId})
                  </option>
                 ))}
                </select>
               )}
              </div>
             )}
            </div>
           )}
           <div className="flex flex-wrap gap-2 pt-1">
            <span className="service-booking-chip service-booking-chip-entity">
             {formData.customerType === 'private'
              ? 'Private Customer'
              : formData.businessStructure === 'single'
              ? 'Single Business'
              : formData.businessRole === 'headOffice'
              ? 'Group — Head Office'
              : 'Group — Branch / Franchise'}
            </span>
            {formData.customerType === 'business' &&
             formData.businessStructure === 'group' &&
             formData.businessRole === 'branch' &&
             formData.selectedHeadOfficeId && (
              <span className="service-booking-chip service-booking-chip-prefill">
               HO: {headOffices.find((h) => h._id === formData.selectedHeadOfficeId)?.businessName || '…'}
              </span>
             )}
           </div>
          </section>

          <section className="space-y-4">
           <h2 className="glass-heading-secondary">
            {formData.customerType === 'business' ? 'Company & Contact' : 'Private Contact'}
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.customerType === 'business' && (
             <input
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="Company Name"
              className="dark-field-input"
              required
             />
            )}
            <input
             name="contactPerson"
             value={formData.contactPerson}
             onChange={handleInputChange}
             placeholder="Contact Person"
             className="dark-field-input"
             required
            />
            <input
             type="email"
             name="contactEmail"
             value={formData.contactEmail}
             onChange={handleInputChange}
             placeholder="Contact Email"
             className="dark-field-input"
             required
            />
            <input
             name="contactPhone"
             value={formData.contactPhone}
             onChange={handleInputChange}
             placeholder="Contact Phone"
             className="dark-field-input"
             required
            />
           </div>
           {formData.customerType === 'business' && (
            <input
             name="siteName"
             value={formData.siteName}
             onChange={handleInputChange}
             placeholder="Site Name (Machine Location Name)"
             className="dark-field-input"
             required
            />
           )}
          </section>

          <section className="space-y-4">
           <h2 className="glass-heading-secondary">
            {formData.customerType === 'business'
             ? 'Administrative Address (Billing/Records)'
             : 'Physical Address'}
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="adminStreetAddress" value={formData.adminStreetAddress} onChange={handleInputChange} placeholder="Street Address" className="dark-field-input" required />
            <input name="adminComplexName" value={formData.adminComplexName} onChange={handleInputChange} placeholder="Complex / Industrial Park (Optional)" className="dark-field-input" />
            <input name="adminSiteAddressDetail" value={formData.adminSiteAddressDetail} onChange={handleInputChange} placeholder="Unit / Site Address Detail (Optional)" className="dark-field-input" />
            <input name="adminSuburb" value={formData.adminSuburb} onChange={handleInputChange} placeholder="Suburb" className="dark-field-input" required />
            <input name="adminCityDistrict" value={formData.adminCityDistrict} onChange={handleInputChange} placeholder="City / District" className="dark-field-input" required />
            <input name="adminProvince" value={formData.adminProvince} onChange={handleInputChange} placeholder="Province" className="dark-field-input" required />
            <input name="adminPostalCode" value={formData.adminPostalCode} onChange={handleInputChange} placeholder="Postal / ZIP Code" className="dark-field-input" required />
           </div>
          </section>
         </>
        )}

        {requiresEquipmentDetails && (
         <section className="space-y-4">
          <h2 className="glass-heading-secondary">{equipmentLabel} Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <input
            name="generatorMakeModel"
            value={formData.generatorMakeModel}
            onChange={handleInputChange}
            placeholder={`${equipmentLabel} Make / Brand / Series`}
            className="dark-field-input"
            required
           />
           <input
            name="machineModelNumber"
            value={formData.machineModelNumber}
            onChange={handleInputChange}
            placeholder="Equipment Model Number"
            className="dark-field-input"
            required
           />
           <input
            type="number"
            min="1"
            name="generatorCapacityKva"
            value={formData.generatorCapacityKva}
            onChange={handleInputChange}
            placeholder={capacityLabel}
            className="dark-field-input"
            required
           />
          </div>
         </section>
        )}

        <section className="space-y-4">
         <h2 className="glass-heading-secondary">
          {requiresEquipmentDetails ? 'Technical Machine Location (Dispatch)' : 'Service Location (Dispatch)'}
         </h2>
         {formData.customerType === 'business' ? (
          <>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="machineLocationSameAsAdmin" value={formData.machineLocationSameAsAdmin} onChange={handleInputChange} className="dark-field-input">
             <option value="yes" className="text-black">Dispatch location is the same as administrative address</option>
             <option value="no" className="text-black">Dispatch location is different</option>
            </select>
            <input
             name="machineLocationNotes"
             value={formData.machineLocationNotes}
             onChange={handleInputChange}
             placeholder={requiresEquipmentDetails
              ? 'Machine Position Notes (e.g., Plant Room B, Bay 4, Roof Level 2)'
              : 'Service Location Notes (e.g., kitchen sink line, boundary drain, roof access)'}
             className="dark-field-input"
            />
           </div>
           {formData.machineLocationSameAsAdmin === 'no' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input name="machineStreetAddress" value={formData.machineStreetAddress} onChange={handleInputChange} placeholder="Machine Street Address" className="dark-field-input" required />
             <input name="machineComplexName" value={formData.machineComplexName} onChange={handleInputChange} placeholder="Complex / Industrial Park (Optional)" className="dark-field-input" />
             <input name="machineAddressDetail" value={formData.machineAddressDetail} onChange={handleInputChange} placeholder="Unit / Internal Location Detail (Optional)" className="dark-field-input" />
             <input name="machineSuburb" value={formData.machineSuburb} onChange={handleInputChange} placeholder="Machine Suburb" className="dark-field-input" required />
             <input name="machineCityDistrict" value={formData.machineCityDistrict} onChange={handleInputChange} placeholder="Machine City / District" className="dark-field-input" required />
             <input name="machineProvince" value={formData.machineProvince} onChange={handleInputChange} placeholder="Machine Province" className="dark-field-input" required />
             <input name="machinePostalCode" value={formData.machinePostalCode} onChange={handleInputChange} placeholder="Machine Postal / ZIP Code" className="dark-field-input" required />
            </div>
           )}
          </>
         ) : (
          <>
           <div className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm font-medium text-white/90">Is machine located at residential address?</p>
            <div className="flex flex-wrap gap-6">
             <label className="flex items-center gap-2 text-white/85">
              <input type="radio" name="machineLocationSameAsAdmin" value="yes" checked={formData.machineLocationSameAsAdmin === 'yes'} onChange={handleInputChange} />
              <span>Yes</span>
             </label>
             <label className="flex items-center gap-2 text-white/85">
              <input type="radio" name="machineLocationSameAsAdmin" value="no" checked={formData.machineLocationSameAsAdmin === 'no'} onChange={handleInputChange} />
              <span>No</span>
             </label>
            </div>
           </div>
           {formData.machineLocationSameAsAdmin === 'no' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input name="machineStreetAddress" value={formData.machineStreetAddress} onChange={handleInputChange} placeholder="Machine Street Address" className="dark-field-input" required />
             <input name="machineComplexName" value={formData.machineComplexName} onChange={handleInputChange} placeholder="Complex / Industrial Park (Optional)" className="dark-field-input" />
             <input name="machineAddressDetail" value={formData.machineAddressDetail} onChange={handleInputChange} placeholder="Unit / Site Detail (Optional)" className="dark-field-input" />
             <input name="machineSuburb" value={formData.machineSuburb} onChange={handleInputChange} placeholder="Machine Suburb" className="dark-field-input" required />
             <input name="machineCityDistrict" value={formData.machineCityDistrict} onChange={handleInputChange} placeholder="Machine City / District" className="dark-field-input" required />
             <input name="machineProvince" value={formData.machineProvince} onChange={handleInputChange} placeholder="Machine Province" className="dark-field-input" required />
             <input name="machinePostalCode" value={formData.machinePostalCode} onChange={handleInputChange} placeholder="Machine Postal / ZIP Code" className="dark-field-input" required />
            </div>
           )}
           <input
            name="machineLocationNotes"
            value={formData.machineLocationNotes}
            onChange={handleInputChange}
            placeholder={requiresEquipmentDetails ? 'Machine Location Notes (Optional)' : 'Service Location Notes (Optional)'}
            className="dark-field-input"
           />
          </>
         )}
        </section>

        <section className="space-y-4">
         <h2 className="glass-heading-secondary">Service & Outage Window</h2>
         <div className={`grid grid-cols-1 ${isCustomerPortalBooking ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
          <select name="urgency" value={formData.urgency} onChange={handleInputChange} className="dark-field-input">
           <option value="low" className="text-black">Low</option>
           <option value="medium" className="text-black">Medium</option>
           <option value="high" className="text-black">High</option>
           <option value="urgent" className="text-black">Urgent</option>
          </select>
          {!isCustomerPortalBooking && (
           <select name="serviceHistoryType" value={formData.serviceHistoryType} onChange={handleInputChange} className="dark-field-input">
            <option value="first-service-call" className="text-black">First Service Call</option>
            <option value="existing-customer" className="text-black">Existing Customer</option>
           </select>
          )}
          <select
           name="outageWindowApplicable"
           value={formData.outageWindowApplicable}
           onChange={handleInputChange}
           className="dark-field-input"
          >
           <option value="no" className="text-black">Outage Window Not Applicable</option>
           <option value="yes" className="text-black">Outage Window Applicable</option>
          </select>
         </div>
         <p className="text-xs text-white/70">
          {isCustomerPortalBooking
           ? 'Choose a preferred visit date. Repeat-service selections can pre-fill equipment and site details from your service history.'
           : 'Choose a service history type first. First service calls only need a preferred visit date, while existing customers also require the last serviced date.'}
         </p>
         {formData.outageWindowApplicable === 'yes' ? (
          <>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
             <span className="dark-label">Outage Window Start (required when applicable)</span>
             <input
              type="datetime-local"
              name="outageStart"
              value={formData.outageStart}
              onChange={handleInputChange}
              className="dark-field-input"
              required
             />
            </label>
            <label className="space-y-1">
             <span className="dark-label">Outage Window End (required when applicable)</span>
             <input
              type="datetime-local"
              name="outageEnd"
              value={formData.outageEnd}
              onChange={handleInputChange}
              className="dark-field-input"
              required
             />
            </label>
           </div>
           <p className="text-xs text-white/70">
            Outage window is enabled for this booking, so both start and end are required.
           </p>
          </>
         ) : (
          <p className="text-xs text-white/70">
           Outage window is not applicable for this machine/site booking.
          </p>
         )}

         {isCustomerPortalBooking ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <label className="space-y-1 md:col-span-2">
            <span className="dark-label">Preferred Site Visit Date (required)</span>
            <input
             type="date"
             min={minDate}
             name="dateOfPreferredServiceCall"
             value={formData.dateOfPreferredServiceCall}
             onChange={handleInputChange}
             className="dark-field-input md:w-1/2"
             required
            />
           </label>
           {selectedPastCallId && formData.dateOfLastService && (
            <p className="md:col-span-2 text-xs text-white/70">
             Last service date was pre-filled from your selected service history. You can review it in your service records.
            </p>
           )}
          </div>
         ) : formData.serviceHistoryType === 'first-service-call' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <label className="space-y-1 md:col-span-2">
            <span className="dark-label">Preferred First Site Visit Date (required)</span>
            <input
             type="date"
             min={minDate}
             name="dateOfPreferredServiceCall"
             value={formData.dateOfPreferredServiceCall}
             onChange={handleInputChange}
             className="dark-field-input md:w-1/2"
             required
            />
           </label>
          </div>
         ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <label className="space-y-1">
            <span className="dark-label">Date of Last Service (required for existing customers)</span>
            <input
             type="date"
             name="dateOfLastService"
             value={formData.dateOfLastService}
             onChange={handleInputChange}
             className="dark-field-input"
             required
            />
           </label>
           <label className="space-y-1">
            <span className="dark-label">Preferred Next Service Call Date (required)</span>
            <input
             type="date"
             min={minDate}
             name="dateOfPreferredServiceCall"
             value={formData.dateOfPreferredServiceCall}
             onChange={handleInputChange}
             className="dark-field-input"
             required
            />
           </label>
           <p className="md:col-span-2 text-xs text-white/70">
            {lastServiceAutofillMeta
             ? `Date of Last Service was auto-filled from ${lastServiceAutofillMeta.callNumber}. You can adjust it if needed.`
             : 'Date of Last Service can auto-fill from your previous service records when a matching contact email is found.'}
           </p>
           <textarea name="servicesInProgress" value={formData.servicesInProgress} onChange={handleInputChange} rows="3" placeholder="Services in Progress (required for existing customers)" className="md:col-span-2 dark-field-input" required />
           <select name="progressStatus" value={formData.progressStatus} onChange={handleInputChange} className="dark-field-input" required>
            <option value="N/A" className="text-black">N/A</option>
            <option value="Not Started" className="text-black">Not Started</option>
            <option value="In Progress" className="text-black">In Progress</option>
            <option value="Awaiting Quotation" className="text-black">Awaiting Quotation</option>
            <option value="Awaiting Approval" className="text-black">Awaiting Approval</option>
            <option value="Quoted" className="text-black">Quoted</option>
            <option value="Invoiced" className="text-black">Invoiced</option>
            <option value="Completed" className="text-black">Completed</option>
           </select>
           <input name="quotationHistory" value={formData.quotationHistory} onChange={handleInputChange} placeholder="Quotation History (optional)" className="dark-field-input" />
           <input name="invoicingHistory" value={formData.invoicingHistory} onChange={handleInputChange} placeholder="Invoicing History (optional)" className="dark-field-input" />
          </div>
         )}
        </section>

        <section className="space-y-4">
         <h2 className="glass-heading-secondary">Scheduling</h2>
         <select name="preferredTimeWindow" value={formData.preferredTimeWindow} onChange={handleInputChange} className="dark-field-input md:w-1/2">
          <option value="06:00 - 10:00" className="text-black">06:00 - 10:00</option>
          <option value="08:00 - 12:00" className="text-black">08:00 - 12:00</option>
          <option value="12:00 - 16:00" className="text-black">12:00 - 16:00</option>
          <option value="16:00 - 20:00" className="text-black">16:00 - 20:00</option>
          <option value="20:00 - 23:00" className="text-black">20:00 - 23:00</option>
         </select>
         <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="4" placeholder="Additional notes (access restrictions, standby requirements, risk details, etc.)" className="dark-field-input" />
         <label className="flex items-start gap-3 text-white/85">
          <input type="checkbox" name="confirmAccuracy" checked={formData.confirmAccuracy} onChange={handleInputChange} className="mt-1" />
          <span>I confirm that the information is accurate and authorized for dispatch planning.</span>
         </label>
        </section>

        <div className="service-booking-actions">
         <button type="submit" disabled={isSubmitting} className="service-booking-action service-booking-action-primary disabled:opacity-50">
          {isSubmitting ? 'Submitting...' : 'Book Service Call'}
         </button>
         <button type="button" onClick={() => navigate(isCustomerPortalBooking ? '/customer/services' : '/service-calls')} className="service-booking-action service-booking-action-secondary">
          Cancel
         </button>
         <CreateQuoteModal
          token={user?.token}
          isSuperUser={Boolean(user?.isSuperUser)}
          sourceData={quoteSourceData}
          triggerLabel="Create Quote"
          triggerClassName="service-booking-action service-booking-action-quote"
         />
        </div>
      </form>
     </div>
    </div>
   </div>
  </>
 );
};

export default ServiceCallRegistration;
