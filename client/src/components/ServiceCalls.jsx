import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreateQuoteModal from './CreateQuoteModal';

const RESIDENTIAL_SERVICE_CATEGORIES = [
 { value: 'mechanical', label: 'Mechanical' },
 { value: 'electrical', label: 'Electrical' },
 { value: 'plumbing', label: 'Plumbing' },
 { value: 'propertyMaintenance', label: 'Property Maintenance' },
];

const RESIDENTIAL_SERVICE_TYPE_OPTIONS = {
 mechanical: [
  'Genset Repair',
  'Generator Preventive Maintenance',
  'New Generator Supply and Installation',
  'Fuel System Service',
 ],
 electrical: [
  'Wiring and Rewiring',
  'Power Point Installation',
  'Lighting Installation and Repair',
  'Appliance Electrical Repair',
  'Electrical Fault Finding',
 ],
 plumbing: [
  'Water Reticulation Repair',
  'Pump Repair and Service',
  'Geyser Installation and Repair',
  'Tank Maintenance',
  'Drainage and Blockage Repair',
 ],
 propertyMaintenance: [
  'Shelving Installation',
  'Painting',
  'Curtain Rail Installation',
  'Carpentry and Repairs',
  'General Handyman Work',
 ],
};

const BUSINESS_SERVICE_TASK_CATEGORIES = [
 { value: 'mechanical', label: 'Mechanical' },
 { value: 'electrical', label: 'Electrical' },
 { value: 'plumbing', label: 'Plumbing' },
 { value: 'maintenance', label: 'General Maintenance' },
 { value: 'other', label: 'Other' },
];

const createEmptyServiceTask = () => ({
 category: 'mechanical',
 taskTitle: '',
 estimatedLabourHours: '',
 taskNotes: '',
});

const extractResidentialCategory = (call) => {
 const explicitCategory = call?.bookingRequest?.residentialTemplate?.serviceCategory;
 if (explicitCategory) return explicitCategory;

 const description = String(call?.description || '');
 const match = description.match(/Residential Service Category:\s*(.+)/i);
 if (!match?.[1]) return 'uncategorized';

 const normalized = match[1].trim().toLowerCase();
 if (normalized.includes('mechanical')) return 'mechanical';
 if (normalized.includes('electrical')) return 'electrical';
 if (normalized.includes('plumbing')) return 'plumbing';
 if (normalized.includes('property')) return 'propertyMaintenance';
 return 'uncategorized';
};

const normalizeEquipmentLabelId = (rawValue) => {
 const candidate = String(rawValue || '').trim().toUpperCase();
 // Only allow the expected printed label format to avoid timeline filter pollution.
 return /^EQ-\d{1,12}$/.test(candidate) ? candidate : '';
};

const extractMachineLabelId = (call) => {
 const explicit = normalizeEquipmentLabelId(call?.bookingRequest?.generatorDetails?.equipmentLabelId);
 if (explicit) return explicit;

 const fallback = call?.description?.match(/Machine Label ID:\s*([^\n]+)/i)?.[1];
 if (!fallback) return '';

 return normalizeEquipmentLabelId(fallback);
};

/**
 * Renders the service booking form for generator service calls.
 *
 * @description Allows authenticated users to submit urgent or planned
 * generator service bookings before load shedding windows.
 *
 * @returns {JSX.Element}
 */
const ServiceCalls = () => {
 const navigate = useNavigate();
 const { user } = useAuth();
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
 const [successMessage, setSuccessMessage] = useState('');
 const [serviceCalls, setServiceCalls] = useState([]);
 const [agents, setAgents] = useState([]);
 const [selectedAssignments, setSelectedAssignments] = useState({});
 const [queueActionError, setQueueActionError] = useState('');
 const [queueActionSuccess, setQueueActionSuccess] = useState('');
 const [assigningCallId, setAssigningCallId] = useState('');
 const [lastServiceAutofillMeta, setLastServiceAutofillMeta] = useState(null);
 const [machineLookupId, setMachineLookupId] = useState('');
 const [machineLookupLoading, setMachineLookupLoading] = useState(false);
 const [machineLookupMessage, setMachineLookupMessage] = useState('');
 const [residentialTimelineCategoryFilter, setResidentialTimelineCategoryFilter] = useState('all');
 const [residentialTimelineStatusFilter, setResidentialTimelineStatusFilter] = useState('all');
 const [timelineAssetFilter, setTimelineAssetFilter] = useState('all');

 const [formData, setFormData] = useState({
   customerType: 'business',
  companyName: user?.businessName || '',
  contactPerson: '',
  contactEmail: user?.email || '',
  contactPhone: user?.phoneNumber || '',
    siteName: '',
    adminStreetAddress: user?.physicalAddress || '',
    adminComplexName: '',
    adminSiteAddressDetail: '',
    adminSuburb: '',
    adminCityDistrict: '',
    adminProvince: '',
    adminPostalCode: '',
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
  residentialServiceCategory: 'mechanical',
  mechanicalAssetType: 'generator',
  mechanicalFuelType: '',
  mechanicalRunHours: '',
  electricalWorkType: '',
  electricalLoadNotes: '',
  electricalCoCRequired: 'unknown',
  plumbingSystemType: '',
  plumbingIssueType: '',
  plumbingPressureNotes: '',
  maintenanceTaskType: '',
  maintenanceMaterialsNeeded: '',
    bookingMode: 'standard',
    projectScopeSummary: '',
    serviceTasks: [createEmptyServiceTask()],
  serviceType: 'Preventive Maintenance',
  urgency: 'high',
  serviceHistoryType: 'first-service-call',
  servicesInProgress: '',
  progressStatus: 'N/A',
  quotationHistory: '',
  invoicingHistory: '',
  dateOfLastService: '',
  dateOfPreferredServiceCall: '',
  outageStart: '',
  outageEnd: '',
  preferredTimeWindow: '08:00 - 12:00',
  notes: '',
  confirmAccuracy: false,
  linkedCustomerId: '',
  linkedSiteId: '',
  linkedEquipmentId: '',
  linkedEquipmentLabelId: '',
 });

 const getServiceCallContactEmail = (call) => {
  const bookingEmail = call?.bookingRequest?.contact?.contactEmail;
  if (bookingEmail) return String(bookingEmail).toLowerCase().trim();

  const descriptionEmailMatch = call?.description?.match(/Email:\s*([^\s]+)/i);
  if (descriptionEmailMatch?.[1]) return String(descriptionEmailMatch[1]).toLowerCase().trim();

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
  const latestDate = latestCall.bookingRequest?.dateOfLastService
   || latestCall.completedDate
   || latestCall.scheduledDate
   || latestCall.createdAt;

  if (!latestDate) return null;

  return {
   date: new Date(latestDate).toISOString().slice(0, 10),
   callNumber: latestCall.callNumber || 'Unknown',
  };
 };

 const fetchServiceCalls = async () => {
  try {
   const response = await api.get('/service-calls', {
    headers: {
     Authorization: `Bearer ${user?.token}`,
    },
   });
   setServiceCalls(response.data || []);
  } catch {
   setServiceCalls([]);
  }
 };

 const fetchAgents = async () => {
  try {
   const response = await api.get('/agents/available/list', {
    headers: {
     Authorization: `Bearer ${user?.token}`,
    },
   });
   setAgents(response.data || []);
  } catch {
   try {
    const fallback = await api.get('/agents', {
     headers: {
      Authorization: `Bearer ${user?.token}`,
     },
    });
    setAgents(fallback.data || []);
   } catch {
    setAgents([]);
   }
  }
 };

 useEffect(() => {
  if (!user?.token) return;
  fetchServiceCalls();
  fetchAgents();
 }, [user?.token]);

 const getCustomerLabel = (call) => {
  const bookingContact = call?.bookingRequest?.contact;
  if (bookingContact?.companyName) return bookingContact.companyName;
  if (bookingContact?.contactPerson) return bookingContact.contactPerson;
  if (call?.customer?.businessName) return call.customer.businessName;
  return 'Unlinked customer';
 };

 const unassignedCalls = useMemo(
  () => serviceCalls.filter((call) => !call.assignedAgent),
  [serviceCalls]
 );

 const awaitingAcceptanceCalls = useMemo(
  () => serviceCalls.filter((call) => call.assignedAgent && call.agentAccepted === false),
  [serviceCalls]
 );

 const timelineCandidates = useMemo(() => {
  const normalizedContactEmail = String(formData.contactEmail || '').toLowerCase().trim();
  const normalizedCompanyName = String(formData.companyName || '').toLowerCase().trim();
  const isPrivate = formData.customerType === 'private';

  return serviceCalls
   .filter((call) => call?.bookingRequest?.contact?.customerType === (isPrivate ? 'private' : 'business'))
   .filter((call) => {
    const callEmail = getServiceCallContactEmail(call);
    const callCompany = String(call?.bookingRequest?.contact?.companyName || '').toLowerCase().trim();

    if (normalizedContactEmail && callEmail !== normalizedContactEmail) return false;
    if (!isPrivate && normalizedCompanyName && callCompany && callCompany !== normalizedCompanyName) return false;
    return true;
   })
   .map((call) => ({
    ...call,
    derivedResidentialCategory: extractResidentialCategory(call),
    derivedAssetLabel: extractMachineLabelId(call),
   }));
 }, [formData.companyName, formData.contactEmail, formData.customerType, serviceCalls]);

 const timelineAssetOptions = useMemo(() => {
  const labels = Array.from(new Set(timelineCandidates
   .map((call) => call.derivedAssetLabel)
   .filter(Boolean)))
   .sort();
  return labels;
 }, [timelineCandidates]);

 const residentialTimelineCalls = useMemo(() => timelineCandidates
  .filter((call) => {
   if (formData.customerType === 'private') {
    if (residentialTimelineCategoryFilter === 'all') return true;
    return call.derivedResidentialCategory === residentialTimelineCategoryFilter;
   }
   return true;
  })
  .filter((call) => {
   if (timelineAssetFilter === 'all') return true;
   return call.derivedAssetLabel === timelineAssetFilter;
  })
  .filter((call) => {
   if (residentialTimelineStatusFilter === 'all') return true;
   return String(call.status || '').toLowerCase() === residentialTimelineStatusFilter;
  })
  .sort((a, b) => {
   const dateA = new Date(a.completedDate || a.scheduledDate || a.createdAt || 0).getTime();
   const dateB = new Date(b.completedDate || b.scheduledDate || b.createdAt || 0).getTime();
   return dateB - dateA;
  }), [
   formData.customerType,
   residentialTimelineCategoryFilter,
   residentialTimelineStatusFilter,
   timelineAssetFilter,
   timelineCandidates,
  ]);

 const handleAssignmentSelect = (callId, agentId) => {
  setSelectedAssignments((prev) => ({
   ...prev,
   [callId]: agentId,
  }));
 };

 const assignCallToAgent = async (call) => {
  const selectedAgent = selectedAssignments[call._id];
  if (!selectedAgent) {
   setQueueActionError('Please select a field service agent before assigning the call.');
   setQueueActionSuccess('');
   return;
  }

  setQueueActionError('');
  setQueueActionSuccess('');
  setAssigningCallId(call._id);

  try {
   await api.put(
    `/service-calls/${call._id}`,
    {
     assignedAgent: selectedAgent,
     status: 'assigned',
     agentAccepted: false,
    },
    {
     headers: {
      Authorization: `Bearer ${user?.token}`,
     },
    }
   );

   setQueueActionSuccess(`Service call ${call.callNumber || call._id} assigned and crew alert queued.`);
   await fetchServiceCalls();
   await fetchAgents();
  } catch (error) {
   setQueueActionError(error?.response?.data?.message || 'Failed to assign the service call. Please try again.');
  } finally {
   setAssigningCallId('');
  }
 };

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

 const selectedResidentialServiceTypes = useMemo(() => {
  const category = formData.residentialServiceCategory;
  return RESIDENTIAL_SERVICE_TYPE_OPTIONS[category] || [];
 }, [formData.residentialServiceCategory]);

 const totalMultiTaskLabourHours = useMemo(() => (
  formData.serviceTasks.reduce((total, task) => {
   const parsed = Number(task.estimatedLabourHours);
   if (!Number.isFinite(parsed) || parsed <= 0) return total;
   return total + parsed;
  }, 0)
 ), [formData.serviceTasks]);

 useEffect(() => {
  if (formData.customerType !== 'private') {
   return;
  }

  if (!selectedResidentialServiceTypes.includes(formData.serviceType)) {
   setFormData((prev) => ({
    ...prev,
    serviceType: selectedResidentialServiceTypes[0] || 'General Service',
   }));
  }
 }, [formData.customerType, formData.serviceType, selectedResidentialServiceTypes]);

 /**
  * Updates form state on input changes.
  *
  * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} event
  * @returns {void}
  */
 const handleInputChange = (event) => {
  const { name, value, type, checked } = event.target;
  setFormData((prev) => ({
   ...prev,
   [name]: type === 'checkbox' ? checked : value,
  }));
 };

 const handleServiceTaskChange = (index, field, value) => {
  setFormData((prev) => {
   const updatedTasks = [...prev.serviceTasks];
   updatedTasks[index] = {
    ...updatedTasks[index],
    [field]: value,
   };

   return {
    ...prev,
    serviceTasks: updatedTasks,
   };
  });
 };

 const addServiceTask = () => {
  setFormData((prev) => ({
   ...prev,
   serviceTasks: [...prev.serviceTasks, createEmptyServiceTask()],
  }));
 };

 const removeServiceTask = (index) => {
  setFormData((prev) => {
   if (prev.serviceTasks.length <= 1) {
    return prev;
   }

   return {
    ...prev,
    serviceTasks: prev.serviceTasks.filter((_, itemIndex) => itemIndex !== index),
   };
  });
 };

 const handleMachineLookup = async () => {
  const normalizedLabel = machineLookupId.trim().toUpperCase();

  if (!normalizedLabel) {
   setMachineLookupMessage('Enter a machine label ID (example: EQ-000123).');
   return;
  }

  try {
   setMachineLookupLoading(true);
   setMachineLookupMessage('');

   const equipmentResponse = await api.get(`/equipment/lookup/${encodeURIComponent(normalizedLabel)}`, {
    headers: {
     Authorization: `Bearer ${user?.token}`,
    },
   });

   const equipment = equipmentResponse.data;
   let customerDetails = null;
   let resolvedSiteName = '';
   let resolvedSiteAddress = null;

   if (equipment?.customer?._id) {
    const customerResponse = await api.get(`/customers/${equipment.customer._id}`, {
     headers: {
      Authorization: `Bearer ${user?.token}`,
     },
    });
    customerDetails = customerResponse.data;

    if (equipment?.siteId && Array.isArray(customerDetails?.sites)) {
     const siteMatch = customerDetails.sites.find((site) => String(site._id) === String(equipment.siteId));
     resolvedSiteName = siteMatch?.siteName || '';
     resolvedSiteAddress = siteMatch?.addressDetails || null;
    }
   }

   const machineContact = [
    customerDetails?.contactFirstName || equipment?.customer?.contactFirstName,
    customerDetails?.contactLastName || equipment?.customer?.contactLastName,
   ].filter(Boolean).join(' ');

   setFormData((prev) => ({
    ...prev,
    customerType: 'business',
    companyName: customerDetails?.businessName || equipment?.customer?.businessName || prev.companyName,
    contactPerson: machineContact || prev.contactPerson,
    contactEmail: customerDetails?.email || prev.contactEmail,
    contactPhone: customerDetails?.phoneNumber || prev.contactPhone,
    siteName: resolvedSiteName || prev.siteName,
    adminStreetAddress: resolvedSiteAddress?.streetAddress || prev.adminStreetAddress,
    adminComplexName: resolvedSiteAddress?.complexName || prev.adminComplexName,
    adminSiteAddressDetail: resolvedSiteAddress?.siteAddressDetail || prev.adminSiteAddressDetail,
    adminSuburb: resolvedSiteAddress?.suburb || prev.adminSuburb,
    adminCityDistrict: resolvedSiteAddress?.cityDistrict || prev.adminCityDistrict,
    adminProvince: resolvedSiteAddress?.province || prev.adminProvince,
    adminPostalCode: resolvedSiteAddress?.postalCode || prev.adminPostalCode,
    generatorMakeModel: [equipment?.brand, equipment?.model].filter(Boolean).join(' ') || prev.generatorMakeModel,
    machineModelNumber: equipment?.model || prev.machineModelNumber,
    serviceHistoryType: 'existing-customer',
    dateOfLastService: equipment?.lastServiceDate ? new Date(equipment.lastServiceDate).toISOString().slice(0, 10) : prev.dateOfLastService,
    linkedCustomerId: equipment?.customer?._id || prev.linkedCustomerId,
    linkedSiteId: equipment?.siteId || prev.linkedSiteId,
    linkedEquipmentId: equipment?._id || prev.linkedEquipmentId,
      linkedEquipmentLabelId: normalizeEquipmentLabelId(equipment?.equipmentId) || prev.linkedEquipmentLabelId,
   }));

    setTimelineAssetFilter(normalizeEquipmentLabelId(equipment?.equipmentId) || 'all');

   setMachineLookupMessage(
    `Machine ${equipment?.equipmentId} linked. ${equipment?.serviceHistory?.length || 0} previous service call(s) recorded.`
   );
  } catch (error) {
   setMachineLookupMessage(error?.response?.data?.message || 'Machine label lookup failed.');
  } finally {
   setMachineLookupLoading(false);
  }
 };

 /**
  * Performs client-side form validation.
  *
  * @returns {string|null} Returns validation error message, or null if valid.
  */
 const validateForm = () => {
  if (!formData.contactPerson.trim()) return 'Contact person is required.';
  if (!/^\S+@\S+\.\S+$/.test(formData.contactEmail)) return 'A valid contact email is required.';
  if (!formData.contactPhone.trim()) return 'Contact phone is required.';
   if (formData.customerType === 'business') {
    if (!formData.companyName.trim()) return 'Company name is required.';
    if (!formData.siteName.trim()) return 'Site name is required.';
   }
  if (formData.machineLocationSameAsAdmin === 'no') {
   if (!formData.machineStreetAddress.trim()) return 'Machine location street address is required.';
   if (!formData.machineSuburb.trim()) return 'Machine location suburb is required.';
   if (!formData.machineCityDistrict.trim()) return 'Machine location city/district is required.';
   if (!formData.machineProvince.trim()) return 'Machine location province is required.';
   if (!formData.machinePostalCode.trim()) return 'Machine location postal code is required.';
  }
  if (!formData.adminStreetAddress.trim()) return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} street address is required.`;
  if (!formData.adminSuburb.trim()) return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} suburb is required.`;
  if (!formData.adminCityDistrict.trim()) return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} city/district is required.`;
  if (!formData.adminProvince.trim()) return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} province is required.`;
  if (!formData.adminPostalCode.trim()) return `${formData.customerType === 'business' ? 'Administrative' : 'Physical'} postal code is required.`;
    if (formData.customerType === 'business') {
     if (!formData.generatorMakeModel.trim()) return 'Generator make/model is required.';
     if (!formData.machineModelNumber.trim()) return 'Machine model number is required.';
     if (!formData.generatorCapacityKva || Number(formData.generatorCapacityKva) <= 0) {
      return 'Generator capacity must be greater than 0.';
     }

      if (formData.bookingMode === 'project' && !formData.projectScopeSummary.trim()) {
       return 'Project scope summary is required for project-based visits.';
      }

      if (formData.bookingMode === 'multi-task') {
       if (!Array.isArray(formData.serviceTasks) || formData.serviceTasks.length < 2) {
        return 'Multi-task visits require at least two task lines.';
       }

       for (let i = 0; i < formData.serviceTasks.length; i += 1) {
        const task = formData.serviceTasks[i];
        if (!task.taskTitle?.trim()) {
         return `Task ${i + 1} title is required.`;
        }

        const labourHours = Number(task.estimatedLabourHours);
        if (!Number.isFinite(labourHours) || labourHours <= 0) {
         return `Task ${i + 1} estimated labour hours must be greater than 0.`;
        }
       }
      }
    }
    if (formData.customerType === 'private') {
     if (!formData.residentialServiceCategory) return 'Service category is required.';
     if (!formData.serviceType) return 'Service type is required.';

     if (formData.residentialServiceCategory === 'mechanical') {
      if (!formData.generatorMakeModel.trim()) return 'Mechanical work requires asset make/model.';
      if (!formData.machineModelNumber.trim()) return 'Mechanical work requires model number.';
     }

     if (formData.residentialServiceCategory === 'electrical' && !formData.electricalWorkType.trim()) {
      return 'Electrical work type is required.';
     }

     if (formData.residentialServiceCategory === 'plumbing' && !formData.plumbingIssueType.trim()) {
      return 'Plumbing issue type is required.';
     }

     if (formData.residentialServiceCategory === 'propertyMaintenance' && !formData.maintenanceTaskType.trim()) {
      return 'Property maintenance task type is required.';
     }
    }
  if (formData.serviceHistoryType === 'first-service-call' && !formData.dateOfPreferredServiceCall) {
   return 'Preferred site visit date is required.';
  }
  if (formData.serviceHistoryType === 'existing-customer') {
   if (!formData.dateOfLastService) return 'Date of last service is required for existing customers.';
    if (!formData.servicesInProgress.trim()) return 'Services in progress is required for existing customers.';
    if (!formData.progressStatus.trim()) return 'Progress status is required for existing customers.';
   if (!formData.dateOfPreferredServiceCall) return 'Preferred service call date is required.';
  }
  if (!formData.outageStart || !formData.outageEnd) return 'Outage window is required.';
  if (new Date(formData.outageStart) >= new Date(formData.outageEnd)) {
   return 'Outage end time must be after outage start time.';
  }
  if (!formData.confirmAccuracy) return 'Please confirm the information is accurate.';
  return null;
 };

 /**
  * Formats segmented address fields for readable dispatch notes.
  *
  * @param {string} prefix - Field name prefix (admin|machine)
  * @returns {string}
  */
 const formatAddress = (prefix) => {
  const street = formData[`${prefix}StreetAddress`]?.trim();
  const complex = formData[`${prefix}ComplexName`]?.trim();
  const detail = formData[`${prefix}AddressDetail`]?.trim() || formData[`${prefix}SiteAddressDetail`]?.trim();
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
  ].filter(Boolean).join(', ');
 };

 /**
  * Builds a backend-safe service call payload.
  *
  * @returns {{title: string, description: string, priority: string, serviceType: string, scheduledDate: string, serviceLocation: string, bookingRequest: object}}
  */
 const buildPayload = () => {
   const isBusiness = formData.customerType === 'business';
   const categoryLabel = RESIDENTIAL_SERVICE_CATEGORIES.find((item) => item.value === formData.residentialServiceCategory)?.label || 'General';
    const administrativeAddress = {
     streetAddress: formData.adminStreetAddress,
     complexName: formData.adminComplexName,
     siteAddressDetail: formData.adminSiteAddressDetail,
     suburb: formData.adminSuburb,
     cityDistrict: formData.adminCityDistrict,
     province: formData.adminProvince,
     postalCode: formData.adminPostalCode,
    };
    const machineAddress = formData.machineLocationSameAsAdmin === 'yes'
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
    const resolvedServiceLocation = formData.machineLocationSameAsAdmin === 'yes'
     ? formatAddress('admin')
     : formatAddress('machine');
   const title = isBusiness
    ? `${formData.serviceType} - ${formData.companyName} (${formData.siteName})`
    : `${formData.serviceType} - Residential (${formData.contactPerson})`;

   const bookingModeLabels = {
    standard: 'Standard Call-Out',
    'multi-task': 'Multi-Task Visit',
    project: 'Project-Based Visit',
   };

   const normalizedServiceTasks = formData.serviceTasks
    .filter((task) => task.taskTitle?.trim())
    .map((task) => ({
     category: task.category,
     taskTitle: task.taskTitle.trim(),
     estimatedLabourHours: Number(task.estimatedLabourHours) || 0,
     taskNotes: task.taskNotes?.trim() || '',
    }));

   const multiTaskSummaryLines = formData.bookingMode === 'multi-task'
    ? normalizedServiceTasks.map((task, index) => {
      const taskCategory = BUSINESS_SERVICE_TASK_CATEGORIES.find((item) => item.value === task.category)?.label || task.category;
      return `Task ${index + 1}: ${taskCategory} | ${task.taskTitle} | Labour Hours: ${task.estimatedLabourHours}${task.taskNotes ? ` | Notes: ${task.taskNotes}` : ''}`;
     })
    : [];

     const residentialTemplateLines = [
    `Residential Service Category: ${categoryLabel}`,
    formData.residentialServiceCategory === 'mechanical' ? `Mechanical Asset Type: ${formData.mechanicalAssetType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'mechanical' ? `Fuel Type: ${formData.mechanicalFuelType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'mechanical' ? `Run Hours: ${formData.mechanicalRunHours || 'N/A'}` : null,
    formData.residentialServiceCategory === 'electrical' ? `Electrical Work Type: ${formData.electricalWorkType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'electrical' ? `Load Balancing / Wiring Notes: ${formData.electricalLoadNotes || 'N/A'}` : null,
    formData.residentialServiceCategory === 'electrical' ? `CoC Requirement: ${formData.electricalCoCRequired}` : null,
    formData.residentialServiceCategory === 'plumbing' ? `Plumbing System Type: ${formData.plumbingSystemType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'plumbing' ? `Plumbing Issue Type: ${formData.plumbingIssueType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'plumbing' ? `Pressure / Flow Notes: ${formData.plumbingPressureNotes || 'N/A'}` : null,
    formData.residentialServiceCategory === 'propertyMaintenance' ? `Maintenance Task Type: ${formData.maintenanceTaskType || 'N/A'}` : null,
    formData.residentialServiceCategory === 'propertyMaintenance' ? `Materials / Access Notes: ${formData.maintenanceMaterialsNeeded || 'N/A'}` : null,
     ].filter(Boolean);

   const description = isBusiness
    ? [
       `Customer Type: Business`,
       `Company: ${formData.companyName}`,
       `Contact: ${formData.contactPerson}`,
       `Email: ${formData.contactEmail}`,
       `Phone: ${formData.contactPhone}`,
       `Site Name: ${formData.siteName}`,
       `Administrative Address: ${formatAddress('admin')}`,
       `Machine Location Same As Administrative Address: ${formData.machineLocationSameAsAdmin === 'yes' ? 'Yes' : 'No'}`,
       `Machine Technical Address: ${formData.machineLocationSameAsAdmin === 'yes' ? formatAddress('admin') : formatAddress('machine')}`,
       `Machine Location Notes: ${formData.machineLocationNotes || 'None'}`,
       `Generator: ${formData.generatorMakeModel}`,
       `Machine Model Number: ${formData.machineModelNumber}`,
      `Machine Label ID: ${formData.linkedEquipmentLabelId || 'Not linked'}`,
       `Capacity (kVA): ${formData.generatorCapacityKva}`,
      `Visit Mode: ${bookingModeLabels[formData.bookingMode] || formData.bookingMode}`,
      ...(formData.bookingMode === 'project'
       ? [`Project Scope Summary: ${formData.projectScopeSummary || 'N/A'}`]
       : []),
      ...(formData.bookingMode === 'multi-task'
       ? [
         'Travel Billing Rule: Single travel charge for the consolidated visit',
         ...multiTaskSummaryLines,
         `Total Estimated Labour Hours: ${totalMultiTaskLabourHours || 0}`,
        ]
       : []),
      `Service History Type: ${formData.serviceHistoryType === 'existing-customer' ? 'Existing Customer' : 'First Service Call'}`,
      `Date of Last Service: ${formData.dateOfLastService || 'N/A'}`,
      `Services in Progress: ${formData.servicesInProgress || 'N/A'}`,
      `Progress Status: ${formData.progressStatus || 'N/A'}`,
      `Quotation History: ${formData.quotationHistory || 'N/A'}`,
      `Invoicing History: ${formData.invoicingHistory || 'N/A'}`,
      `Preferred Service Call Date: ${formData.dateOfPreferredServiceCall}`,
       `Service Type: ${formData.serviceType}`,
       `Urgency: ${formData.urgency}`,
       `Load Shedding Window: ${new Date(formData.outageStart).toLocaleString()} -> ${new Date(formData.outageEnd).toLocaleString()}`,
      `Preferred Date: ${formData.dateOfPreferredServiceCall}`,
       `Preferred Time Window: ${formData.preferredTimeWindow}`,
       `Notes: ${formData.notes || 'None'}`,
      ].join('\n')
    : [
       `Customer Type: Private`,
       `Contact: ${formData.contactPerson}`,
       `Email: ${formData.contactEmail}`,
       `Phone: ${formData.contactPhone}`,
       `Residential Address: ${formatAddress('admin')}`,
       `Machine Located At Residential Address: ${formData.machineLocationSameAsAdmin === 'yes' ? 'Yes' : 'No'}`,
       `Machine Address: ${formData.machineLocationSameAsAdmin === 'yes' ? formatAddress('admin') : formatAddress('machine')}`,
       `Machine Location Notes: ${formData.machineLocationNotes || 'None'}`,
       `Generator: ${formData.generatorMakeModel}`,
       `Machine Model Number: ${formData.machineModelNumber}`,
      `Machine Label ID: ${formData.linkedEquipmentLabelId || 'Not linked'}`,
       `Capacity (kVA): ${formData.generatorCapacityKva}`,
      ...residentialTemplateLines,
      `Service History Type: ${formData.serviceHistoryType === 'existing-customer' ? 'Existing Customer' : 'First Service Call'}`,
      `Date of Last Service: ${formData.dateOfLastService || 'N/A'}`,
      `Services in Progress: ${formData.servicesInProgress || 'N/A'}`,
      `Progress Status: ${formData.progressStatus || 'N/A'}`,
      `Quotation History: ${formData.quotationHistory || 'N/A'}`,
      `Invoicing History: ${formData.invoicingHistory || 'N/A'}`,
      `Preferred Service Call Date: ${formData.dateOfPreferredServiceCall}`,
       `Service Type: ${formData.serviceType}`,
       `Urgency: ${formData.urgency}`,
       `Load Shedding Window: ${new Date(formData.outageStart).toLocaleString()} -> ${new Date(formData.outageEnd).toLocaleString()}`,
      `Preferred Date: ${formData.dateOfPreferredServiceCall}`,
       `Preferred Time Window: ${formData.preferredTimeWindow}`,
       `Notes: ${formData.notes || 'None'}`,
      ].join('\n');

  return {
    customer: formData.linkedCustomerId || undefined,
    siteId: formData.linkedSiteId || undefined,
    equipment: formData.linkedEquipmentId || undefined,
   title,
   description,
   priority: formData.urgency,
   serviceType: formData.serviceType,
  scheduledDate: new Date(formData.dateOfPreferredServiceCall).toISOString(),
  serviceLocation: resolvedServiceLocation,
   bookingRequest: {
    contact: {
     customerType: formData.customerType,
     companyName: isBusiness ? formData.companyName : '',
     contactPerson: formData.contactPerson,
     contactEmail: formData.contactEmail,
     contactPhone: formData.contactPhone,
    },
    administrativeAddress,
    machineAddress,
    generatorDetails: {
      siteName: isBusiness ? formData.siteName : '',
      generatorMakeModel: formData.generatorMakeModel,
      machineModelNumber: formData.machineModelNumber,
      equipmentLabelId: normalizeEquipmentLabelId(formData.linkedEquipmentLabelId),
      generatorCapacityKva: Number(formData.generatorCapacityKva),
      machineLocationSameAsAdmin: formData.machineLocationSameAsAdmin === 'yes',
      machineLocationNotes: formData.machineLocationNotes,
    },
    bookingMode: formData.bookingMode,
    projectScopeSummary: formData.projectScopeSummary,
    serviceTasks: formData.bookingMode === 'multi-task' ? normalizedServiceTasks : [],
    estimatedMultiTaskLabourHours: formData.bookingMode === 'multi-task' ? totalMultiTaskLabourHours : 0,
    travelChargePolicy: formData.bookingMode === 'multi-task' ? 'single-trip' : 'standard',
    outageWindow: {
      start: new Date(formData.outageStart).toISOString(),
      end: new Date(formData.outageEnd).toISOString(),
    },
    preferredDate: new Date(formData.dateOfPreferredServiceCall).toISOString(),
    dateOfLastService: formData.dateOfLastService ? new Date(formData.dateOfLastService).toISOString() : null,
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

 /**
  * Submits the booking request.
  *
  * @param {React.FormEvent<HTMLFormElement>} event
  * @returns {Promise<void>}
  */
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

   const payload = buildPayload();

   await api.post('/service-calls', payload, {
    headers: {
     Authorization: `Bearer ${user?.token}`,
    },
   });

   setSuccessMessage('Service booking submitted successfully. Our operations team will contact you shortly.');
   setTimeout(() => navigate('/profile'), 1200);
  } catch (error) {
   setErrorMessage(error?.response?.data?.message || 'Unable to submit booking. Please try again.');
  } finally {
   setIsSubmitting(false);
  }
 };

 const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

 const quoteSourceData = useMemo(() => ({
  serviceType: formData.serviceType,
  machineModelNumber: formData.machineModelNumber,
  generatorMakeModel: formData.generatorMakeModel,
  title: `${formData.serviceType} Quotation`,
  description: [
   `Customer Type: ${formData.customerType}`,
   `Contact Person: ${formData.contactPerson || 'N/A'}`,
   `Generator: ${formData.generatorMakeModel || 'N/A'}`,
   `Machine Model Number: ${formData.machineModelNumber || 'N/A'}`,
   `Capacity (kVA): ${formData.generatorCapacityKva || 'N/A'}`,
  ].join('\n'),
  notes: formData.notes,
  lineItems: [
   {
  description: formData.serviceType || 'Service Work',
  quantity: 1,
  unitPrice: 0,
   },
  ],
 }), [
  formData.serviceType,
  formData.machineModelNumber,
  formData.generatorMakeModel,
  formData.customerType,
  formData.contactPerson,
  formData.generatorMakeModel,
  formData.machineModelNumber,
  formData.generatorCapacityKva,
  formData.notes,
 ]);

 if (!user) return null;

 return (
  <>
   <Sidebar />
   <div className="glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-[1000px] mx-auto">
   <div className="glass-card rounded-2xl shadow-xl overflow-hidden">
    <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 backdrop-blur-md border-b border-white/20 px-8 py-6">
     <h1 className="glass-heading text-3xl">Book Generator Service</h1>
     <p className="text-white/70 mt-2">
    Secure service support before the next load shedding cycle.
     </p>
     <div className="mt-3 flex flex-wrap gap-2">
    <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
     Entity: Service Calls
    </span>
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
     isSuperAdmin
      ? 'border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-200'
      : 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
    }`}>
     Role: {roleLabel}
    </span>
     </div>
    </div>

    <form onSubmit={handleSubmit} className="p-8 space-y-8">
     <section className="space-y-4 rounded-xl border border-yellow-300/30 bg-yellow-500/10 p-5">
    <h2 className="glass-heading-secondary">Operations Alerts & Assignment Queue</h2>
    <p className="text-white/80 text-sm">
     SuperUser operations view: monitor incoming service calls, assign them to available field service agents, and queue assignment alerts for crew follow-up.
    </p>

    {queueActionError ? (
     <div className="rounded-lg px-4 py-3 border border-red-300/40 bg-red-500/20 text-white text-sm">
      {queueActionError}
     </div>
    ) : null}

    {queueActionSuccess ? (
     <div className="rounded-lg px-4 py-3 border border-emerald-300/40 bg-emerald-500/20 text-white text-sm">
      {queueActionSuccess}
     </div>
    ) : null}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     <div className="rounded-lg border border-white/20 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/70">Unassigned Calls</p>
      <p className="text-2xl font-bold text-yellow-200 mt-1">{unassignedCalls.length}</p>
      <p className="text-white/70 text-xs mt-2">Needs superUser assignment</p>
     </div>
     <div className="rounded-lg border border-white/20 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/70">Awaiting Agent Acceptance</p>
      <p className="text-2xl font-bold text-blue-200 mt-1">{awaitingAcceptanceCalls.length}</p>
      <p className="text-white/70 text-xs mt-2">Assigned and pending field agent action</p>
     </div>
    </div>

    {unassignedCalls.length === 0 ? (
     <p className="text-sm text-white/75">No unassigned calls right now.</p>
    ) : (
     <div className="space-y-3">
      {unassignedCalls.slice(0, 8).map((call) => (
       <div key={call._id} className="rounded-lg border border-white/20 bg-white/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
       <div>
        <p className="text-white font-semibold">{call.title || 'Untitled Service Call'}</p>
        <p className="text-xs text-white/70 mt-1">
         {call.callNumber || call._id} · {getCustomerLabel(call)} · Priority: {call.priority || 'medium'}
        </p>
       </div>
       <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <select
         value={selectedAssignments[call._id] || ''}
         onChange={(event) => handleAssignmentSelect(call._id, event.target.value)}
         className="w-full sm:w-[280px] rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
        >
         <option value="" className="text-black">Select field service agent</option>
         {agents.map((agent) => (
        <option key={agent._id} value={agent._id} className="text-black">
         {agent.firstName} {agent.lastName} ({agent.employeeId})
        </option>
         ))}
        </select>
        <button
         type="button"
         onClick={() => assignCallToAgent(call)}
         disabled={assigningCallId === call._id}
         className="glass-btn-primary px-4 py-2 font-semibold disabled:opacity-50"
        >
         {assigningCallId === call._id ? 'Assigning...' : 'Assign'}
        </button>
       </div>
      </div>
       </div>
      ))}
     </div>
    )}
     </section>

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

     <section className="space-y-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
     <div>
      <h2 className="glass-heading-secondary">
       {formData.customerType === 'private' ? 'Residential Service Timeline' : 'Business Service Timeline'}
      </h2>
      <p className="text-sm text-white/75">
       Chronological service history with optional filters for status and machine label.
      </p>
     </div>
     <div className={`grid grid-cols-1 gap-2 ${formData.customerType === 'private' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      {formData.customerType === 'private' ? (
       <select
      value={residentialTimelineCategoryFilter}
      onChange={(event) => setResidentialTimelineCategoryFilter(event.target.value)}
      className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
       >
      <option value="all" className="text-black">All Categories</option>
      <option value="mechanical" className="text-black">Mechanical</option>
      <option value="electrical" className="text-black">Electrical</option>
      <option value="plumbing" className="text-black">Plumbing</option>
      <option value="propertyMaintenance" className="text-black">Property Maintenance</option>
      <option value="uncategorized" className="text-black">Uncategorized</option>
       </select>
      ) : null}

      <select
       value={timelineAssetFilter}
       onChange={(event) => setTimelineAssetFilter(event.target.value)}
       className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
      >
       <option value="all" className="text-black">All Assets</option>
       {timelineAssetOptions.map((assetLabel) => (
      <option key={assetLabel} value={assetLabel} className="text-black">{assetLabel}</option>
       ))}
      </select>

      <select
       value={residentialTimelineStatusFilter}
       onChange={(event) => setResidentialTimelineStatusFilter(event.target.value)}
       className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
      >
       <option value="all" className="text-black">All Statuses</option>
       <option value="pending" className="text-black">Pending</option>
       <option value="scheduled" className="text-black">Scheduled</option>
       <option value="assigned" className="text-black">Assigned</option>
       <option value="in-progress" className="text-black">In Progress</option>
       <option value="completed" className="text-black">Completed</option>
       <option value="invoiced" className="text-black">Invoiced</option>
       <option value="cancelled" className="text-black">Cancelled</option>
      </select>
     </div>
    </div>

    {residentialTimelineCalls.length === 0 ? (
     <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/75">
      No service history matches the current filters yet.
     </div>
    ) : (
     <div className="space-y-3">
      {residentialTimelineCalls.slice(0, 12).map((call) => {
       const effectiveDate = call.completedDate || call.scheduledDate || call.createdAt;
       return (
      <div key={call._id} className="rounded-lg border border-white/20 bg-white/5 p-4">
       <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
         <p className="text-white font-semibold">{call.title || 'Service Call'}</p>
         <p className="text-xs text-white/65 mt-1">{call.callNumber || call._id}</p>
        </div>
        <div className="text-xs text-white/75 md:text-right">
         {formData.customerType === 'private' ? <p>Category: {call.derivedResidentialCategory}</p> : null}
         <p>Status: {call.status || 'pending'}</p>
         <p>Asset: {call.derivedAssetLabel || 'Unlinked'}</p>
        </div>
       </div>
       <p className="text-xs text-white/60 mt-2">
        {effectiveDate ? new Date(effectiveDate).toLocaleString() : 'Date unavailable'}
       </p>
       {call.serviceType ? (
        <p className="text-sm text-white/80 mt-2">Service Type: {call.serviceType}</p>
       ) : null}
       {call.serviceLocation ? (
        <p className="text-sm text-white/70 mt-1">Location: {call.serviceLocation}</p>
       ) : null}
      </div>
       );
      })}
     </div>
    )}
     </section>

      <section className="space-y-4">
       <h2 className="glass-heading-secondary">Customer Type</h2>
       <select
        name="customerType"
        value={formData.customerType}
        onChange={handleInputChange}
        className="w-full md:w-1/2 rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
       >
        <option value="business" className="text-black">Business</option>
        <option value="private" className="text-black">Private</option>
       </select>
      </section>

       <section className="space-y-4">
       <h2 className="glass-heading-secondary">
        {formData.customerType === 'business' ? 'Company & Contact' : 'Private Contact'}
       </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formData.customerType === 'business' && (
         <input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Company Name" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
        )}
         <input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} placeholder="Contact Person" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} placeholder="Contact Email" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="Contact Phone" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
        </div>
      {formData.customerType === 'business' ? (
        <input name="siteName" value={formData.siteName} onChange={handleInputChange} placeholder="Site Name (Machine Location Name)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
      ) : null}

        {formData.customerType === 'private' ? (
         <div className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Residential Service Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <select
            name="residentialServiceCategory"
            value={formData.residentialServiceCategory}
            onChange={handleInputChange}
            className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           >
            {RESIDENTIAL_SERVICE_CATEGORIES.map((option) => (
             <option key={option.value} value={option.value} className="text-black">{option.label}</option>
            ))}
           </select>
           <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
            {selectedResidentialServiceTypes.map((option) => (
             <option key={option} value={option} className="text-black">{option}</option>
            ))}
           </select>
          </div>

          {formData.residentialServiceCategory === 'mechanical' ? (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select name="mechanicalAssetType" value={formData.mechanicalAssetType} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
             <option value="generator" className="text-black">Generator</option>
             <option value="appliance" className="text-black">Appliance</option>
             <option value="other" className="text-black">Other Mechanical Asset</option>
            </select>
            <input name="mechanicalFuelType" value={formData.mechanicalFuelType} onChange={handleInputChange} placeholder="Fuel Type (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
            <input type="number" min="0" name="mechanicalRunHours" value={formData.mechanicalRunHours} onChange={handleInputChange} placeholder="Run Hours (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
           </div>
          ) : null}

          {formData.residentialServiceCategory === 'electrical' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="electricalWorkType" value={formData.electricalWorkType} onChange={handleInputChange} placeholder="Electrical Work Type *" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
            <select name="electricalCoCRequired" value={formData.electricalCoCRequired} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
             <option value="unknown" className="text-black">CoC Requirement Unknown</option>
             <option value="required" className="text-black">CoC Required</option>
             <option value="not-required" className="text-black">CoC Not Required</option>
            </select>
            <textarea name="electricalLoadNotes" value={formData.electricalLoadNotes} onChange={handleInputChange} rows="3" placeholder="Load balancing / existing wiring notes" className="md:col-span-2 w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
           </div>
          ) : null}

          {formData.residentialServiceCategory === 'plumbing' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="plumbingSystemType" value={formData.plumbingSystemType} onChange={handleInputChange} placeholder="System Type (Pump, Geyser, Tank, Drainage)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
            <input name="plumbingIssueType" value={formData.plumbingIssueType} onChange={handleInputChange} placeholder="Issue Type *" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
            <textarea name="plumbingPressureNotes" value={formData.plumbingPressureNotes} onChange={handleInputChange} rows="3" placeholder="Pressure / flow / leakage notes" className="md:col-span-2 w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
           </div>
          ) : null}

          {formData.residentialServiceCategory === 'propertyMaintenance' ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="maintenanceTaskType" value={formData.maintenanceTaskType} onChange={handleInputChange} placeholder="Task Type *" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
            <textarea name="maintenanceMaterialsNeeded" value={formData.maintenanceMaterialsNeeded} onChange={handleInputChange} rows="3" placeholder="Materials / access notes" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
           </div>
          ) : null}
         </div>
        ) : null}
             </section>

           <section className="space-y-4">
      <h2 className="glass-heading-secondary">
       {formData.customerType === 'business' ? 'Administrative Address (Billing/Records)' : 'Physical Address'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <input name="adminStreetAddress" value={formData.adminStreetAddress} onChange={handleInputChange} placeholder="Street Address" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
       <input name="adminComplexName" value={formData.adminComplexName} onChange={handleInputChange} placeholder="Complex / Industrial Park (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
       <input name="adminSiteAddressDetail" value={formData.adminSiteAddressDetail} onChange={handleInputChange} placeholder="Unit / Site Address Detail (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
       <input name="adminSuburb" value={formData.adminSuburb} onChange={handleInputChange} placeholder="Suburb" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
       <input name="adminCityDistrict" value={formData.adminCityDistrict} onChange={handleInputChange} placeholder="City / District" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
       <input name="adminProvince" value={formData.adminProvince} onChange={handleInputChange} placeholder="Province" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
       <input name="adminPostalCode" value={formData.adminPostalCode} onChange={handleInputChange} placeholder="Postal / ZIP Code" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
      </div>
           </section>

       <section className="space-y-4">
        <h2 className="glass-heading-secondary">Generator Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="md:col-span-2 rounded-lg border border-cyan-300/30 bg-cyan-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-200 mb-2">Machine Label Lookup</p>
            <div className="flex flex-col gap-2 md:flex-row">
             <input
              value={machineLookupId}
              onChange={(event) => setMachineLookupId(event.target.value)}
              placeholder="Scan or enter label ID (e.g., EQ-000123)"
              className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
             />
             <button
              type="button"
              onClick={handleMachineLookup}
              disabled={machineLookupLoading}
              className="glass-btn-primary px-4 py-3 whitespace-nowrap disabled:opacity-50"
             >
              {machineLookupLoading ? 'Looking up...' : 'Lookup Machine'}
             </button>
            </div>
            {machineLookupMessage ? (
             <p className="mt-2 text-sm text-cyan-100">{machineLookupMessage}</p>
            ) : null}
            {formData.linkedEquipmentLabelId ? (
             <p className="mt-2 text-xs text-white/70">
              Linked Machine ID: {formData.linkedEquipmentLabelId}
             </p>
            ) : null}
           </div>

         <input
          name="generatorMakeModel"
          value={formData.generatorMakeModel}
          onChange={handleInputChange}
          placeholder="Generator / Asset Make and Model"
          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          required={formData.customerType === 'business' || formData.residentialServiceCategory === 'mechanical'}
         />
         <input
          name="machineModelNumber"
          value={formData.machineModelNumber}
          onChange={handleInputChange}
          placeholder="Machine Model Number"
          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          required={formData.customerType === 'business' || formData.residentialServiceCategory === 'mechanical'}
         />
         <input
          type="number"
          min="0"
          name="generatorCapacityKva"
          value={formData.generatorCapacityKva}
          onChange={handleInputChange}
          placeholder="Capacity (kVA)"
          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          required={formData.customerType === 'business'}
         />
        </div>
       </section>

            <section className="space-y-4">
             <h2 className="glass-heading-secondary">Technical Machine Location (Dispatch)</h2>
             {formData.customerType === 'business' ? (
              <>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="machineLocationSameAsAdmin" value={formData.machineLocationSameAsAdmin} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
                 <option value="yes" className="text-black">Machine location is the same as administrative address</option>
                 <option value="no" className="text-black">Machine location is different</option>
                </select>
                <input
                 name="machineLocationNotes"
                 value={formData.machineLocationNotes}
                 onChange={handleInputChange}
                 placeholder="Machine Position Notes (e.g., Plant Room B, Bay 4, Roof Level 2)"
                 className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
                />
               </div>

               {formData.machineLocationSameAsAdmin === 'no' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <input name="machineStreetAddress" value={formData.machineStreetAddress} onChange={handleInputChange} placeholder="Machine Street Address" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineComplexName" value={formData.machineComplexName} onChange={handleInputChange} placeholder="Machine Complex / Industrial Park (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                 <input name="machineAddressDetail" value={formData.machineAddressDetail} onChange={handleInputChange} placeholder="Machine Unit / Internal Location Detail (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                 <input name="machineSuburb" value={formData.machineSuburb} onChange={handleInputChange} placeholder="Machine Suburb" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineCityDistrict" value={formData.machineCityDistrict} onChange={handleInputChange} placeholder="Machine City / District" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineProvince" value={formData.machineProvince} onChange={handleInputChange} placeholder="Machine Province" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machinePostalCode" value={formData.machinePostalCode} onChange={handleInputChange} placeholder="Machine Postal / ZIP Code" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                </div>
               )}
              </>
             ) : (
              <>
               <div className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-sm font-medium text-white/90">Is machine located at residential address?</p>
                <div className="flex flex-wrap gap-6">
                 <label className="flex items-center gap-2 text-white/85">
                  <input
                   type="radio"
                   name="machineLocationSameAsAdmin"
                   value="yes"
                   checked={formData.machineLocationSameAsAdmin === 'yes'}
                   onChange={handleInputChange}
                  />
                  <span>Yes</span>
                 </label>
                 <label className="flex items-center gap-2 text-white/85">
                  <input
                   type="radio"
                   name="machineLocationSameAsAdmin"
                   value="no"
                   checked={formData.machineLocationSameAsAdmin === 'no'}
                   onChange={handleInputChange}
                  />
                  <span>No</span>
                 </label>
                </div>
               </div>

               {formData.machineLocationSameAsAdmin === 'no' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <input name="machineStreetAddress" value={formData.machineStreetAddress} onChange={handleInputChange} placeholder="Machine Street Address" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineComplexName" value={formData.machineComplexName} onChange={handleInputChange} placeholder="Machine Complex / Industrial Park (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                 <input name="machineAddressDetail" value={formData.machineAddressDetail} onChange={handleInputChange} placeholder="Machine Unit / Site Detail (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
                 <input name="machineSuburb" value={formData.machineSuburb} onChange={handleInputChange} placeholder="Machine Suburb" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineCityDistrict" value={formData.machineCityDistrict} onChange={handleInputChange} placeholder="Machine City / District" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machineProvince" value={formData.machineProvince} onChange={handleInputChange} placeholder="Machine Province" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                 <input name="machinePostalCode" value={formData.machinePostalCode} onChange={handleInputChange} placeholder="Machine Postal / ZIP Code" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
                </div>
               )}

               <input
                name="machineLocationNotes"
                value={formData.machineLocationNotes}
                onChange={handleInputChange}
                placeholder="Machine Location Notes (Optional)"
                className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
               />
              </>
             )}
            </section>

       <section className="space-y-4">
        <h2 className="glass-heading-secondary">Service & Outage Window</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {formData.customerType === 'business' ? (
            <select name="bookingMode" value={formData.bookingMode} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
             <option value="standard" className="text-black">Standard Call-Out</option>
             <option value="multi-task" className="text-black">Multi-Task Visit (Single Travel Charge)</option>
             <option value="project" className="text-black">Project-Based Visit</option>
            </select>
             ) : null}

           {formData.customerType === 'business' ? (
            <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
             <option value="Preventive Maintenance" className="text-black">Preventive Maintenance</option>
             <option value="Emergency Repair" className="text-black">Emergency Repair</option>
             <option value="Load Bank Testing" className="text-black">Load Bank Testing</option>
             <option value="Fuel System Service" className="text-black">Fuel System Service</option>
            </select>
           ) : (
            <div className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white/80">
             Service Type: {formData.serviceType}
            </div>
           )}

         <select name="urgency" value={formData.urgency} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
          <option value="low" className="text-black">Low</option>
          <option value="medium" className="text-black">Medium</option>
          <option value="high" className="text-black">High</option>
          <option value="urgent" className="text-black">Urgent</option>
         </select>

           <select
            name="serviceHistoryType"
            value={formData.serviceHistoryType}
            onChange={handleInputChange}
            className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           >
            <option value="first-service-call" className="text-black">First Service Call</option>
            <option value="existing-customer" className="text-black">Existing Customer</option>
           </select>

         <input type="datetime-local" name="outageStart" value={formData.outageStart} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" required />
         <input type="datetime-local" name="outageEnd" value={formData.outageEnd} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" required />
        </div>

        {formData.customerType === 'business' && formData.bookingMode === 'project' ? (
         <textarea
          name="projectScopeSummary"
          value={formData.projectScopeSummary}
          onChange={handleInputChange}
          rows="3"
          placeholder="Project Scope Summary (required for project-based visits)"
          className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          required
         />
        ) : null}

        {formData.customerType === 'business' && formData.bookingMode === 'multi-task' ? (
         <div className="space-y-4 rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
           <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Multi-Task Visit Plan</h3>
            <p className="text-xs text-cyan-100/80">Travel is billed once for this visit. Add each labour task below.</p>
           </div>
           <p className="text-xs font-medium text-cyan-100">Total Estimated Labour: {totalMultiTaskLabourHours.toFixed(1)} hrs</p>
          </div>

          <div className="space-y-3">
           {formData.serviceTasks.map((task, index) => (
            <div key={`service-task-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-white/20 bg-white/5 p-3 md:grid-cols-12">
             <select
              value={task.category}
              onChange={(event) => handleServiceTaskChange(index, 'category', event.target.value)}
              className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 md:col-span-3"
             >
              {BUSINESS_SERVICE_TASK_CATEGORIES.map((categoryOption) => (
               <option key={categoryOption.value} value={categoryOption.value} className="text-black">
          {categoryOption.label}
               </option>
              ))}
             </select>
             <input
              value={task.taskTitle}
              onChange={(event) => handleServiceTaskChange(index, 'taskTitle', event.target.value)}
              placeholder="Task title"
              className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 placeholder-white/50 md:col-span-4"
             />
             <input
              type="number"
              min="0.5"
              step="0.5"
              value={task.estimatedLabourHours}
              onChange={(event) => handleServiceTaskChange(index, 'estimatedLabourHours', event.target.value)}
              placeholder="Labour hrs"
              className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 placeholder-white/50 md:col-span-2"
             />
             <button
              type="button"
              onClick={() => removeServiceTask(index)}
              disabled={formData.serviceTasks.length <= 1}
              className="rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-1"
             >
              Remove
             </button>
             <textarea
              value={task.taskNotes}
              onChange={(event) => handleServiceTaskChange(index, 'taskNotes', event.target.value)}
              rows="2"
              placeholder="Task notes (optional)"
              className="rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 placeholder-white/50 md:col-span-12"
             />
            </div>
           ))}
          </div>

          <button
           type="button"
           onClick={addServiceTask}
           className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
          >
           Add Task Line
          </button>
         </div>
        ) : null}

        {formData.serviceHistoryType === 'first-service-call' ? (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
           type="date"
           min={minDate}
           name="dateOfPreferredServiceCall"
           value={formData.dateOfPreferredServiceCall}
           onChange={handleInputChange}
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           required
          />
         </div>
        ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
           type="date"
           name="dateOfLastService"
           value={formData.dateOfLastService}
           onChange={handleInputChange}
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           required
          />
          <input
           type="date"
           min={minDate}
           name="dateOfPreferredServiceCall"
           value={formData.dateOfPreferredServiceCall}
           onChange={handleInputChange}
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           required
          />
          <p className="md:col-span-2 text-xs text-white/70">
           {lastServiceAutofillMeta
            ? `Date of Last Service was auto-filled from ${lastServiceAutofillMeta.callNumber} (stored in database). You can adjust it if needed.`
            : 'Date of Last Service can auto-fill from your previous service records in the database when a matching contact email is found.'}
          </p>
          <textarea
           name="servicesInProgress"
           value={formData.servicesInProgress}
           onChange={handleInputChange}
           rows="3"
           placeholder="Services in Progress (required for existing customers)"
           className="md:col-span-2 w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
           required
          />
          <select
           name="progressStatus"
           value={formData.progressStatus}
           onChange={handleInputChange}
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3"
           required
          >
           <option value="N/A" className="text-black">N/A</option>
           <option value="Not Started" className="text-black">Not Started</option>
           <option value="In Progress" className="text-black">In Progress</option>
           <option value="Awaiting Quotation" className="text-black">Awaiting Quotation</option>
           <option value="Awaiting Approval" className="text-black">Awaiting Approval</option>
           <option value="Quoted" className="text-black">Quoted</option>
           <option value="Invoiced" className="text-black">Invoiced</option>
           <option value="Completed" className="text-black">Completed</option>
          </select>
          <input
           name="quotationHistory"
           value={formData.quotationHistory}
           onChange={handleInputChange}
           placeholder="Quotation History (optional references or notes)"
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          />
          <input
           name="invoicingHistory"
           value={formData.invoicingHistory}
           onChange={handleInputChange}
           placeholder="Invoicing History (optional references or notes)"
           className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
          />
         </div>
        )}
       </section>

             <section className="space-y-4">
        <h2 className="glass-heading-secondary">Scheduling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <select name="preferredTimeWindow" value={formData.preferredTimeWindow} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
          <option value="06:00 - 10:00" className="text-black">06:00 - 10:00</option>
          <option value="08:00 - 12:00" className="text-black">08:00 - 12:00</option>
          <option value="12:00 - 16:00" className="text-black">12:00 - 16:00</option>
          <option value="16:00 - 20:00" className="text-black">16:00 - 20:00</option>
          <option value="20:00 - 23:00" className="text-black">20:00 - 23:00</option>
         </select>
        </div>

        <textarea
         name="notes"
         value={formData.notes}
         onChange={handleInputChange}
         rows="4"
         placeholder="Additional notes (access restrictions, standby requirements, risk details, etc.)"
         className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50"
        />

        <label className="flex items-start gap-3 text-white/85">
         <input
          type="checkbox"
          name="confirmAccuracy"
          checked={formData.confirmAccuracy}
          onChange={handleInputChange}
          className="mt-1"
         />
         <span>I confirm that the information is accurate and authorized for dispatch planning.</span>
        </label>
       </section>

       <div className="flex flex-wrap gap-3">
        <button
         type="submit"
         disabled={isSubmitting}
         className="glass-btn-primary font-semibold py-3 px-6 disabled:opacity-50"
        >
         {isSubmitting ? 'Submitting...' : 'Book Service'}
        </button>

        <button
         type="button"
         onClick={() => navigate('/profile')}
         className="glass-btn-secondary font-semibold py-3 px-6"
        >
         Cancel
        </button>

          <CreateQuoteModal
           token={user?.token}
           isSuperUser={Boolean(user?.isSuperUser)}
           sourceData={quoteSourceData}
           triggerLabel="Create Quote"
           triggerClassName="inline-flex items-center gap-2 rounded-lg bg-amber-500/35 hover:bg-amber-500/45 border border-amber-300/40 py-3 px-6 text-sm font-semibold text-white transition"
          />
       </div>
      </form>
     </div>
    </div>
   </div>
  </>
 );
};

export default ServiceCalls;
