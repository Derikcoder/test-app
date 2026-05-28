/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';

export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export const formatStructuredAddress = (address = {}) => {
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

export const ACCOUNT_STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-300 border border-green-400/40',
  inactive: 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40',
  suspended: 'bg-red-500/20 text-red-300 border border-red-400/40',
};

export const createBusinessProfileInfoCards = ({
  customer,
  physLines,
  billLines,
  fallbackBookingLocation,
  fallbackServiceLocation,
}) => {
  if (!customer) return [];

  return [
    {
      key: 'business-details',
      title: 'Business Details',
      icon: '🏢',
      children: (
        <>
          <InfoRow label="Business Name" value={customer.businessName} />
          <InfoRow label="Registration No." value={customer.registrationNumber} />
          <InfoRow label="VAT Number" value={customer.vatNumber} />
          <InfoRow label="Tax Number" value={customer.taxNumber} />
          <InfoRow label="Customer ID" value={customer.customerId} />
          <InfoRow label="Account Status" value={customer.accountStatus} />
          <InfoRow label="Registered" value={formatDate(customer.createdAt)} />
          <InfoRow label="Last Updated" value={formatDate(customer.updatedAt)} />
        </>
      ),
    },
    {
      key: 'primary-contact',
      title: 'Primary Contact',
      icon: '👤',
      children: (
        <>
          <InfoRow label="Contact Person" value={`${customer.contactFirstName} ${customer.contactLastName}`.trim()} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phoneNumber} />
          {customer.alternatePhone && <InfoRow label="Alternate Phone" value={customer.alternatePhone} />}
        </>
      ),
    },
    {
      key: 'physical-address',
      title: 'Physical Address',
      icon: '📍',
      children: physLines?.length > 0 ? (
        <div className="flex flex-col gap-1">
          {physLines.map((line, i) => (
            <span key={i} className="text-sm font-medium text-white/90">{line}</span>
          ))}
        </div>
      ) : (
        <span className="profile-muted-text">No address on record</span>
      ),
    },
    billLines?.length > 0
      ? {
          key: 'billing-address',
          title: 'Billing Address',
          icon: '🧾',
          children: (
            <div className="flex flex-col gap-1">
              {billLines.map((line, i) => (
                <span key={i} className="text-sm font-medium text-white/90">{line}</span>
              ))}
            </div>
          ),
        }
      : null,
    {
      key: 'service-locations',
      title: 'Service Locations',
      icon: '🗺️',
      children: (
        <>
          <InfoRow label="Booking Location" value={fallbackBookingLocation || null} />
          <InfoRow label="Service Location" value={fallbackServiceLocation || null} />
          {!fallbackBookingLocation && !fallbackServiceLocation && (
            <span className="profile-muted-text">No location preferences recorded</span>
          )}
        </>
      ),
    },
    (customer.maintenanceManager?.name || customer.maintenanceManager?.email)
      ? {
          key: 'maintenance-manager',
          title: 'Maintenance Manager',
          icon: '🔧',
          children: (
            <>
              <InfoRow label="Name" value={customer.maintenanceManager.name} />
              <InfoRow label="Phone" value={customer.maintenanceManager.phone} />
              <InfoRow label="Email" value={customer.maintenanceManager.email} />
            </>
          ),
        }
      : null,
  ].filter(Boolean);
};

export const createResidentialProfileInfoCards = ({
  customer,
  displayName,
  addressLines,
  notes,
  fallbackBookingLocation,
  fallbackServiceLocation,
}) => {
  if (!customer) return [];

  return [
    {
      key: 'contact-information',
      title: 'Contact Information',
      icon: '👤',
      children: (
        <>
          <InfoRow label="Full Name" value={displayName} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phoneNumber} />
          {customer.alternatePhone && <InfoRow label="Alternate Phone" value={customer.alternatePhone} />}
        </>
      ),
    },
    {
      key: 'residential-address',
      title: 'Residential Address',
      icon: '📍',
      children: addressLines?.length > 0 ? (
        <div className="flex flex-col gap-1">
          {addressLines.map((line, i) => (
            <span key={i} className="text-sm font-medium text-white/90">{line}</span>
          ))}
        </div>
      ) : (
        <span className="profile-muted-text">No address on record</span>
      ),
    },
    {
      key: 'service-locations',
      title: 'Service Locations',
      icon: '🗺️',
      children: (
        <>
          <InfoRow label="Booking Location" value={notes.bookingLocation || fallbackBookingLocation || null} />
          <InfoRow label="Service Location" value={notes.serviceLocation || fallbackServiceLocation || null} />
          <InfoRow label="Location Relationship" value={notes.locationRelationship || null} />
          {!notes.bookingLocation && !notes.serviceLocation && !fallbackBookingLocation && !fallbackServiceLocation && (
            <span className="profile-muted-text">No location preferences recorded</span>
          )}
        </>
      ),
    },
    {
      key: 'account-details',
      title: 'Account Details',
      icon: '🗂️',
      children: (
        <>
          <InfoRow label="Customer ID" value={customer.customerId} />
          <InfoRow label="Account Status" value={customer.accountStatus} />
          <InfoRow label="VAT Number" value={customer.vatNumber || null} />
          <InfoRow label="Equipment on Site" value={notes.machineCount ? `${notes.machineCount} unit(s)` : null} />
          <InfoRow
            label="Machines Distributed"
            value={notes.machinesDistributed === 'yes' ? 'Yes — multiple locations' : notes.machinesDistributed === 'no' ? 'No — single location' : null}
          />
          <InfoRow label="Registered" value={formatDate(customer.createdAt)} />
          <InfoRow label="Last Updated" value={formatDate(customer.updatedAt)} />
        </>
      ),
    },
  ].filter(Boolean);
};

export const createBusinessServiceBookingState = (customer) => ({
  prefillCustomer: {
    customerType: 'business',
    companyName: customer?.businessName,
    contactPerson: `${customer?.contactFirstName ?? ''} ${customer?.contactLastName ?? ''}`.trim(),
    contactEmail: customer?.email,
    contactPhone: customer?.phoneNumber,
  },
});

export const createResidentialServiceBookingState = (customer, displayName) => ({
  prefillCustomer: {
    customerType: 'private',
    companyName: displayName,
    contactPerson: displayName,
    contactEmail: customer?.email,
    contactPhone: customer?.phoneNumber,
    adminStreetAddress: customer?.physicalAddressDetails?.streetAddress ?? '',
    adminSuburb: customer?.physicalAddressDetails?.suburb ?? '',
    adminCity: customer?.physicalAddressDetails?.cityDistrict ?? '',
    adminProvince: customer?.physicalAddressDetails?.province ?? '',
    adminPostalCode: customer?.physicalAddressDetails?.postalCode ?? '',
    adminCountry: 'South Africa',
  },
});

export const createBusinessProfileMeta = ({ customer, variantLabel, parentName, parentId, navigate }) => (
  <>
    <span>{customer?.customerId}</span>
    {parentName && (
      <>
        <span>·</span>
        <span>
          {variantLabel} of:{' '}
          <button
            onClick={() => navigate(`/customers/${parentId}`)}
            className="text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors"
          >
            {parentName}
          </button>
        </span>
      </>
    )}
    <span>·</span>
    <span>Member since {formatDate(customer?.createdAt)}</span>
  </>
);

const CALL_STATUS_STYLES = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  scheduled: 'bg-blue-500/20 text-blue-300',
  assigned: 'bg-purple-500/20 text-purple-300',
  'in-progress': 'bg-cyan-500/20 text-cyan-300',
  'on-hold': 'bg-orange-500/20 text-orange-300',
  completed: 'bg-green-500/20 text-green-300',
  invoiced: 'bg-teal-500/20 text-teal-300',
  cancelled: 'bg-red-500/20 text-red-300',
};

const getLocationSourceLabel = (source) => {
  switch (source) {
    case 'explicit-service-location':
      return 'Explicit Location';
    case 'booking-machine-address':
      return 'Machine Address';
    case 'booking-administrative-address':
      return 'Customer Address';
    default:
      return '';
  }
};

export const InfoRow = ({ label, value }) => {
  if (!value) return null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <span className="text-sm font-medium text-white/90 break-words">{value}</span>
    </div>
  );
};

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

InfoRow.defaultProps = {
  value: null,
};

export const SectionCard = ({ title, icon, children, className = '' }) => (
  <div className={`glass-card p-6 ${className}`}>
    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 mb-5">
      <span className="text-base">{icon}</span>
      {title}
    </h3>
    <div className="flex flex-col gap-4">{children}</div>
  </div>
);

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

SectionCard.defaultProps = {
  icon: '',
  children: null,
  className: '',
};

export const CallHistoryRow = ({ call, summaryResolver }) => {
  const statusStyle = CALL_STATUS_STYLES[call.status] ?? 'bg-white/10 text-white/60';
  const callSummary = summaryResolver ? summaryResolver(call) : (call.serviceType ?? 'Service Call');

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/10 last:border-0">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-white/90 truncate">
          {call.callNumber ?? call._id.slice(-6).toUpperCase()}
        </span>
        <span className="text-xs text-white/50 truncate">
          {callSummary}{call.urgency ? ` · ${call.urgency}` : ''}
        </span>
        {(call.resolvedServiceLocation || call.serviceLocation) && (
          <span className="text-xs text-white/40 truncate">
            {call.resolvedServiceLocation || call.serviceLocation}
            {getLocationSourceLabel(call.resolvedServiceLocationSource) && (
              <span className="ml-2 inline-flex items-center rounded-full border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                {getLocationSourceLabel(call.resolvedServiceLocationSource)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusStyle}`}>
          {call.status}
        </span>
        <span className="text-[10px] text-white/40">{formatDate(call.dateOfPreferredServiceCall ?? call.createdAt)}</span>
      </div>
    </div>
  );
};

CallHistoryRow.propTypes = {
  call: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    callNumber: PropTypes.string,
    serviceType: PropTypes.string,
    urgency: PropTypes.string,
    status: PropTypes.string,
    resolvedServiceLocation: PropTypes.string,
    serviceLocation: PropTypes.string,
    resolvedServiceLocationSource: PropTypes.string,
    dateOfPreferredServiceCall: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  }).isRequired,
  summaryResolver: PropTypes.func,
};

CallHistoryRow.defaultProps = {
  summaryResolver: null,
};
