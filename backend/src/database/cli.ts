import { hashPassword } from '../modules/accessControl/passwords.js';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, '..', '..');
const migrationsDir = join(backendRoot, 'database', 'migrations');

const seedCredential = 'ValidPass123';

const managedTables = [
  'auth_sessions',
  'event_publications',
  'audit_logs',
  'notification_deliveries',
  'notifications',
  'change_requests',
  'event_threads',
  'event_attendance',
  'event_registrations',
  'tech_staff_assignments',
  'tech_support_requests',
  'equipment_reservations',
  'equipment_requests',
  'equipment_unavailability',
  'equipment',
  'venue_blocks',
  'venue_bookings',
  'event_facility_needs',
  'event_accessibility_needs',
  'events',
  'venue_facilities',
  'facilities',
  'venue_accessibility_features',
  'accessibility_features',
  'venue_supported_layouts',
  'venues',
  'room_layouts',
  'password_reset_tokens',
  'users',
  'client_organisations',
];

type SeedUser = {
  key: string;
  email: string;
  role: string;
  fullName: string;
  contactNumber: string;
  clientOrg?: 'clientA' | 'clientB';
};

type SeedEvent = {
  code: string;
  title: string;
  organiserKey: string;
  coordinatorKey: string;
  clientOrg: 'clientA' | 'clientB';
  status: string;
  range: string;
  expectedAttendance: number;
  layoutCode: 'theatre' | 'banquet' | 'boardroom';
};

const organisations = [
  {
    key: 'clientA',
    id: stableUuid('client-organisation:Client A'),
    name: 'Client A',
    contactEmail: 'events@clienta.com',
  },
  {
    key: 'clientB',
    id: stableUuid('client-organisation:Client B'),
    name: 'Client B',
    contactEmail: 'events@clientb.com',
  },
] as const;

const users: SeedUser[] = [
  {
    key: 'organiserA',
    email: 'organiser_a@clienta.com',
    role: 'event_organiser',
    fullName: 'Organiser A',
    contactNumber: '+65 9100 0001',
    clientOrg: 'clientA',
  },
  {
    key: 'organiserB',
    email: 'organiser_b@clienta.com',
    role: 'event_organiser',
    fullName: 'Organiser B',
    contactNumber: '+65 9100 0002',
    clientOrg: 'clientA',
  },
  {
    key: 'organiserC',
    email: 'organiser_c@clientb.com',
    role: 'event_organiser',
    fullName: 'Organiser C',
    contactNumber: '+65 9100 0003',
    clientOrg: 'clientB',
  },
  {
    key: 'coordA',
    email: 'coord_a@connectsphere.com',
    role: 'event_coordinator',
    fullName: 'Coordinator A',
    contactNumber: '+65 9200 0001',
  },
  {
    key: 'coordB',
    email: 'coord_b@connectsphere.com',
    role: 'event_coordinator',
    fullName: 'Coordinator B',
    contactNumber: '+65 9200 0002',
  },
  {
    key: 'venueA',
    email: 'venue_a@connectsphere.com',
    role: 'venue_staff',
    fullName: 'Venue Staff A',
    contactNumber: '+65 9300 0001',
  },
  {
    key: 'venueB',
    email: 'venue_b@connectsphere.com',
    role: 'venue_staff',
    fullName: 'Venue Staff B',
    contactNumber: '+65 9300 0002',
  },
  {
    key: 'techA',
    email: 'tech_a@connectsphere.com',
    role: 'technical_support_staff',
    fullName: 'Technical Support A',
    contactNumber: '+65 9400 0001',
  },
  {
    key: 'techB',
    email: 'tech_b@connectsphere.com',
    role: 'technical_support_staff',
    fullName: 'Technical Support B',
    contactNumber: '+65 9400 0002',
  },
  {
    key: 'attendeeA',
    email: 'attendee_a@example.com',
    role: 'attendee',
    fullName: 'Attendee A',
    contactNumber: '+65 9500 0001',
  },
  {
    key: 'attendeeB',
    email: 'attendee_b@example.com',
    role: 'attendee',
    fullName: 'Attendee B',
    contactNumber: '+65 9500 0002',
  },
  {
    key: 'attendeeI',
    email: 'attendee_i@example.com',
    role: 'attendee',
    fullName: 'Attendee I',
    contactNumber: '+65 9500 0009',
  },
  {
    key: 'attendeeJ',
    email: 'attendee_j@example.com',
    role: 'attendee',
    fullName: 'Attendee J',
    contactNumber: '+65 9500 0010',
  },
];

const layouts = [
  { code: 'theatre', label: 'Theatre' },
  { code: 'banquet', label: 'Banquet' },
  { code: 'boardroom', label: 'Boardroom' },
] as const;

const venues = [
  {
    key: 'orchidHall',
    name: 'Orchid Hall',
    location: 'Main Campus Level 3',
    maxCapacity: 200,
    opensAt: '08:00',
    closesAt: '22:00',
    layouts: [
      { code: 'theatre', capacity: 120 },
      { code: 'banquet', capacity: 80 },
    ],
  },
  {
    key: 'lotusRoom',
    name: 'Lotus Room',
    location: 'Main Campus Level 2',
    maxCapacity: 50,
    opensAt: '08:00',
    closesAt: '22:00',
    layouts: [{ code: 'boardroom', capacity: 40 }],
  },
  {
    key: 'jasmineHall',
    name: 'Jasmine Hall',
    location: 'East Wing Level 1',
    maxCapacity: 300,
    opensAt: '07:00',
    closesAt: '23:00',
    layouts: [
      { code: 'theatre', capacity: 200 },
      { code: 'banquet', capacity: 150 },
    ],
  },
  {
    key: 'mapleRoom',
    name: 'Maple Room',
    location: 'West Wing Level 4',
    maxCapacity: 30,
    opensAt: '09:00',
    closesAt: '18:00',
    layouts: [{ code: 'boardroom', capacity: 25 }],
  },
  {
    key: 'cedarAuditorium',
    name: 'Cedar Auditorium',
    location: 'Main Campus Level 1',
    maxCapacity: 500,
    opensAt: '08:00',
    closesAt: '22:00',
    layouts: [
      { code: 'theatre', capacity: 450 },
      { code: 'banquet', capacity: 250 },
    ],
  },
] as const;

const equipment = [
  {
    name: 'Projector-HD',
    category: 'Projection',
    description: 'HD projector used for venue AV setup.',
    totalQuantity: 10,
    homeLocation: 'AV Store',
  },
  {
    name: 'Microphone-Wireless',
    category: 'Audio',
    description: 'Wireless handheld microphone.',
    totalQuantity: 6,
    homeLocation: 'AV Store',
  },
] as const;

const events: SeedEvent[] = [
  {
    code: 'EVT-101',
    title: 'EVT-101 Client A Planning Event',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'submitted',
    range: '[2026-10-05 09:00+08,2026-10-05 12:00+08)',
    expectedAttendance: 80,
    layoutCode: 'theatre',
  },
  {
    code: 'EVT-2001',
    title: 'EVT-2001 Confirmed Registration Event',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'confirmed',
    range: '[2026-10-06 09:00+08,2026-10-06 12:00+08)',
    expectedAttendance: 120,
    layoutCode: 'theatre',
  },
  {
    code: 'EVT-2002',
    title: 'EVT-2002 Waitlist Event',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'confirmed',
    range: '[2026-10-07 09:00+08,2026-10-07 12:00+08)',
    expectedAttendance: 40,
    layoutCode: 'boardroom',
  },
  {
    code: 'EVT-2003',
    title: 'EVT-2003 Client B Isolation Event',
    organiserKey: 'organiserC',
    coordinatorKey: 'coordB',
    clientOrg: 'clientB',
    status: 'under_review',
    range: '[2026-10-08 09:00+08,2026-10-08 12:00+08)',
    expectedAttendance: 40,
    layoutCode: 'boardroom',
  },
  {
    code: 'EVT-2004',
    title: 'EVT-2004 Completed Attendance Event',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'completed',
    range: '[2026-09-30 09:00+08,2026-09-30 12:00+08)',
    expectedAttendance: 80,
    layoutCode: 'banquet',
  },
  {
    code: 'EVT-3001',
    title: 'EVT-3001 Approved Annual Conference',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'approved',
    range: '[2026-10-15 09:00+08,2026-10-15 17:00+08)',
    expectedAttendance: 150,
    layoutCode: 'theatre',
  },
  {
    code: 'EVT-3002',
    title: 'EVT-3002 Awaiting Clarification Workshop',
    organiserKey: 'organiserB',
    coordinatorKey: 'coordB',
    clientOrg: 'clientA',
    status: 'awaiting_clarification',
    range: '[2026-10-20 14:00+08,2026-10-20 17:00+08)',
    expectedAttendance: 30,
    layoutCode: 'boardroom',
  },
  {
    code: 'EVT-3003',
    title: 'EVT-3003 Planning Phase Gala',
    organiserKey: 'organiserA',
    coordinatorKey: 'coordA',
    clientOrg: 'clientA',
    status: 'planning',
    range: '[2026-10-25 18:00+08,2026-10-25 22:00+08)',
    expectedAttendance: 200,
    layoutCode: 'banquet',
  },
  {
    code: 'EVT-3004',
    title: 'EVT-3004 Draft Team Retreat',
    organiserKey: 'organiserC',
    coordinatorKey: '',
    clientOrg: 'clientB',
    status: 'draft',
    range: '[2026-11-01 09:00+08,2026-11-01 17:00+08)',
    expectedAttendance: 25,
    layoutCode: 'boardroom',
  },
  {
    code: 'EVT-3005',
    title: 'EVT-3005 Rejected Budget Review',
    organiserKey: 'organiserB',
    coordinatorKey: 'coordB',
    clientOrg: 'clientA',
    status: 'rejected',
    range: '[2026-10-10 10:00+08,2026-10-10 12:00+08)',
    expectedAttendance: 50,
    layoutCode: 'theatre',
  },
];

async function main() {
  const command = process.argv[2];

  if (!command || !['migrate', 'reset', 'seed', 'validate'].includes(command)) {
    throw new Error('Usage: npm run db:<migrate|reset|seed:test|validate> --workspace backend');
  }

  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();

  try {
    if (command === 'migrate') {
      await migrate(client);
    } else if (command === 'reset') {
      assertResetAllowed();
      await resetDatabase(client);
      await migrate(client);
      await seed(client);
    } else if (command === 'seed') {
      assertResetAllowed();
      await truncateManagedTables(client);
      await seed(client);
    } else {
      await validateConstraints(client);
    }
  } finally {
    await client.end();
  }
}

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Refusing to touch an unknown database.');
  }

  return databaseUrl;
}

function assertResetAllowed() {
  const databaseUrl = requireDatabaseUrl();

  if (isSafeResetTarget(databaseUrl) || process.env.ALLOW_DATABASE_RESET === 'I_UNDERSTAND') {
    return;
  }

  throw new Error(
    'Refusing to reset or seed a non-local/non-test database. ' +
      'Use a local/test DATABASE_URL or set ALLOW_DATABASE_RESET=I_UNDERSTAND intentionally.',
  );
}

function isSafeResetTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, '').toLowerCase();
  const host = parsed.hostname.toLowerCase();

  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    databaseName.includes('test') ||
    databaseName.includes('dev')
  );
}

async function migrate(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _connectsphere_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = await client.query<{ name: string }>(
    'SELECT name FROM _connectsphere_migrations',
  );
  const appliedNames = new Set(applied.rows.map((row) => row.name));
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (appliedNames.has(file)) {
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _connectsphere_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}

async function resetDatabase(client: Client) {
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  await client.query('GRANT USAGE ON SCHEMA public TO public');
  await client.query('GRANT CREATE ON SCHEMA public TO public');
}

async function truncateManagedTables(client: Client) {
  const existingTables = await client.query<{ table_name: string }>(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name = ANY($1)
    `,
    [managedTables],
  );

  if (existingTables.rowCount === 0) {
    throw new Error('No managed tables found. Run db:migrate before db:seed:test.');
  }

  await client.query(`TRUNCATE TABLE ${managedTables.join(', ')} RESTART IDENTITY CASCADE`);
}

async function seed(client: Client) {
  const orgIds = new Map(organisations.map((org) => [org.key, org.id]));
  const userIds = new Map(users.map((user) => [user.key, stableUuid(`user:${user.email}`)]));
  const layoutIds = new Map(layouts.map((layout) => [layout.code, stableUuid(`layout:${layout.code}`)]));
  const venueIds = new Map(venues.map((venue) => [venue.key, stableUuid(`venue:${venue.name}`)]));
  const eventIds = new Map(events.map((event) => [event.code, stableUuid(`event:${event.code}`)]));

  await inTransaction(client, async () => {
    for (const org of organisations) {
      await client.query(
        `
          INSERT INTO client_organisations (id, name, contact_email, is_active)
          VALUES ($1, $2, $3, true)
        `,
        [org.id, org.name, org.contactEmail],
      );
    }

    for (const user of users) {
      await client.query(
        `
          INSERT INTO users (
            id, client_org_id, email, password_hash, full_name, role, contact_number, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6::user_role, $7, true)
        `,
        [
          userIds.get(user.key),
          user.clientOrg ? orgIds.get(user.clientOrg) : null,
          user.email,
          await hashPassword(seedCredential),
          user.fullName,
          user.role,
          user.contactNumber,
        ],
      );
    }

    for (const layout of layouts) {
      await client.query('INSERT INTO room_layouts (id, code, label) VALUES ($1, $2, $3)', [
        layoutIds.get(layout.code),
        layout.code,
        layout.label,
      ]);
    }

    for (const venue of venues) {
      await client.query(
        `
          INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
        `,
        [
          venueIds.get(venue.key),
          venue.name,
          venue.location,
          venue.maxCapacity,
          venue.opensAt,
          venue.closesAt,
        ],
      );

      for (const layout of venue.layouts) {
        await client.query(
          `
            INSERT INTO venue_supported_layouts (venue_id, layout_id, capacity)
            VALUES ($1, $2, $3)
          `,
          [venueIds.get(venue.key), layoutIds.get(layout.code), layout.capacity],
        );
      }
    }

    for (const item of equipment) {
      await client.query(
        `
          INSERT INTO equipment (
            id, name, category, description, operational_status, total_quantity, home_location, is_active
          )
          VALUES ($1, $2, $3, $4, 'available', $5, $6, true)
        `,
        [
          stableUuid(`equipment:${item.name}`),
          item.name,
          item.category,
          item.description,
          item.totalQuantity,
          item.homeLocation,
        ],
      );
    }

    for (const event of events) {
      await client.query(
        `
          INSERT INTO events (
            id, event_code, organiser_id, coordinator_id, client_org_id, title, description,
            purpose, status, registration_enabled, waitlist_enabled, registration_opens_at,
            registration_closes_at, withdrawal_deadline, event_range, expected_attendance,
            layout_id, accessibility_note
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9::event_status, true, true,
            lower($10::tstzrange) - interval '14 days',
            lower($10::tstzrange) - interval '1 day',
            lower($10::tstzrange) - interval '1 day',
            $10::tstzrange, $11, $12, $13
          )
        `,
        [
          eventIds.get(event.code),
          event.code,
          userIds.get(event.organiserKey),
          event.coordinatorKey ? userIds.get(event.coordinatorKey) : null,
          orgIds.get(event.clientOrg),
          event.title,
          `${event.code} seeded from SEED_DATA.md.`,
          'Seeded test event for verification scenarios.',
          event.status,
          event.range,
          event.expectedAttendance,
          layoutIds.get(event.layoutCode),
          null,
        ],
      );
    }

    // Venue bookings for E05-S03 calendar demo
    const bookings = [
      { venueKey: 'orchidHall', eventCode: 'EVT-2001', range: '[2026-10-06 09:00+08,2026-10-06 12:00+08)', status: 'confirmed' },
      { venueKey: 'orchidHall', eventCode: 'EVT-3003', range: '[2026-10-25 18:00+08,2026-10-25 22:00+08)', status: 'pending' },
      { venueKey: 'lotusRoom', eventCode: 'EVT-2002', range: '[2026-10-07 09:00+08,2026-10-07 12:00+08)', status: 'confirmed' },
      { venueKey: 'lotusRoom', eventCode: 'EVT-2003', range: '[2026-10-08 09:00+08,2026-10-08 12:00+08)', status: 'pending' },
      { venueKey: 'jasmineHall', eventCode: 'EVT-3001', range: '[2026-10-15 09:00+08,2026-10-15 17:00+08)', status: 'confirmed' },
    ];

    for (const booking of bookings) {
      await client.query(
        `
          INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status)
          VALUES ($1, $2, $3, $4::tstzrange, $5::booking_status)
        `,
        [
          stableUuid(`booking:${booking.venueKey}:${booking.eventCode}`),
          venueIds.get(booking.venueKey),
          eventIds.get(booking.eventCode),
          booking.range,
          booking.status,
        ],
      );
    }

    // Venue blocks for E05-S04 maintenance demo
    const blocks = [
      { venueKey: 'mapleRoom', range: '[2026-10-12 00:00+08,2026-10-14 00:00+08)', reason: 'Scheduled HVAC maintenance' },
      { venueKey: 'cedarAuditorium', range: '[2026-10-22 08:00+08,2026-10-22 18:00+08)', reason: 'Annual fire safety inspection' },
    ];

    for (const block of blocks) {
      await client.query(
        `
          INSERT INTO venue_blocks (id, venue_id, block_range, reason, created_by)
          VALUES ($1, $2, $3::tstzrange, $4, $5)
        `,
        [
          stableUuid(`block:${block.venueKey}:${block.reason}`),
          venueIds.get(block.venueKey),
          block.range,
          block.reason,
          userIds.get('venueA'),
        ],
      );
    }

    // Accessibility features (predefined vocabulary per T-13)
    const accessibilityFeatures = [
      { code: 'wheelchair_access', label: 'Wheelchair access' },
      { code: 'hearing_loop', label: 'Hearing loop' },
      { code: 'quiet_room', label: 'Quiet room' },
      { code: 'accessible_parking', label: 'Accessible parking' },
      { code: 'sign_language', label: 'Sign language interpreter' },
    ];
    const featureIds = new Map<string, string>();
    for (const feat of accessibilityFeatures) {
      const id = stableUuid(`accessibility:${feat.code}`);
      featureIds.set(feat.code, id);
      await client.query(
        'INSERT INTO accessibility_features (id, code, label) VALUES ($1, $2, $3)',
        [id, feat.code, feat.label],
      );
    }

    // Facilities (predefined vocabulary)
    const facilitiesList = [
      { code: 'projector', label: 'Projector' },
      { code: 'whiteboard', label: 'Whiteboard' },
      { code: 'video_conferencing', label: 'Video conferencing' },
      { code: 'pa_system', label: 'PA system' },
      { code: 'kitchen_access', label: 'Kitchen access' },
    ];
    const facilityIds = new Map<string, string>();
    for (const fac of facilitiesList) {
      const id = stableUuid(`facility:${fac.code}`);
      facilityIds.set(fac.code, id);
      await client.query(
        'INSERT INTO facilities (id, code, label) VALUES ($1, $2, $3)',
        [id, fac.code, fac.label],
      );
    }

    // Link accessibility features to venues
    const venueFeatures = [
      { venueKey: 'orchidHall', features: ['wheelchair_access', 'hearing_loop', 'accessible_parking'] },
      { venueKey: 'lotusRoom', features: ['wheelchair_access', 'quiet_room'] },
      { venueKey: 'jasmineHall', features: ['wheelchair_access', 'hearing_loop', 'accessible_parking', 'sign_language'] },
      { venueKey: 'mapleRoom', features: ['wheelchair_access'] },
      { venueKey: 'cedarAuditorium', features: ['wheelchair_access', 'hearing_loop', 'accessible_parking', 'quiet_room', 'sign_language'] },
    ];
    for (const vf of venueFeatures) {
      for (const code of vf.features) {
        await client.query(
          'INSERT INTO venue_accessibility_features (venue_id, feature_id) VALUES ($1, $2)',
          [venueIds.get(vf.venueKey), featureIds.get(code)],
        );
      }
    }

    // Link facilities to venues
    const venueFacilities = [
      { venueKey: 'orchidHall', facilities: ['projector', 'pa_system', 'video_conferencing'] },
      { venueKey: 'lotusRoom', facilities: ['whiteboard', 'video_conferencing'] },
      { venueKey: 'jasmineHall', facilities: ['projector', 'pa_system', 'kitchen_access', 'video_conferencing'] },
      { venueKey: 'mapleRoom', facilities: ['whiteboard'] },
      { venueKey: 'cedarAuditorium', facilities: ['projector', 'pa_system', 'video_conferencing', 'kitchen_access', 'whiteboard'] },
    ];
    for (const vfac of venueFacilities) {
      for (const code of vfac.facilities) {
        await client.query(
          'INSERT INTO venue_facilities (venue_id, facility_id) VALUES ($1, $2)',
          [venueIds.get(vfac.venueKey), facilityIds.get(code)],
        );
      }
    }

    // Event threads — comments and clarifications for E03-S02/S06
    const threads = [
      { eventCode: 'EVT-2003', authorKey: 'coordB', type: 'clarification_request', body: 'Could you clarify the expected number of VIP guests? This affects the seating arrangement.' },
      { eventCode: 'EVT-2003', authorKey: 'organiserC', type: 'clarification_response', body: 'We expect around 5 VIP guests who will need reserved front-row seating.' },
      { eventCode: 'EVT-3002', authorKey: 'coordB', type: 'clarification_request', body: 'The workshop description mentions "hands-on stations" but no equipment was requested. Do you need lab equipment?' },
      { eventCode: 'EVT-2001', authorKey: 'coordA', type: 'comment', body: 'Venue confirmed. Catering has been arranged for 120 pax.' },
      { eventCode: 'EVT-2001', authorKey: 'organiserA', type: 'comment', body: 'Thank you. Please ensure vegetarian options are available for approximately 20% of attendees.' },
      { eventCode: 'EVT-3001', authorKey: 'coordA', type: 'comment', body: 'Budget approved. Moving to venue booking phase.' },
    ];
    for (const thread of threads) {
      await client.query(
        `INSERT INTO event_threads (id, event_id, author_id, type, body) VALUES ($1, $2, $3, $4::thread_type, $5)`,
        [
          stableUuid(`thread:${thread.eventCode}:${thread.body.slice(0, 30)}`),
          eventIds.get(thread.eventCode),
          userIds.get(thread.authorKey),
          thread.type,
          thread.body,
        ],
      );
    }

    // Event registrations for E09 (Sprint 4 but seed now for forward-looking demo)
    const registrations = [
      { eventCode: 'EVT-2001', attendeeKey: 'attendeeA', status: 'registered' },
      { eventCode: 'EVT-2001', attendeeKey: 'attendeeB', status: 'registered' },
      { eventCode: 'EVT-2001', attendeeKey: 'attendeeI', status: 'waitlisted' },
      { eventCode: 'EVT-2002', attendeeKey: 'attendeeA', status: 'registered' },
      { eventCode: 'EVT-2002', attendeeKey: 'attendeeJ', status: 'registered' },
      { eventCode: 'EVT-2004', attendeeKey: 'attendeeA', status: 'registered' },
      { eventCode: 'EVT-2004', attendeeKey: 'attendeeB', status: 'withdrawn' },
      { eventCode: 'EVT-3001', attendeeKey: 'attendeeI', status: 'registered' },
    ];
    for (const reg of registrations) {
      await client.query(
        `INSERT INTO event_registrations (id, event_id, attendee_id, status) VALUES ($1, $2, $3, $4::registration_status)`,
        [
          stableUuid(`reg:${reg.eventCode}:${reg.attendeeKey}`),
          eventIds.get(reg.eventCode),
          userIds.get(reg.attendeeKey),
          reg.status,
        ],
      );
    }

    // Audit log entries for E14-S02 demo
    const auditEntries = [
      { actorKey: 'organiserA', action: 'Status changed to submitted', entityType: 'event', entityId: 'EVT-101', field: 'status', oldVal: 'draft', newVal: 'submitted' },
      { actorKey: 'coordA', action: 'Status changed to under_review', entityType: 'event', entityId: 'EVT-101', field: 'status', oldVal: 'submitted', newVal: 'under_review' },
      { actorKey: 'coordA', action: 'Status changed to approved', entityType: 'event', entityId: 'EVT-3001', field: 'status', oldVal: 'under_review', newVal: 'approved' },
      { actorKey: 'coordB', action: 'Status changed to awaiting_clarification', entityType: 'event', entityId: 'EVT-3002', field: 'status', oldVal: 'under_review', newVal: 'awaiting_clarification' },
      { actorKey: 'coordB', action: 'Status changed to rejected', entityType: 'event', entityId: 'EVT-3005', field: 'status', oldVal: 'under_review', newVal: 'rejected' },
      { actorKey: 'coordA', action: 'Status changed to planning', entityType: 'event', entityId: 'EVT-3003', field: 'status', oldVal: 'approved', newVal: 'planning' },
      { actorKey: 'coordA', action: 'Status changed to confirmed', entityType: 'event', entityId: 'EVT-2001', field: 'status', oldVal: 'planning', newVal: 'confirmed' },
      { actorKey: 'coordA', action: 'Status changed to completed', entityType: 'event', entityId: 'EVT-2004', field: 'status', oldVal: 'confirmed', newVal: 'completed' },
      { actorKey: 'attendeeI', action: 'Access Denied', entityType: 'event', entityId: 'EVT-2003', field: null, oldVal: null, newVal: null },
      { actorKey: 'organiserA', action: 'Account Deactivated', entityType: 'user', entityId: null, field: null, oldVal: null, newVal: null },
    ];
    for (const entry of auditEntries) {
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, field_changed, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          stableUuid(`audit:${entry.action}:${entry.entityId ?? 'self'}:${entry.actorKey}`),
          userIds.get(entry.actorKey),
          entry.action,
          entry.entityType,
          entry.entityId ? eventIds.get(entry.entityId) : userIds.get(entry.actorKey),
          entry.field,
          entry.oldVal,
          entry.newVal,
        ],
      );
    }

    // Notifications for E11-S01 demo
    const notificationEntries = [
      { userKey: 'coordA', eventCode: 'EVT-101', title: 'New event assigned', message: 'You have been assigned to EVT-101 Client A Planning Event.' },
      { userKey: 'organiserA', eventCode: 'EVT-3001', title: 'Event approved', message: 'Your event EVT-3001 Annual Conference has been approved.' },
      { userKey: 'organiserC', eventCode: 'EVT-2003', title: 'Clarification requested', message: 'The coordinator has requested clarification on your event EVT-2003.' },
      { userKey: 'organiserB', eventCode: 'EVT-3005', title: 'Event rejected', message: 'Your event EVT-3005 Budget Review has been rejected. Reason: insufficient justification.' },
      { userKey: 'coordA', eventCode: 'EVT-2001', title: 'New comment', message: 'Organiser A commented on EVT-2001: Please ensure vegetarian options.' },
      { userKey: 'attendeeA', eventCode: 'EVT-2001', title: 'Registration confirmed', message: 'You are registered for EVT-2001 Confirmed Registration Event.' },
      { userKey: 'attendeeI', eventCode: 'EVT-2001', title: 'Waitlisted', message: 'You have been added to the waiting list for EVT-2001.' },
      { userKey: 'coordA', eventCode: 'EVT-3003', title: 'Venue blocked', message: 'Maple Room is blocked for maintenance 12-14 Oct. Check affected events.' },
    ];
    for (const notif of notificationEntries) {
      await client.query(
        `INSERT INTO notifications (id, user_id, event_id, title, message, is_read) VALUES ($1, $2, $3, $4, $5, false)`,
        [
          stableUuid(`notif:${notif.userKey}:${notif.title}`),
          userIds.get(notif.userKey),
          eventIds.get(notif.eventCode),
          notif.title,
          notif.message,
        ],
      );
    }
  });

  console.log(`seeded ${organisations.length} organisations`);
  console.log(`seeded ${users.length} users`);
  console.log(`seeded ${venues.length} venues`);
  console.log(`seeded ${equipment.length} equipment items`);
  console.log(`seeded ${events.length} events`);
  console.log('seeded 5 accessibility features');
  console.log('seeded 5 facilities');
  console.log('seeded 6 event threads');
  console.log('seeded 8 registrations');
  console.log('seeded 10 audit log entries');
  console.log('seeded 8 notifications');
}

async function validateConstraints(client: Client) {
  await migrate(client);
  await truncateManagedTables(client);
  await seed(client);

  const ids = await fetchValidationIds(client);

  await expectDatabaseRejection(
    'venue booking overlap exclusion',
    async () => {
      await client.query('BEGIN');
      try {
        await client.query(
          `
            INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
            VALUES ($1, $2, $3::tstzrange, 'pending')
          `,
          [ids.venueId, ids.eventOneId, '[2026-11-01 09:00+08,2026-11-01 12:00+08)'],
        );
        await client.query(
          `
            INSERT INTO venue_bookings (venue_id, event_id, booking_range, status)
            VALUES ($1, $2, $3::tstzrange, 'confirmed')
          `,
          [ids.venueId, ids.eventTwoId, '[2026-11-01 10:00+08,2026-11-01 13:00+08)'],
        );
      } finally {
        await client.query('ROLLBACK');
      }
    },
    '23P01',
  );

  await expectDatabaseRejection(
    'tech staff assignment overlap exclusion',
    async () => {
      await client.query('BEGIN');
      try {
        const requestOne = stableUuid('validation:tech-request:one');
        const requestTwo = stableUuid('validation:tech-request:two');

        await client.query(
          `
            INSERT INTO tech_support_requests (
              id, event_id, support_required, support_description, support_range, status, requested_by
            )
            VALUES ($1, $2, true, 'Validation support', $3::tstzrange, 'open', $4)
          `,
          [
            requestOne,
            ids.eventOneId,
            '[2026-11-02 09:00+08,2026-11-02 12:00+08)',
            ids.organiserId,
          ],
        );
        await client.query(
          `
            INSERT INTO tech_support_requests (
              id, event_id, support_required, support_description, support_range, status, requested_by
            )
            VALUES ($1, $2, true, 'Validation support', $3::tstzrange, 'open', $4)
          `,
          [
            requestTwo,
            ids.eventTwoId,
            '[2026-11-02 10:00+08,2026-11-02 13:00+08)',
            ids.organiserId,
          ],
        );
        await client.query(
          `
            INSERT INTO tech_staff_assignments (
              request_id, event_id, staff_id, assignment_range, status
            )
            VALUES ($1, $2, $3, $4::tstzrange, 'assigned')
          `,
          [
            requestOne,
            ids.eventOneId,
            ids.techStaffId,
            '[2026-11-02 09:00+08,2026-11-02 12:00+08)',
          ],
        );
        await client.query(
          `
            INSERT INTO tech_staff_assignments (
              request_id, event_id, staff_id, assignment_range, status
            )
            VALUES ($1, $2, $3, $4::tstzrange, 'assigned')
          `,
          [
            requestTwo,
            ids.eventTwoId,
            ids.techStaffId,
            '[2026-11-02 10:00+08,2026-11-02 13:00+08)',
          ],
        );
      } finally {
        await client.query('ROLLBACK');
      }
    },
    '23P01',
  );

  await expectDatabaseRejection(
    'duplicate event registration unique constraint',
    async () => {
      await client.query('BEGIN');
      try {
        await client.query(
          `
            INSERT INTO event_registrations (event_id, attendee_id, status)
            VALUES ($1, $2, 'registered')
          `,
          [ids.eventOneId, ids.attendeeId],
        );
        await client.query(
          `
            INSERT INTO event_registrations (event_id, attendee_id, status)
            VALUES ($1, $2, 'waitlisted')
          `,
          [ids.eventOneId, ids.attendeeId],
        );
      } finally {
        await client.query('ROLLBACK');
      }
    },
    '23505',
  );

  const notificationIndex = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'notification_deliveries'
        AND indexname = 'notification_deliveries_delivery_status_idx'
    )
  `);

  if (!notificationIndex.rows[0]?.exists) {
    throw new Error('notification_deliveries_delivery_status_idx is missing.');
  }

  console.log('database validation passed');
}

async function fetchValidationIds(client: Client) {
  const result = await client.query<{
    venue_id: string;
    event_one_id: string;
    event_two_id: string;
    organiser_id: string;
    tech_staff_id: string;
    attendee_id: string;
  }>(`
    SELECT
      (SELECT id FROM venues WHERE name = 'Orchid Hall') AS venue_id,
      (SELECT id FROM events WHERE event_code = 'EVT-101') AS event_one_id,
      (SELECT id FROM events WHERE event_code = 'EVT-2001') AS event_two_id,
      (SELECT id FROM users WHERE email = 'organiser_a@clienta.com') AS organiser_id,
      (SELECT id FROM users WHERE email = 'tech_a@connectsphere.com') AS tech_staff_id,
      (SELECT id FROM users WHERE email = 'attendee_a@example.com') AS attendee_id
  `);

  const row = result.rows[0];

  if (
    !row?.venue_id ||
    !row.event_one_id ||
    !row.event_two_id ||
    !row.organiser_id ||
    !row.tech_staff_id ||
    !row.attendee_id
  ) {
    throw new Error('Seed data validation identifiers are missing.');
  }

  return {
    venueId: row.venue_id,
    eventOneId: row.event_one_id,
    eventTwoId: row.event_two_id,
    organiserId: row.organiser_id,
    techStaffId: row.tech_staff_id,
    attendeeId: row.attendee_id,
  };
}

async function expectDatabaseRejection(
  name: string,
  action: () => Promise<void>,
  expectedCode: string,
) {
  try {
    await action();
  } catch (error) {
    const code = getPostgresErrorCode(error);

    if (code === expectedCode) {
      console.log(`validated ${name}`);
      return;
    }

    throw error;
  }

  throw new Error(`Expected ${name} to be rejected with PostgreSQL error ${expectedCode}.`);
}

function getPostgresErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }

  return undefined;
}

async function inTransaction(client: Client, work: () => Promise<void>) {
  await client.query('BEGIN');

  try {
    await work();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function stableUuid(value: string) {
  const hash = createHash('sha1').update(`connectsphere:${value}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}



main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
