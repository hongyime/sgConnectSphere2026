// Each role's home page and header links, in one place (ADR-017 skeleton).
// The login redirect (LoginPage) and the shared header (AppHeader) both read
// from here, so a role's landing page and its navigation cannot drift apart.
// routes.test.tsx checks that every path below is a registered route.
//
// Pure data, no page imports: LoginPage and AppHeader are themselves pages
// in the route table, so importing the table from them would be circular.

export const ROLES = [
  'attendee', 'event_organiser', 'event_coordinator', 'venue_staff', 'technical_support_staff', 'admin',
] as const;

export type Role = (typeof ROLES)[number];

export type NavItem = { to: string; label: string; end?: boolean };

export const roleLabel: Record<Role, string> = {
  attendee: 'Attendee',
  event_organiser: 'Event Organiser',
  event_coordinator: 'Event Coordinator',
  venue_staff: 'Venue Staff',
  technical_support_staff: 'Technical Support',
  admin: 'Administrator',
};

// Where sign-in sends each role. Organisers keep /events (their organisation's
// event list), which the sign-in tests rely on. Venue Staff go to the live
// inventory rather than the mock dashboard.
export const roleHome: Record<Role, string> = {
  attendee: '/attendee/events',
  event_organiser: '/events',
  event_coordinator: '/coordinator',
  venue_staff: '/venue/inventory',
  technical_support_staff: '/support',
  admin: '/admin',
};

// Header links per role. Each list must include that role's home.
export const roleNavigation: Record<Role, NavItem[]> = {
  attendee: [
    { to: '/attendee/events', label: 'My events', end: true },
    { to: '/attendee/discover', label: 'Discover' },
  ],
  event_organiser: [
    { to: '/events', label: 'Events', end: true },
    { to: '/organiser', label: 'Dashboard', end: true },
    { to: '/organiser/requests', label: 'My requests' },
    { to: '/organiser/drafts', label: 'Drafts' },
    { to: '/organiser/new-request', label: 'New request' },
  ],
  event_coordinator: [
    { to: '/coordinator', label: 'Dashboard', end: true },
    { to: '/coordinator/queue', label: 'Review queue' },
    { to: '/coordinator/reassignments', label: 'Reassignments' },
    { to: '/coordinator/venues', label: 'Venue search', end: true },
    { to: '/coordinator/calendar', label: 'Venue calendar' },
  ],
  venue_staff: [
    { to: '/venue/inventory', label: 'Inventory' },
    { to: '/venue/availability', label: 'Availability' },
    { to: '/venue/blockout', label: 'Maintenance blocks' },
    { to: '/venue', label: 'Dashboard', end: true },
  ],
  technical_support_staff: [
    { to: '/support/catalogue', label: 'Equipment catalogue' },
    { to: '/support', label: 'Dashboard', end: true },
    { to: '/support/queue', label: 'Request queue' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Users' },
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

// Unknown or missing roles fall back to the landing page rather than a page
// that would refuse them.
export function homeFor(role: unknown): string {
  return isRole(role) ? roleHome[role] : '/';
}
