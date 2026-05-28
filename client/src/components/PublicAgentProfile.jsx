import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const pageShellClass = 'min-h-screen bg-slate-950 px-4 pt-20 pb-10 sm:px-6 lg:px-8';
const panelClass = 'rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-xl';

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const ratingLabel = (averageRating, ratingsCount) => {
  if (!ratingsCount) return 'Not rated yet';
  return `${averageRating.toFixed(1)} / 5 from ${ratingsCount} review${ratingsCount === 1 ? '' : 's'}`;
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const PublicAgentProfile = ({ useCurrentAgent = false }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const canAccessAgentGovernanceViews =
    user?.role === 'superAdmin'
    || user?.role === 'businessAdministrator'
    || user?.isSuperUser === true;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvedAgentId, setResolvedAgentId] = useState(id || '');

  useEffect(() => {
    const resolveAgentId = async () => {
      if (id) {
        setResolvedAgentId(id);
        return;
      }

      if (!useCurrentAgent) {
        setResolvedAgentId('');
        setError('Agent profile link is incomplete.');
        return;
      }

      if (user?.role !== 'fieldServiceAgent') {
        setResolvedAgentId('');
        setError('Only field agents can open this profile view without an explicit profile id.');
        return;
      }

      try {
        const response = await api.get('/agents/me');
        setResolvedAgentId(response?.data?._id || '');
      } catch (err) {
        setResolvedAgentId('');
        setError(err?.response?.data?.message || 'Failed to resolve current agent profile');
      }
    };

    resolveAgentId();
  }, [id, useCurrentAgent, user?.role]);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!resolvedAgentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/agents/public/${resolvedAgentId}`);
        setProfile(response.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load public agent profile');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [resolvedAgentId]);

  const profilePhotoUrl = useMemo(() => {
    if (!profile?.profilePhoto?.data || !profile?.profilePhoto?.mimeType) return '';
    return `data:${profile.profilePhoto.mimeType};base64,${profile.profilePhoto.data}`;
  }, [profile]);

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className={pageShellClass}>
          <div className="mx-auto max-w-6xl">
            <div className={`${panelClass} text-slate-100`}>Loading profile...</div>
          </div>
        </main>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Sidebar />
        <main className={pageShellClass}>
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-6 text-rose-200">
              {error || 'Agent profile is unavailable.'}
            </div>
            <Link className="inline-flex rounded-lg border border-cyan-500 px-4 py-2 text-cyan-200 hover:bg-cyan-500/10" to="/login">
              Go to Login
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className={pageShellClass}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {canAccessAgentGovernanceViews ? (
          <div>
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Agents
            </Link>
          </div>
        ) : null}

        <section className={`${panelClass} grid gap-6 md:grid-cols-[160px_1fr]`}>
          <div className="flex items-start justify-center md:justify-start">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="h-36 w-36 rounded-2xl border border-slate-600 object-cover"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-slate-600 bg-slate-800 text-4xl font-bold text-slate-200">
                {(profile.firstName?.[0] || 'A').toUpperCase()}
              </div>
            )}
          </div>

          <div className="space-y-4 text-slate-100">
            <div>
              <h1 className="text-3xl font-bold">{profile.firstName} {profile.lastName}</h1>
              <p className="text-sm text-slate-300">{profile.category || 'Field Service Agent'} • {profile.employeeId}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-amber-100">
              <div className="text-sm uppercase tracking-wide text-amber-300">Public Rating</div>
              <div className="text-lg font-semibold">{ratingLabel(Number(profile.averageRating || 0), Number(profile.ratingsCount || 0))}</div>
            </div>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <div>Area: <span className="text-slate-100">{profile.assignedArea || 'Not specified'}</span></div>
              <div>Jobs Completed: <span className="text-slate-100">{profile.jobsCompleted || 0}</span></div>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-300">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).length > 0 ? (profile.skills || []).map((skill) => (
                  <span key={skill} className="rounded-full border border-cyan-500/40 bg-cyan-900/30 px-3 py-1 text-xs text-cyan-100">{skill}</span>
                )) : <span className="text-sm text-slate-400">No skills listed</span>}
              </div>
            </div>
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="public-agent-section-title">Universal Service Report</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="public-agent-subcard">
              <p className="text-xs uppercase tracking-wide text-slate-400">Assigned Jobs</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{profile.serviceReport?.totalAssignedJobs || 0}</p>
            </article>
            <article className="public-agent-subcard">
              <p className="text-xs uppercase tracking-wide text-slate-400">Completed / Invoiced</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{profile.serviceReport?.completedOrInvoicedJobs || 0}</p>
            </article>
            <article className="public-agent-subcard">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total Labor Hours</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{Number(profile.serviceReport?.totalLaborHours || 0).toFixed(1)}</p>
            </article>
            <article className="public-agent-subcard">
              <p className="text-xs uppercase tracking-wide text-slate-400">Parts Spend (historic)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{formatCurrency(profile.serviceReport?.totalPartsCost || 0)}</p>
            </article>
          </div>

          <div className="mt-4 public-agent-subcard">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Status Breakdown</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(profile.serviceReport?.statusBreakdown || {}).length > 0 ? Object.entries(profile.serviceReport?.statusBreakdown || {}).map(([status, count]) => (
                <span key={status} className="rounded-full border border-cyan-500/40 bg-cyan-900/30 px-3 py-1 text-xs text-cyan-100">
                  {status}: {count}
                </span>
              )) : <span className="text-sm text-slate-400">No service status data yet.</span>}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-3 text-lg font-semibold text-slate-100">Recent Completed / Invoiced Jobs</h3>
            <div className="space-y-3">
              {(profile.serviceReport?.recentServiceEvidence || []).length > 0 ? (profile.serviceReport?.recentServiceEvidence || []).slice(0, 12).map((job) => (
                <article key={`${job.callNumber}-${job.serviceDate || ''}`} className="public-agent-subcard">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-100">{job.callNumber} • {job.title || job.serviceType || 'Service Job'}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          job.hasMachineLink
                            ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                            : 'border-amber-600 bg-amber-950/40 text-amber-300'
                        }`}
                        title={job.hasMachineLink ? 'Machine linked to this completed/invoiced job' : 'Machine link missing on this completed/invoiced job'}
                      >
                        {job.hasMachineLink ? 'Machine Linked' : 'Machine Missing'}
                      </span>
                      <p className="text-xs uppercase tracking-wide text-emerald-300">{job.status}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{job.customerName} • {formatDate(job.serviceDate)}</p>
                  {job.machine ? (
                    <p className="mt-1 text-sm text-cyan-200">
                      Machine: {job.machine.generatorMakeModel || job.machine.machineType || 'Unspecified'}
                      {job.machine.machineModelNumber ? ` (${job.machine.machineModelNumber})` : ''}
                    </p>
                  ) : null}
                  {!job.hasMachineLink ? (
                    <p className="mt-1 text-xs text-amber-300">
                      UAT note: link a machine on this service call to include it in Machines Worked On.
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">
                    Labor: {Number(job.laborHours || 0).toFixed(1)} hrs • Parts lines: {job.partsLineItems || 0} • Parts cost: {formatCurrency(job.partsCost || 0)}
                  </p>
                </article>
              )) : (
                <p className="text-slate-400">Completed or invoiced jobs will appear here once UAT jobs move through the lifecycle.</p>
              )}
            </div>
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="public-agent-section-title">Recent Customer Reviews</h2>
          <div className="space-y-3">
            {(profile.publicReviews || []).length > 0 ? (profile.publicReviews || []).slice(0, 12).map((review) => (
              <article key={`${review.reviewId || review.callNumber}-${review.submittedAt || ''}`} className="public-agent-subcard">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">{review.customerName}</p>
                  <p className="text-sm text-amber-300">{review.rating} / 5</p>
                </div>
                <p className="mt-1 text-sm text-slate-300">Call: {review.callNumber} • {formatDate(review.submittedAt)}</p>
                <p className="mt-2 text-sm text-slate-200">{review.feedback || 'Customer left a star rating without a written comment.'}</p>
              </article>
            )) : (
              <p className="text-slate-400">No customer reviews published yet.</p>
            )}
          </div>
        </section>

        <section className={`${panelClass} grid gap-6 lg:grid-cols-2`}>
          <div>
            <h2 className="public-agent-section-title">Machines Worked On</h2>
            {(profile.machinesWorkedOn || []).length > 0 ? (
              <div className="space-y-3">
                {(profile.machinesWorkedOn || []).slice(0, 12).map((machine) => (
                  <article key={machine.machineId} className="public-agent-subcard">
                    <p className="font-semibold text-slate-100">{machine.generatorMakeModel || machine.machineType || 'Machine'}</p>
                    <p className="text-sm text-slate-300">{machine.machineModelNumber || 'No model number listed'}</p>
                    <p className="mt-1 text-xs text-cyan-200">Services Rendered: {machine.servicesRendered || 0} • Last Service: {formatDate(machine.lastServicedAt)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No machine history available yet.</p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="public-agent-section-title">Expertise Brands</h2>
              <div className="flex flex-wrap gap-2">
                {(profile.expertiseBrands || []).length > 0 ? (profile.expertiseBrands || []).map((brand) => (
                  <span key={brand} className="rounded-full border border-emerald-500/40 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-100">{brand}</span>
                )) : <span className="text-slate-400">No brand data recorded yet.</span>}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-100">Preferred Product Suppliers</h3>
              <div className="space-y-2">
                {(profile.preferredSuppliers || []).length > 0 ? (profile.preferredSuppliers || []).map((supplier, index) => (
                  <article key={`${supplier.businessName}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
                    <p className="font-semibold">{supplier.businessName || 'Unnamed supplier'}</p>
                    <p className="text-slate-300">{supplier.location || 'Location not provided'} • {supplier.supplierProductType || supplier.category || 'General supplies'}</p>
                  </article>
                )) : <p className="text-slate-400">No preferred product suppliers listed.</p>}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-100">Preferred Service Suppliers</h3>
              <div className="space-y-2">
                {(profile.preferredThirdPartyServiceProviders || []).length > 0 ? (profile.preferredThirdPartyServiceProviders || []).map((supplier, index) => (
                  <article key={`${supplier.businessName}-${index}`} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-200">
                    <p className="font-semibold">{supplier.businessName || 'Unnamed provider'}</p>
                    <p className="text-slate-300">{supplier.location || 'Location not provided'} • {supplier.supplierProductType || supplier.category || 'Service partner'}</p>
                  </article>
                )) : <p className="text-slate-400">No preferred service providers listed.</p>}
              </div>
            </div>
          </div>
        </section>
        </div>
      </main>
    </>
  );
};

export default PublicAgentProfile;
