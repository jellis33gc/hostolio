// À-la-carte module definitions. `navPaths` maps each module to the admin
// nav items/routes it gates. Modules not yet built (crm, marketing) are
// listed here so the Module Manager can show them as "coming soon" toggles
// even before there's a page behind them.
export const MODULE_DEFS = [
  {
    key: 'operations',
    label: 'Scheduling & Operations',
    description: 'Jobs, properties, customers, and the service catalog.',
    navPaths: ['/dashboard', '/jobs', '/properties', '/customers', '/services'],
    built: true,
  },
  {
    key: 'staff_management',
    label: 'Staff Management',
    description: 'Staff records, availability, leave requests, document vault.',
    navPaths: ['/staff', '/leave', '/documents'],
    built: true,
  },
  {
    key: 'invoicing',
    label: 'Invoicing',
    description: 'Generate and track customer invoices.',
    navPaths: ['/invoices'],
    built: true,
  },
  {
    key: 'customer_portal',
    label: 'Customer Portal & Disputes',
    description: 'Customer self-booking, visit history, and issue resolution.',
    navPaths: ['/disputes'],
    built: true,
  },
  {
    key: 'crm',
    label: 'CRM',
    description: 'Leads and pipeline tracking, separate from confirmed customers.',
    navPaths: [],
    built: false,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Campaigns and review-request automation.',
    navPaths: [],
    built: false,
  },
];

export const ALL_BUILT_MODULE_KEYS = MODULE_DEFS.filter((m) => m.built).map((m) => m.key);

export function moduleForPath(path) {
  return MODULE_DEFS.find((m) => m.navPaths.some((p) => path === p || path.startsWith(p + '/')));
}
