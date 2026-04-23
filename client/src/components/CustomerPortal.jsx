/**
 * @file CustomerPortal.jsx
 * @description Dedicated customer workspace with explicit Dashboard, Profile, Billing, and Services sections.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import CustomerBillingPanel from './CustomerBillingPanel';
import CustomerSelfServicePanel from './CustomerSelfServicePanel';
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

const formatCurrency = (value) => new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const getAgentLabel = (serviceCall) => {
  const firstName = serviceCall?.assignedAgent?.firstName || '';
  const lastName = serviceCall?.assignedAgent?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || serviceCall?.assignedAgent?.employeeId || 'Unassigned Agent';
};

const getLatestReviewEntry = (serviceCall) => {
  const entries = Array.isArray(serviceCall?.feedbackHistory) ? serviceCall.feedbackHistory : [];
  if (entries.length > 0) {
    return entries
      .slice()
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0];
  }

  if (serviceCall?.rating || serviceCall?.customerFeedback) {
    return {
      stage: 'completedService',
      rating: Number(serviceCall.rating || 0),
      feedback: serviceCall.customerFeedback || '',
      submittedAt: serviceCall.ratedDate || serviceCall.updatedAt || serviceCall.createdAt,
    };
  }

  return null;
};

const CustomerPortal = () => {
  const { section = 'dashboard' } = useParams();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteActionStatus, setQuoteActionStatus] = useState({});

  const customerId = user?.customerProfile;

  useEffect(() => {
    if (!user?.token || !customerId) {
      setLoading(false);
      return;
    }

    const fetchCustomerWorkspace = async () => {
      try {
        setError('');
        setLoading(true);

        const [customerRes, serviceCallsRes, quotationsRes, invoicesRes] = await Promise.all([
          api.get(`/customers/${customerId}`, { headers: { Authorization: `Bearer ${user.token}` } }),
          api.get('/service-calls', { headers: { Authorization: `Bearer ${user.token}` } }),
          api.get(`/quotations?customer=${customerId}`, { headers: { Authorization: `Bearer ${user.token}` } }),
          api.get(`/invoices?customer=${customerId}`, { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);

        const allServiceCalls = Array.isArray(serviceCallsRes.data)
          ? serviceCallsRes.data
          : serviceCallsRes.data?.serviceCalls || [];

        setCustomer(customerRes.data || null);
        setServiceCalls(
          allServiceCalls.filter((call) => call.customer === customerId || call.customer?._id === customerId)
        );
        setQuotations(Array.isArray(quotationsRes.data) ? quotationsRes.data : []);
        setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      } catch (workspaceError) {
        setError(workspaceError.response?.data?.message || 'Unable to load your customer workspace right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerWorkspace();
  }, [customerId, user?.token]);

  const profileCards = useMemo(() => {
    return serviceCalls
      .slice()
      .sort((a, b) => new Date(b.completedDate || b.updatedAt || b.createdAt || 0) - new Date(a.completedDate || a.updatedAt || a.createdAt || 0))
      .map((call) => {
        const review = getLatestReviewEntry(call);
        return {
          id: call._id,
          callNumber: call.callNumber || call._id,
          serviceType: call.serviceType || 'General Service',
          title: call.title || call.description || 'Service Job',
          status: call.status || 'pending',
          completedDate: call.completedDate || call.updatedAt || call.createdAt,
          agentLabel: getAgentLabel(call),
          rating: Number(review?.rating || 0),
          reviewText: review?.feedback || '',
          reviewStage: review?.stage || 'general',
        };
      });
  }, [serviceCalls]);

  const groupedServices = useMemo(() => {
    return serviceCalls.reduce((acc, call) => {
      const category = call?.serviceType || 'General Service';
      if (!acc[category]) acc[category] = [];
      acc[category].push(call);
      return acc;
    }, {});
  }, [serviceCalls]);

  const activeQuotations = useMemo(() => {
    return quotations.filter((quote) => ['draft', 'sent', 'approved'].includes(quote.status));
  }, [quotations]);

  const dueInvoicesCount = useMemo(() => {
    return invoices.filter((invoice) => Number(invoice?.balance || 0) > 0).length;
  }, [invoices]);

  const outstandingAmount = useMemo(() => {
    return invoices.reduce((sum, invoice) => sum + Number(invoice?.balance || 0), 0);
  }, [invoices]);

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', description: 'Manage your platform profile' },
    { key: 'profile', label: 'Profile', description: 'Service summary cards and reviews' },
    { key: 'billing', label: 'Billing', description: 'Quotes awaiting action and invoices due' },
    { key: 'services', label: 'Services', description: 'Services rendered by category' },
  ];

  const activeSection = menuItems.find((item) => item.key === section) || menuItems[0];

  const handleQuotationDecision = async (quote, decision) => {
    if (!quote?.shareToken || !['accept', 'reject'].includes(decision)) return;

    setQuoteActionStatus((prev) => ({ ...prev, [quote._id]: 'loading' }));

    try {
      const path = decision === 'accept' ? 'accept' : 'reject';
      await api.patch(`/quotations/share/${quote.shareToken}/${path}`);

      setQuoteActionStatus((prev) => ({ ...prev, [quote._id]: decision }));
      setQuotations((prev) => prev.map((item) => (
        item._id === quote._id
          ? {
              ...item,
              status: decision === 'accept' ? 'approved' : 'rejected',
            }
          : item
      )));
    } catch {
      setQuoteActionStatus((prev) => ({ ...prev, [quote._id]: 'error' }));
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'customer') {
    return <Navigate to="/profile" replace />;
  }

  if (!['dashboard', 'profile', 'billing', 'services'].includes(section)) {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return (
    <>
      <Sidebar />
      <div className="page-body">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Customer Workspace</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/50 px-3 py-1 text-[11px] text-white/85">
                  <span>Customer Workspace</span>
                  <span className="text-white/40">/</span>
                  <span className="font-semibold text-cyan-100">{activeSection.label}</span>
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-white">{customer?.businessName || 'My Service Portal'}</h1>
                <p className="mt-2 text-sm text-white/85">Choose a section to manage your account, services, and billing journey.</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {menuItems.map((item) => {
                  const path = `/customer/${item.key}`;
                  const isActive = pathname === path;
                  return (
                    <Link
                      key={item.key}
                      to={path}
                      className={`rounded-xl border px-4 py-3 transition-colors ${
                        isActive
                          ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-100'
                          : 'border-white/20 bg-slate-900/50 text-white/90 hover:border-cyan-300/50 hover:bg-slate-900/80 hover:text-cyan-100'
                      }`}
                    >
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs text-white/70">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="sm:hidden rounded-2xl border border-white/15 bg-slate-950/55 p-3 shadow-xl backdrop-blur-sm">
            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">Quick Actions</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Link
                to="/service-call-registration"
                state={{
                  isCustomerPortalBooking: true,
                  customer,
                  portalServiceCalls: serviceCalls,
                  prefillCustomer: {
                    customerType: customer?.customerType,
                    businessName: customer?.businessName,
                    contactFirstName: customer?.contactFirstName,
                    contactLastName: customer?.contactLastName,
                    email: customer?.email,
                    phoneNumber: customer?.phoneNumber,
                    physicalAddress: customer?.physicalAddress,
                    physicalAddressDetails: customer?.physicalAddressDetails,
                  },
                }}
                className="inline-flex items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2 py-2 text-xs font-semibold text-cyan-100"
              >
                Book Service
              </Link>
              <Link
                to="/customer/billing"
                className={`inline-flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${
                  section === 'billing'
                    ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-100'
                    : 'border-white/20 bg-slate-900/50 text-white/90'
                }`}
              >
                Billing
              </Link>
              <Link
                to="/customer/profile"
                className={`inline-flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold ${
                  section === 'profile'
                    ? 'border-blue-500/50 bg-blue-950/50 text-blue-100'
                    : 'border-white/20 bg-slate-900/50 text-white/90'
                }`}
              >
                Profile
              </Link>
            </div>
          </section>

          {loading ? (
            <section className="rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm">
              <p className="text-sm text-white/85">Loading your customer workspace...</p>
            </section>
          ) : (
            <>
              {error ? (
                <section className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </section>
              ) : null}

              {section === 'dashboard' ? (
                <section className="section-transition rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm">
                  <CustomerSelfServicePanel
                    customerId={customerId}
                    customer={customer}
                    setCustomer={setCustomer}
                    serviceCalls={serviceCalls}
                    token={user?.token}
                    isOwnProfile
                  />
                </section>
              ) : null}

              {section === 'profile' ? (
                <section className="section-transition rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">Service Review Cards</h2>
                      <p className="text-sm text-white/80">Each card summarizes a service, the assigned field agent, and customer feedback.</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-slate-900/50 px-3 py-1 text-xs text-white/90">
                      {profileCards.length} service card{profileCards.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {profileCards.length === 0 ? (
                    <p className="text-sm text-white/75">No service cards available yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {profileCards.map((card) => (
                        <article key={card.id} className="rounded-xl border border-white/20 bg-slate-900/60 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{card.callNumber}</p>
                              <p className="mt-1 text-xs text-white/75">{card.serviceType} · {card.title}</p>
                            </div>
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                              {card.status}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-white/90">
                            <p><span className="font-semibold text-white">Agent:</span> {card.agentLabel}</p>
                            <p><span className="font-semibold text-white">Rating:</span> {card.rating > 0 ? `${'★'.repeat(card.rating)} (${card.rating}/5)` : 'Not rated yet'}</p>
                            <p><span className="font-semibold text-white">Review:</span> {card.reviewText || 'No written review submitted yet.'}</p>
                            <p className="text-xs text-white/70">Stage: {card.reviewStage} · Updated {formatDate(card.completedDate)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {section === 'billing' ? (
                <section className="section-transition rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">Quotes Awaiting Action</p>
                      <p className="mt-1 text-xl font-extrabold text-white">{activeQuotations.filter((quote) => quote.status === 'sent').length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Invoices Due</p>
                      <p className="mt-1 text-xl font-extrabold text-white">{dueInvoicesCount}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">Outstanding Amount</p>
                      <p className="mt-1 text-xl font-extrabold text-white">{formatCurrency(outstandingAmount)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/20 bg-slate-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">Quotes To Accept</h3>
                    {activeQuotations.length === 0 ? (
                      <p className="mt-2 text-sm text-white/75">No active quotations right now.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {activeQuotations.map((quote) => (
                          <div key={quote._id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-950/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white/90">{quote.quotationNumber}</p>
                              <p className="text-xs text-white/60">{quote.title || 'Quotation'} · {formatCurrency(quote.totalAmount)}</p>
                              <p className="text-xs text-white/45">Status: {quote.status} · Valid until {formatDate(quote.validUntil)}</p>
                            </div>

                            {quote.status === 'sent' && quote.shareToken ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuotationDecision(quote, 'accept')}
                                  disabled={quoteActionStatus[quote._id] === 'loading'}
                                  className="rounded-md border border-emerald-600/40 bg-emerald-900/40 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-800/55 disabled:opacity-60"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuotationDecision(quote, 'reject')}
                                  disabled={quoteActionStatus[quote._id] === 'loading'}
                                  className="rounded-md border border-red-600/40 bg-red-900/40 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-800/55 disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-white/50">No customer action required</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/20 bg-slate-900/60 p-4">
                    <h3 className="text-sm font-semibold text-white">Invoices Due</h3>
                    <div className="mt-3">
                      <CustomerBillingPanel customerId={customerId} token={user?.token} isOwnProfile />
                    </div>
                  </div>
                </section>
              ) : null}

              {section === 'services' ? (
                <section className="section-transition rounded-2xl border border-white/15 bg-slate-950/40 p-6 shadow-xl backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-white">Services Rendered By Category</h2>
                  <p className="mt-1 text-sm text-white/80">Browse every service delivered to your account in grouped categories.</p>

                  <div className="sticky top-20 z-20 my-5 flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-slate-950/85 px-3 py-2 backdrop-blur-sm">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                    <Link
                      to="/service-call-registration"
                      state={{
                        isCustomerPortalBooking: true,
                        customer,
                        portalServiceCalls: serviceCalls,
                        prefillCustomer: {
                          customerType: customer?.customerType,
                          businessName: customer?.businessName,
                          contactFirstName: customer?.contactFirstName,
                          contactLastName: customer?.contactLastName,
                          email: customer?.email,
                          phoneNumber: customer?.phoneNumber,
                          physicalAddress: customer?.physicalAddress,
                          physicalAddressDetails: customer?.physicalAddressDetails,
                        },
                      }}
                      className="btn-action-cyan"
                    >
                      Book Service
                    </Link>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
                  </div>

                  {Object.keys(groupedServices).length === 0 ? (
                    <p className="mt-4 text-sm text-white/75">No service activity has been captured yet.</p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {Object.entries(groupedServices)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([category, calls]) => (
                          <div key={category} className="rounded-xl border border-white/20 bg-slate-900/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-yellow-300">{category}</p>
                              <span className="rounded-full border border-white/20 bg-slate-900/50 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-white/85">
                                {calls.length} service{calls.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="mt-3 space-y-2">
                              {calls
                                .slice()
                                .sort((a, b) => new Date(b.completedDate || b.updatedAt || b.createdAt || 0) - new Date(a.completedDate || a.updatedAt || a.createdAt || 0))
                                .map((call) => (
                                  <div key={call._id} className="rounded-lg border border-white/10 bg-slate-950/35 p-3 text-sm text-white/80">
                                    <p className="font-semibold text-white/90">{call.callNumber || call._id}</p>
                                    <p className="text-xs text-white/60">{call.title || call.description || 'Service Job'} · {getAgentLabel(call)}</p>
                                    <p className="text-xs text-white/50">Status: {call.status || 'pending'} · Updated {formatDate(call.completedDate || call.updatedAt || call.createdAt)}</p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerPortal;