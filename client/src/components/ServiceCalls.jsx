import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

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

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');
 const [successMessage, setSuccessMessage] = useState('');

 const [formData, setFormData] = useState({
  companyName: user?.businessName || '',
  contactPerson: '',
  contactEmail: user?.email || '',
  contactPhone: user?.phoneNumber || '',
  siteAddress: user?.physicalAddress || '',
  dataCenterName: '',
  generatorMakeModel: '',
  generatorCapacityKva: '',
  serialNumber: '',
  serviceType: 'Preventive Maintenance',
  urgency: 'High',
  outageStart: '',
  outageEnd: '',
  preferredDate: '',
  preferredTimeWindow: '08:00 - 12:00',
  notes: '',
  confirmAccuracy: false,
 });

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
  if (!formData.companyName.trim()) return 'Company name is required.';
  if (!formData.contactPerson.trim()) return 'Contact person is required.';
  if (!/^\S+@\S+\.\S+$/.test(formData.contactEmail)) return 'A valid contact email is required.';
  if (!formData.contactPhone.trim()) return 'Contact phone is required.';
  if (!formData.siteAddress.trim()) return 'Site address is required.';
  if (!formData.dataCenterName.trim()) return 'Data center name is required.';
  if (!formData.generatorMakeModel.trim()) return 'Generator make/model is required.';
  if (!formData.generatorCapacityKva || Number(formData.generatorCapacityKva) <= 0) {
   return 'Generator capacity must be greater than 0.';
  }
  if (!formData.preferredDate) return 'Preferred service date is required.';
  if (!formData.outageStart || !formData.outageEnd) return 'Outage window is required.';
  if (new Date(formData.outageStart) >= new Date(formData.outageEnd)) {
   return 'Outage end time must be after outage start time.';
  }
  if (!formData.confirmAccuracy) return 'Please confirm the information is accurate.';
  return null;
 };

 /**
  * Builds a backend-safe service call payload.
  *
  * @returns {{title: string, description: string, priority: string, scheduledDate: string}}
  */
 const buildPayload = () => {
  const title = `${formData.serviceType} - ${formData.companyName} (${formData.dataCenterName})`;

  const description = [
   `Company: ${formData.companyName}`,
   `Contact: ${formData.contactPerson}`,
   `Email: ${formData.contactEmail}`,
   `Phone: ${formData.contactPhone}`,
   `Site Address: ${formData.siteAddress}`,
   `Data Center: ${formData.dataCenterName}`,
   `Generator: ${formData.generatorMakeModel}`,
   `Capacity (kVA): ${formData.generatorCapacityKva}`,
   `Serial Number: ${formData.serialNumber || 'N/A'}`,
   `Service Type: ${formData.serviceType}`,
   `Urgency: ${formData.urgency}`,
   `Load Shedding Window: ${new Date(formData.outageStart).toLocaleString()} -> ${new Date(formData.outageEnd).toLocaleString()}`,
   `Preferred Date: ${formData.preferredDate}`,
   `Preferred Time Window: ${formData.preferredTimeWindow}`,
   `Notes: ${formData.notes || 'None'}`,
  ].join('\n');

  return {
   title,
   description,
   priority: formData.urgency,
   scheduledDate: new Date(formData.preferredDate).toISOString(),
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

 const minDateTime = useMemo(() => new Date().toISOString().slice(0, 16), []);

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
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
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
        <h2 className="glass-heading-secondary">Company & Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Company Name" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} placeholder="Contact Person" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} placeholder="Contact Email" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} placeholder="Contact Phone" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
        </div>
        <input name="siteAddress" value={formData.siteAddress} onChange={handleInputChange} placeholder="Site Address" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
       </section>

       <section className="space-y-4">
        <h2 className="glass-heading-secondary">Generator Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <input name="dataCenterName" value={formData.dataCenterName} onChange={handleInputChange} placeholder="Data Center Name" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="generatorMakeModel" value={formData.generatorMakeModel} onChange={handleInputChange} placeholder="Generator Make / Model" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input type="number" min="1" name="generatorCapacityKva" value={formData.generatorCapacityKva} onChange={handleInputChange} placeholder="Capacity (kVA)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" required />
         <input name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} placeholder="Serial Number (Optional)" className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder-white/50" />
        </div>
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
          <option value="Low" className="text-black">Low</option>
          <option value="Medium" className="text-black">Medium</option>
          <option value="High" className="text-black">High</option>
          <option value="Urgent" className="text-black">Urgent</option>
         </select>

         <input type="datetime-local" name="outageStart" value={formData.outageStart} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" required />
         <input type="datetime-local" name="outageEnd" value={formData.outageEnd} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" required />
        </div>
       </section>

       <section className="space-y-4">
        <h2 className="glass-heading-secondary">Scheduling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <input type="datetime-local" min={minDateTime} name="preferredDate" value={formData.preferredDate} onChange={handleInputChange} className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3" required />
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
       </div>
      </form>
     </div>
    </div>
   </div>
  </>
 );
};

export default ServiceCalls;
