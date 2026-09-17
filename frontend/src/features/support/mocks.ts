// Mock fixtures for Technical Support Staff. No live network calls.

export type EquipmentStatus = 'Available' | 'Reserved' | 'In use' | 'Damaged' | 'Maintenance';
export type ReservationState = 'Requested' | 'Reserved' | 'Partial' | 'Fulfilled' | 'Shortfall';

export type EquipmentType = {
  id: string;
  name: string;
  totalUnits: number;
  operationalUnits: number;
  status: EquipmentStatus;
  location: string;
};

export type EquipmentRequest = {
  id: string;
  eventCode: string;
  eventTitle: string;
  eventDate: string;
  items: { typeId: string; requested: number; reserved: number }[];
  supportNeeded: boolean;
  state: ReservationState;
};

export type Technician = {
  id: string;
  name: string;
  assignments: string[];
  availableEvents: string[];
};

export const equipmentTypes: EquipmentType[] = [
  { id: 'EQ-01', name: 'Wireless microphone', totalUnits: 16, operationalUnits: 13, status: 'Available',   location: 'AV store A' },
  { id: 'EQ-02', name: 'Portable PA system',  totalUnits: 4,  operationalUnits: 3,  status: 'Available',   location: 'AV store A' },
  { id: 'EQ-03', name: 'Roving spot light',   totalUnits: 8,  operationalUnits: 6,  status: 'Available',   location: 'Stage store B' },
  { id: 'EQ-04', name: 'Projector 4K',        totalUnits: 3,  operationalUnits: 2,  status: 'Reserved',    location: 'AV store A' },
  { id: 'EQ-05', name: 'Sound desk',          totalUnits: 2,  operationalUnits: 1,  status: 'Maintenance', location: 'Stage store B' },
];

export const requests: EquipmentRequest[] = [
  {
    id: 'R-2001', eventCode: 'EVT-C01', eventTitle: 'Annual Sustainability Forum', eventDate: '2026-10-08',
    supportNeeded: true, state: 'Requested',
    items: [
      { typeId: 'EQ-01', requested: 6, reserved: 0 },
      { typeId: 'EQ-02', requested: 2, reserved: 0 },
    ],
  },
  {
    id: 'R-2002', eventCode: 'EVT-C02', eventTitle: 'Faculty Career Mixer', eventDate: '2026-09-25',
    supportNeeded: true, state: 'Partial',
    items: [
      { typeId: 'EQ-01', requested: 4, reserved: 3 },
      { typeId: 'EQ-03', requested: 3, reserved: 3 },
    ],
  },
  {
    id: 'R-2003', eventCode: 'EVT-C03', eventTitle: 'International Student Welcome', eventDate: '2026-09-20',
    supportNeeded: false, state: 'Fulfilled',
    items: [{ typeId: 'EQ-02', requested: 1, reserved: 1 }],
  },
  {
    id: 'R-2004', eventCode: 'EVT-N04', eventTitle: 'Design Studio Recital', eventDate: '2026-10-11',
    supportNeeded: true, state: 'Shortfall',
    items: [
      { typeId: 'EQ-04', requested: 2, reserved: 1 },
      { typeId: 'EQ-05', requested: 1, reserved: 0 },
    ],
  },
];

export const technicians: Technician[] = [
  { id: 'T-101', name: 'Priya Menon', assignments: ['EVT-C03'], availableEvents: ['EVT-C01', 'EVT-C02', 'EVT-N04'] },
  { id: 'T-102', name: 'Marcus Ho',   assignments: ['EVT-C02'], availableEvents: ['EVT-C01', 'EVT-N04'] },
  { id: 'T-103', name: 'Zoe Kwek',    assignments: [],           availableEvents: ['EVT-C01', 'EVT-C02', 'EVT-C03', 'EVT-N04'] },
];

export function findEquipmentType(id: string) { return equipmentTypes.find(equipment => equipment.id === id); }
export function findRequest(id: string) { return requests.find(request => request.id === id); }

export const supportSummary = {
  openRequests: requests.filter(request => request.state !== 'Fulfilled').length,
  shortfalls:   requests.filter(request => request.state === 'Shortfall' || request.state === 'Partial').length,
  offlineItems: equipmentTypes.reduce((accumulator, equipment) => accumulator + (equipment.totalUnits - equipment.operationalUnits), 0),
};
