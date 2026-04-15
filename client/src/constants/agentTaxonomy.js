/**
 * @file agentTaxonomy.js
 * @description Client-side category and skill catalog for agent registration and filtering.
 */

const STARTER_AGENT_CATEGORY_SKILLS = {
  Mechanical: [
    'Diesel Mechanic',
    'Petrol Mechanic',
    '4 Stroke Engines',
    '2 Stroke Engines',
    'Automotive Mechanic',
    'Plant and Machinery Mechanic',
  ],
  Electrical: [
    "220V Single Phase Wireman's License",
    "380V Three Phase Wireman's License",
    'Electrical Magnetic Induction Motors',
    'Solar Power Systems',
    'A/C Power Systems',
    'D/C Power Systems',
  ],
  Plumbing: [
    'Water Reticulation Systems',
    'Pressure Pumps',
    'Borehole Pumps',
    'Heat Pumps',
    'Copper Pipe Installation, Leak Detection and Repair',
    'Galvanized Pipe Installation, Leak Detection and Repair',
    'HDPE Pipe Installation, Leak Detection and Repair',
    'Polycop Pipe Installation, Leak Detection and Repair',
    'Polypropylene Pipe Installation, Leak Detection and Repair',
    'Tap Installation, Maintenance and Repairs',
    'Cold Water Storage (JoJo Tanks / Dams)',
    'Hot Water Storage (Gas Geysers)',
    'Hot Water Storage (Solar Geysers)',
    'Hot Water Storage (Electrical Geysers)',
    'Storm Water Drainage, Storage and Distribution',
    'Sewerage System Installation, Maintenance and Repairs',
  ],
  'General Maintenance': [
    'Handyman Tasks',
    'Picture Hanging',
    'Curtain Rail Installation',
    'Shelving Installation',
    'General Property Repairs',
  ],
  'Fencing Solutions': [
    'Fencing Installation',
    'Fencing Maintenance and Repairs',
    'Motorized Gate Manufacturing',
    'Motorized Gate Installation',
  ],
  'CCTV and Security Solutions': [
    'CCTV Installation and Repairs',
    'Security System Maintenance',
    'Access Control Systems',
  ],
  'HVAC and Refrigeration Solutions': [
    'HVAC Systems',
    'Refrigeration Systems',
    'Air Conditioning Systems',
    'Cold Room Systems',
  ],
  'Appliance Repairs': [
    'Appliance Diagnostics',
    'Appliance Maintenance',
    'Appliance Repairs',
  ],
};

const ALL_STARTER_SKILLS = [...new Set(Object.values(STARTER_AGENT_CATEGORY_SKILLS).flat())];

const LEGACY_AGENT_CATEGORY_SKILLS = {
  'Mechanical Repairs': STARTER_AGENT_CATEGORY_SKILLS.Mechanical,
  HVAC: STARTER_AGENT_CATEGORY_SKILLS['HVAC and Refrigeration Solutions'],
  'Security Systems': STARTER_AGENT_CATEGORY_SKILLS['CCTV and Security Solutions'],
  'Electrical Appliance Repairs': STARTER_AGENT_CATEGORY_SKILLS['Appliance Repairs'],
  Electronic: ['Control Panels', 'ECUs', 'Screens'],
  'Electronic Appliance Repairs': ['TVs', 'PCs', 'Arduino-Based Boards'],
  'Pools and Jacuzzis': [
    'Pool Construction',
    'Pool Maintenance and Repair',
    'Leak Sealing',
    'Pool Pump Maintenance',
    'Pool Pump Installation',
  ],
  'Multi-Disciplinary': ALL_STARTER_SKILLS,
};

export const AGENT_CATEGORY_SKILLS = {
  ...STARTER_AGENT_CATEGORY_SKILLS,
  ...LEGACY_AGENT_CATEGORY_SKILLS,
};

export const VISIBLE_AGENT_CATEGORIES = [
  ...Object.keys(STARTER_AGENT_CATEGORY_SKILLS),
  'Multi-Disciplinary',
];
export const AGENT_CATEGORIES = Object.keys(AGENT_CATEGORY_SKILLS);
export const DEFAULT_AGENT_CATEGORY = 'Mechanical';

export const getAllowedSkillsForCategory = (category) => {
  if (!category || !AGENT_CATEGORY_SKILLS[category]) return [];
  return [...new Set(AGENT_CATEGORY_SKILLS[category])];
};
