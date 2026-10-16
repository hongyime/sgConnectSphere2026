export const USER_ROLES = [
  'event_organiser',
  'event_coordinator',
  'event_coordinator_lead',
  'safety_officer',
  'venue_staff',
  'technical_support_staff',
  'attendee',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}
