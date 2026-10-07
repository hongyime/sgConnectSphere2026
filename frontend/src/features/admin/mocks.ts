// Mock fixtures for Admin. No live network calls.

export type UserRole =
  | 'attendee' | 'event_organiser' | 'event_coordinator'
  | 'venue_staff' | 'technical_support' | 'admin';

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  clientOrg: string | null;
  isActive: boolean;
  lastActive: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
};

export const users: AdminUser[] = [
  { id: 'U-01', fullName: 'Aisha Rahim',   email: 'aisha.rahim@school.edu.sg',     role: 'event_organiser',   clientOrg: 'Environmental Council', isActive: true,  lastActive: '2026-09-16 10:22' },
  { id: 'U-02', fullName: 'Ben Tay',       email: 'ben.tay@school.edu.sg',         role: 'event_organiser',   clientOrg: 'Business School',      isActive: true,  lastActive: '2026-09-15 15:22' },
  { id: 'U-03', fullName: 'Chen Xin',      email: 'chen.xin@school.edu.sg',        role: 'event_organiser',   clientOrg: 'Global Programmes',    isActive: true,  lastActive: '2026-09-16 08:44' },
  { id: 'U-04', fullName: 'Daniel Ong',    email: 'daniel.ong@school.edu.sg',      role: 'event_coordinator', clientOrg: null,                   isActive: true,  lastActive: '2026-09-16 11:03' },
  { id: 'U-05', fullName: 'Elena Fadli',   email: 'elena.fadli@school.edu.sg',     role: 'venue_staff',       clientOrg: null,                   isActive: true,  lastActive: '2026-09-16 09:11' },
  { id: 'U-06', fullName: 'Farid Iskandar',email: 'farid.iskandar@school.edu.sg',  role: 'technical_support', clientOrg: null,                   isActive: false, lastActive: '2026-08-30 17:00' },
  { id: 'U-07', fullName: 'Georgia Lim',   email: 'georgia.lim@school.edu.sg',     role: 'admin',             clientOrg: null,                   isActive: true,  lastActive: '2026-09-16 07:50' },
];

export const auditLog: AuditEntry[] = [
  { id: 'A-1', at: '2026-09-16 12:19', actor: 'Bryan',        action: 'PR merged',      entity: 'PR #33',    detail: 'Frontend branding alignment.' },
  { id: 'A-2', at: '2026-09-16 09:40', actor: 'Daniel Ong',   action: 'Review opened',  entity: 'EVT-C01',   detail: 'Annual Sustainability Forum.' },
  { id: 'A-3', at: '2026-09-16 08:22', actor: 'System',       action: 'Session revoked',entity: 'U-06',      detail: 'Farid Iskandar deactivated by admin.' },
  { id: 'A-4', at: '2026-09-15 15:22', actor: 'Ben Tay',      action: 'Request approved', entity: 'EVT-C02', detail: 'Faculty Career Mixer.' },
  { id: 'A-5', at: '2026-09-14 11:00', actor: 'Daniel Ong',   action: 'Request approved', entity: 'EVT-C03', detail: 'International Student Welcome.' },
];

export function findUser(id: string) { return users.find(user => user.id === id); }

export const adminSummary = {
  activeUsers: users.filter(user => user.isActive).length,
  totalUsers:  users.length,
  auditEntries: auditLog.length,
};
