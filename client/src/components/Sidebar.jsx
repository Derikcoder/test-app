import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const toggleSidebar = () => setIsOpen(!isOpen);
  const isSuperAdmin = user?.role === 'superAdmin' || user?.isSuperUser === true;
  const isCustomer = user?.role === 'customer';
  const isFieldAgent = user?.role === 'fieldServiceAgent';
  const roleLabelMap = {
    superAdmin: 'Super Admin',
    businessAdministrator: 'Business Administrator',
    fieldServiceAgent: 'Field Service Agent',
    customer: 'Customer',
  };
  const roleLabel = roleLabelMap[user?.role] || (isSuperAdmin ? 'Super Admin' : 'Platform User');

  const allMenuItems = [
    {
      name: 'Dashboard',
      path: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Field Service Agents',
      path: '/agents',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Service Calls',
      path: '/service-calls',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: 'Quotations',
      path: '/quotations',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const isActive = (path) => location.pathname === path;

  const adminOnlyPaths = ['/agents', '/customers', '/quotations'];
  const agentAllowedPaths = ['/profile', '/service-calls'];

  const menuItems = allMenuItems.filter((item) => {
    if (isCustomer) return item.path === '/profile';
    if (isFieldAgent) return agentAllowedPaths.includes(item.path);
    return true;
  });

  return (
    <>
      {/* Menu Toggle Button - Anchored to the same centered content wrapper */}
      <div className="fixed top-4 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={toggleSidebar}
            className="glass-btn-primary pointer-events-auto p-3 shadow-lg transition-all duration-300"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`glass-pane fixed top-0 left-0 h-full w-80 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out backdrop-blur-xl bg-white/10 border border-white/20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="glass-heading text-xl">{user.businessName}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    isSuperAdmin
                      ? 'border-fuchsia-700 bg-fuchsia-950 text-fuchsia-200'
                      : 'border-cyan-700 bg-cyan-950 text-cyan-200'
                  }`}>
                    Role: {roleLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                    {isSuperAdmin ? 'Governance Mode' : 'Operational Mode'}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="text-white hover:text-yellow-300 p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={toggleSidebar}
                    className={`glass-link flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-white/20 backdrop-blur-sm text-blue-900 font-semibold border border-white/30'
                        : 'text-white/80 hover:bg-white/10 hover:text-yellow-300'
                    }`}
                  >
                  <span className={isActive(item.path) ? 'text-blue-900' : 'text-white/70'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Entity Legend</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-200">
                <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5">
                  <span>Field Agents</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5">
                  <span>Customers</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5">
                  <span>Service Calls</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5">
                  <span>Quotations</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                </div>
                <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1.5">
                  <span>Invoices / Pro-Forma</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </nav>

          {/* Footer - User Info */}
          <div className="p-4 border-t border-slate-700 bg-slate-900/90">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center border border-white/30">
                <span className="text-white font-bold text-lg">
                  {user.userName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{user.userName}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
