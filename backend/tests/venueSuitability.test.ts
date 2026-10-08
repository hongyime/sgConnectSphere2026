// Traceability: SCRUM-46 / E06-S02 AC1-3 and AC5 (T-77).
// Evidence: feature/SCRUM-46-venue-suitability; see docs/testing/venue-suitability.md.
// AC4 real booking integration remains pending E06-S03/S04.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assessVenue, type Criteria } from '../src/modules/venueBooking/assessment.js';
import { assessEventVenue, venueSuitability, withinOperatingHours } from '../src/modules/venueBooking/suitability.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

const options = { layouts: [{ id: 'theatre', label: 'Theatre' }], accessibility: [{ id: 'ramp', label: 'Wheelchair access' }], facilities: [{ id: 'wifi', label: 'WiFi' }] };
const venue = { id: 'v', name: 'Hall', location: 'Central', max_capacity: 200, available: true, opens_at: '08:00:00', closes_at: '22:00:00', layouts: [{ id: 'theatre', label: 'Theatre', capacity: 100 }], accessibility: options.accessibility, facilities: options.facilities };
const criteria: Criteria = { start: '2026-11-10T08:00:00+08:00', end: '2026-11-10T22:00:00+08:00', attendance: 100, capacity: 100, layout: 'theatre', location: '', accessibility: ['ramp'], facilities: ['wifi'], q: '' };
const user: AuthenticatedUser = { id: 'u', email: 'synthetic@example.test', role: 'event_coordinator', isActive: true, failedLoginCount: 0 };

test('TC_E06S02_01 TC_E06S02_03: full requirements and exact operating-hours boundaries pass', () => {
  const result = assessEventVenue(venue, criteria, options);
  assert.equal(result.suitable, true);
  assert.equal(result.operating_hours_pass, true);
  assert.deepEqual(result.mismatches, []);
  assert.equal(result.comparisons.find(c => c.criterion === 'Capacity')?.provided, '100');
  assert.equal(withinOperatingHours('2026-11-10T01:00:00Z', '2026-11-10T02:00:00Z', venue), true);
  assert.equal(withinOperatingHours(criteria.start, criteria.end, { opens_at: '08:00', closes_at: '22:00' }), true);
});

for (const [name, change] of [
  ['starts before opening', { start: '2026-11-10T07:59:59+08:00' }],
  ['ends after closing', { end: '2026-11-10T22:00:00.001+08:00' }],
  ['crosses midnight', { end: '2026-11-11T10:00:00+08:00' }],
] as const) test(`TC_E06S02_05: ${name} is outside operating hours but remains advisory`, () => {
  const input = { ...criteria, ...change };
  const result = assessEventVenue(venue, input, options);
  assert.equal(result.suitable, false);
  assert.equal(result.advisory, true);
  assert.ok(result.mismatches.includes('Event is outside operating hours.'));
  // The same venue and criteria in E06-S01 must not gain an hours rule.
  assert.equal(assessVenue(venue, input).suitable, true);
});

test('TC_E06S02_02: all capacity, accessibility, facility and hours failures are named', () => {
  const result = assessEventVenue({ ...venue, layouts: [{ ...venue.layouts[0], capacity: 50 }], accessibility: [], facilities: [], available: false }, { ...criteria, start: '2026-11-10T07:00:00+08:00' }, options);
  for (const text of ['Capacity 50', 'Wheelchair access', 'WiFi', 'Unavailable', 'outside operating hours']) assert.ok(result.mismatches.some(m => m.includes(text)));
  assert.equal(result.mismatches.length, 5);
  assert.equal(result.advisory, true);
});

test('missing layout is explained; no selected layout uses maximum; absent requirements stay optional', () => {
  const missing = assessEventVenue({ ...venue, layouts: [] }, criteria, options);
  assert.equal(missing.suitable, false);
  assert.equal(missing.comparisons[0].provided, 'Required layout not supported');
  const optional = assessEventVenue({ ...venue, layouts: [], facilities: [], accessibility: [] }, { ...criteria, layout: '', accessibility: [], facilities: [] }, options);
  assert.equal(optional.suitable, true);
  assert.equal(optional.effective_capacity, 200);
  assert.equal(assessEventVenue(venue, { ...criteria, layout: '', attendance: 201, capacity: 201 }, options).suitable, false);
  assert.equal(assessEventVenue(venue, { ...criteria, layout: 'unknown', accessibility: ['unknown'], facilities: ['unknown'] }, options).suitable, false);
});

function repository(overrides: { event?: boolean; venue?: boolean; hours?: boolean; attendance?: number } = {}) {
  const writes: string[] = [];
  const query: Query = async <T extends Record<string, unknown>>(sql: string) => {
    let rows: unknown[] = [];
    if (sql.startsWith('INSERT')) writes.push(sql);
    else if (sql.includes('FROM room_layouts')) rows = options.layouts;
    else if (sql.includes('SELECT id, label FROM accessibility_features')) rows = options.accessibility;
    else if (sql.includes('SELECT id, label FROM facilities')) rows = options.facilities;
    else if (sql.includes('FROM events e')) rows = overrides.event === false ? [] : [{ id: 'event', title: 'Event', start: criteria.start, end: criteria.end, attendance: overrides.attendance ?? 100, layout: 'theatre', accessibility: ['ramp'], facilities: ['wifi'], accessibility_note: 'Manual note' }];
    else if (sql.includes('SELECT v.id')) rows = overrides.venue === false ? [] : [venue];
    else if (sql.includes('SELECT opens_at')) rows = overrides.hours === false ? [] : [venue];
    else throw new Error('Unexpected query');
    return { rows: rows as T[] };
  };
  return { query, writes };
}
const params = () => new URLSearchParams({ event_id: 'event', venue_id: 'v', attendance: '1', start: 'bad', role: 'venue_staff' });

test('event assessment uses recorded requirements, ignores client overrides and performs no business writes', async () => {
  const { query, writes } = repository();
  const result = await venueSuitability(query, user, params());
  assert.equal(result.assessment.comparisons[0].required, '100');
  assert.equal(result.event.start, new Date(criteria.start).toISOString());
  assert.equal(result.event.accessibility_note, 'Manual note');
  assert.equal(result.assessment.advisory, true);
  assert.deepEqual(writes, []);
});
test('anonymous, wrong-role and inactive users cannot assess venues', async () => {
  await assert.rejects(venueSuitability(repository().query, undefined, params()), { status: 401 });
  for (const denied of [{ ...user, role: 'attendee' as const }, { ...user, isActive: false }]) {
    await assert.rejects(venueSuitability(repository().query, denied, params()), { status: 403 });
  }
});
test('missing identifiers and invalid event requirements are rejected', async () => {
  for (const p of [new URLSearchParams(), new URLSearchParams({ event_id: 'e' }), new URLSearchParams({ event_id: 'x'.repeat(241), venue_id: 'v' }), new URLSearchParams({ event_id: 'e', venue_id: 'x'.repeat(241) })]) {
    await assert.rejects(venueSuitability(repository().query, user, p), { status: 400 });
  }
  await assert.rejects(venueSuitability(repository({ attendance: -1 }).query, user, params()), { status: 400 });
});
test('missing/draft event and missing/retired venue return not found', async () => {
  for (const override of [{ event: false }, { venue: false }, { hours: false }]) await assert.rejects(venueSuitability(repository(override).query, user, params()), { status: 404 });
});
