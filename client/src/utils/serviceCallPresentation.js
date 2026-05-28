const STATUS_CLASS_MAP = {
 completed: 'bg-green-500/30 text-green-100 border border-green-400/50',
 'in-progress': 'bg-blue-500/30 text-blue-100 border border-blue-400/50',
 'awaiting-quote-approval': 'bg-purple-500/30 text-purple-100 border border-purple-400/50',
 invoiced: 'bg-teal-500/30 text-teal-100 border border-teal-400/50',
 assigned: 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/50',
 scheduled: 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/50',
 open: 'bg-gray-500/30 text-gray-100 border border-gray-400/50',
};

const PRIORITY_CLASS_MAP = {
 high: 'text-red-200',
 medium: 'text-yellow-200',
 low: 'text-green-200',
};

const DEFAULT_STATUS_CLASS = 'bg-gray-500/30 text-gray-100 border border-gray-400/50';
const DEFAULT_PRIORITY_CLASS = 'text-gray-200';

export const getServiceCallStatusClass = (status) => STATUS_CLASS_MAP[status] || DEFAULT_STATUS_CLASS;

export const getServiceCallPriorityClass = (priority) => PRIORITY_CLASS_MAP[priority] || DEFAULT_PRIORITY_CLASS;

export const filterServiceCallsByTab = ({
 activeTab,
 serviceCalls,
 tabStatusMap = {},
 tabDataMap = {},
}) => {
 if (tabDataMap[activeTab]) {
  return tabDataMap[activeTab];
 }

 const tabStatuses = tabStatusMap[activeTab];
 if (!tabStatuses || tabStatuses.length === 0) {
  return serviceCalls;
 }

 return serviceCalls.filter((call) => tabStatuses.includes(call.status));
};

export const buildServiceCallStats = ({
 serviceCalls,
 statStatusMap = {},
 extraCounts = {},
}) => {
 const stats = {
  total: serviceCalls.length,
 };

 Object.entries(statStatusMap).forEach(([key, statuses]) => {
  stats[key] = serviceCalls.filter((call) => statuses.includes(call.status)).length;
 });

 return {
  ...stats,
  ...extraCounts,
 };
};
