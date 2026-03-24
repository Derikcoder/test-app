import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CreateQuoteModal from './CreateQuoteModal';

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
  if (!formData.generatorMakeModel.trim()) return 'Generator make/model is required.';
   if (!formData.machineModelNumber.trim()) return 'Machine model number is required.';
  if (!formData.generatorCapacityKva || Number(formData.generatorCapacityKva) <= 0) {
   return 'Generator capacity must be greater than 0.';
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
    : `${formData.serviceType} - Private Customer (${formData.contactPerson})`;

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
       `Capacity (kVA): ${formData.generatorCapacityKva}`,
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
       `Capacity (kVA): ${formData.generatorCapacityKva}`,
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
      generatorCapacityKva: Number(formData.generatorCapacityKva),
      machineLocationSameAsAdmin: formData.machineLocationSameAsAdmin === 'yes',
      machineLocationNotes: formData.machineLocationNotes,
    },
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
         <input name="generatorMakeModel" value={formData.generatorMakeModel} onChange={handleInputChange} placeholder="Generator Make / Model" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="machineModelNumber" value={formData.machineModelNumber} onChange={handleInputChange} placeholder="Machine Model Number" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input type="number" min="1" name="generatorCapacityKva" value={formData.generatorCapacityKva} onChange={handleInputChange} placeholder="Capacity (kVA)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
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
         <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3">
          <option value="Preventive Maintenance" className="text-black">Preventive Maintenance</option>
          <option value="Emergency Repair" className="text-black">Emergency Repair</option>
          <option value="Load Bank Testing" className="text-black">Load Bank Testing</option>
          <option value="Fuel System Service" className="text-black">Fuel System Service</option>
         </select>

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
