// SCRUM-60 (E08-S03): real PostgreSQL proof of the readiness check, the
// submission for Safety Review and the Safety Officer-only confirmation,
// TC_E08S03_03, _04, _05, _08, _09, _10 and TC_E07S04_07's last step. Each
// test gets its own random schema with every migration applied, 0017's
// safety_review status and 0012's Safety Officer role included
// (helpers/loginDatabase.ts), so statuses, audit entries, notices and their
// email-outbox rows are checked as PostgreSQL stores them.
//
// Requires TEST_DATABASE_URL pointing at a disposable local database named
// connectsphere_notification_test, never the live Supabase project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { deactivateAccount } from '../src/modules/accessControl/deactivation.js';
import { getEquipmentRequests, listEquipmentRequestEvents, saveEquipmentRequest } from '../src/modules/equipmentSupport/requests.js';
import { getRequest, listQueue } from '../src/modules/equipmentSupport/staffAssignments.js';
import { applyEventStatusChange, ConfirmationRefusedError } from '../src/modules/eventLifecycle/repository.js';
import { withArrangements } from '../src/modules/eventReadiness/arrangements.js';
import {
  confirmEvent, getEventReadiness, READINESS_MESSAGES, ReadinessBlockedError, submitForSafetyReview,
} from '../src/modules/eventReadiness/submission.js';
import { AccessError, getEvent, listEventActivity, updateEventInformation, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { inTransaction } from '../src/database/pool.js';

const RANGE = "tstzrange('2027-01-15 09:00+08', '2027-01-15 17:00+08', '[)')";

async function fixture() {
  const f = await loginDatabase();
  const ids = {
    orgA: randomUUID(), orgB: randomUUID(), organiserA: randomUUID(), organiserB: randomUUID(),
    coordA: randomUUID(), coordB: randomUUID(), lead: randomUUID(), safety: randomUUID(), safetyOff: randomUUID(),
    tech: randomUUID(), venueStaff: randomUUID(),
  };
  await f.pool.query(`INSERT INTO client_organisations (id, name) VALUES ($1, 'Client A'), ($2, 'Client B')`, [ids.orgA, ids.orgB]);
  const people: [string, string | null, string, string, boolean][] = [
    [ids.organiserA, ids.orgA, 'Organiser A', 'event_organiser', true],
    [ids.organiserB, ids.orgB, 'Organiser B', 'event_organiser', true],
    [ids.coordA, null, 'Coordinator A', 'event_coordinator', true],
    [ids.coordB, null, 'Coordinator B', 'event_coordinator', true],
    [ids.lead, null, 'Lead One', 'event_coordinator_lead', true],
    [ids.safety, null, 'Safety One', 'safety_officer', true],
    [ids.safetyOff, null, 'Safety Retired', 'safety_officer', false],
    [ids.tech, null, 'Tech One', 'technical_support_staff', true],
    [ids.venueStaff, null, 'Venue One', 'venue_staff', true],
  ];
  for (const [id, org, name, role, active] of people) {
    await f.pool.query(
      `INSERT INTO users (id, client_org_id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'unused', $4, $5::user_role, $6)`,
      [id, org, `${id}@example.test`, name, role, active],
    );
  }
  const user = (id: string): AuthenticatedUser => {
    const person = people.find(([personId]) => personId === id)!;
    return {
      id, email: `${id}@example.test`, role: person[3] as AuthenticatedUser['role'], clientOrgId: person[1] ?? undefined,
      isActive: person[4], failedLoginCount: 0,
    };
  };
  const q = (sql: string, values?: unknown[]) => f.pool.query(sql, values);
  const query: Query = (sql, values) => f.pool.query(sql, values);

  const event = async (code: string, status = 'planning', equipment = 'none_required', coordinator: string | null = ids.coordA) => {
    const id = randomUUID();
    await q(`INSERT INTO events (id, event_code, organiser_id, coordinator_id, client_org_id, title, status, event_range,
        expected_attendance, equipment_requirements)
      VALUES ($1, $2, $3, $4, $5, $6, $7::event_status, ${RANGE}, 120, $8)`,
    [id, code, ids.organiserA, coordinator, ids.orgA, `Event ${code}`, status, equipment]);
    return id;
  };
  // One venue per booking, so no two bookings overlap (0016's buffer guard).
  const booking = async (eventId: string, venueName: string, status: string, options: {
    purpose?: string; bufferConflict?: boolean; reconfirm?: boolean; expiresAt?: string;
    range?: string;
  } = {}) => {
    const venue = randomUUID();
    await q(`INSERT INTO venues (id, name, location, max_capacity, opens_at, closes_at)
      VALUES ($1, $2, 'Level 1', 500, '07:00', '23:00')`, [venue, `${venueName} ${venue.slice(0, 4)}`]);
    const id = randomUUID();
    await q(`INSERT INTO venue_bookings (id, venue_id, event_id, booking_range, status, purpose, buffer_conflict,
        requires_reconfirmation, expires_at)
      VALUES ($1, $2, $3, ${options.range ?? RANGE}, $4::booking_status, $5, $6, $7, $8)`,
    [id, venue, eventId, status, options.purpose ?? null, options.bufferConflict ?? false, options.reconfirm ?? false,
      options.expiresAt ?? null]);
    return { id, venueName: `${venueName} ${venue.slice(0, 4)}` };
  };
  const equipment = async (name: string, stock = 10) => {
    const id = randomUUID();
    await q(`INSERT INTO equipment (id, name, category, total_quantity, home_location, operational_status, is_active)
      VALUES ($1, $2, 'AV', $3, 'Store', 'available', true)`, [id, name, stock]);
    return id;
  };
  const line = async (eventId: string, equipmentId: string, requested: number, reservation?: {
    quantity: number; status: 'reserved' | 'partial' | 'released'; reconfirm?: boolean;
  }) => {
    const id = randomUUID();
    await q(`INSERT INTO equipment_requests (id, event_id, equipment_id, quantity_requested, requested_by)
      VALUES ($1, $2, $3, $4, $5)`, [id, eventId, equipmentId, requested, ids.coordA]);
    if (reservation) {
      await q(`INSERT INTO equipment_reservations (request_id, event_id, equipment_id, quantity_reserved, reservation_range,
          status, requires_reconfirmation)
        VALUES ($1, $2, $3, $4, ${RANGE}, $5::reservation_status, $6)`,
      [id, eventId, equipmentId, reservation.quantity, reservation.status, reservation.reconfirm ?? false]);
    }
    return id;
  };
  const support = async (eventId: string, status: 'open' | 'staffed' | 'cancelled', required = true, description = 'Sound desk operator') => {
    const id = randomUUID();
    await q(`INSERT INTO tech_support_requests (id, event_id, support_required, support_description, support_range, status, requested_by)
      VALUES ($1, $2, $3, $4, ${RANGE}, $5::support_status, $6)`, [id, eventId, required, description, status, ids.coordA]);
    if (status === 'staffed') {
      await q(`INSERT INTO tech_staff_assignments (request_id, event_id, staff_id, assignment_range, status)
        VALUES ($1, $2, $3, ${RANGE}, 'assigned')`, [id, eventId, ids.tech]);
    }
    return id;
  };
  const status = async (eventId: string) => (await q('SELECT status::text AS status FROM events WHERE id = $1', [eventId])).rows[0]!.status as string;
  const notices = async (eventId: string) => (await q(`SELECT n.user_id, n.title, n.message, d.id AS delivery_id
      FROM notifications n LEFT JOIN notification_deliveries d ON d.notification_id = n.id
      WHERE n.event_id = $1 ORDER BY n.created_at, n.id`, [eventId])).rows as {
    user_id: string; title: string; message: string; delivery_id: string | null;
  }[];
  const audits = async (eventId: string) => (await q(`SELECT id, actor_id, action, field_changed, old_value, new_value
      FROM audit_logs WHERE event_id = $1 ORDER BY occurred_at, id`, [eventId])).rows as {
    id: string; actor_id: string | null; action: string; field_changed: string | null; old_value: string | null; new_value: string | null;
  }[];
  // A ready event: one Confirmed booking, equipment none required, no support.
  const ready = async (code: string) => {
    const id = await event(code);
    await booking(id, 'Orchid Hall', 'confirmed', { purpose: 'Main programme' });
    return id;
  };
  return { ...f, ids, user, q, query, event, booking, equipment, line, support, status, notices, audits, ready };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function withFixture(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

async function refused(action: Promise<unknown>, status: number, message: string) {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof AccessError, `expected AccessError, got ${String(error)}`);
    assert.equal(error.status, status);
    assert.equal(error.message, message);
    return true;
  });
}

// A blocked submission: nothing changes and the snapshot lists the blockers.
async function blocked(f: Fixture, eventId: string) {
  let snapshot: ReadinessBlockedError['readiness'] | undefined;
  await assert.rejects(submitForSafetyReview(f.pool, f.user(f.ids.coordA), eventId), (error: unknown) => {
    assert.ok(error instanceof ReadinessBlockedError);
    assert.equal(error.status, 409);
    assert.equal(error.message, READINESS_MESSAGES.blocked);
    snapshot = error.readiness;
    return true;
  });
  assert.equal(await f.status(eventId), 'planning');
  assert.deepEqual(await f.notices(eventId), []);
  assert.deepEqual((await f.audits(eventId)).filter(row => row.field_changed === 'status'), []);
  return snapshot!;
}

test('TC_E08S03_08: submitting a fully arranged Planning event moves it to Safety Review and notifies the Organiser and every active Safety Officer', async () => {
  await withFixture(async f => {
    const id = await f.event('EVT-801', 'planning', 'Projector and microphones');
    await f.booking(id, 'Orchid Hall', 'confirmed', { purpose: 'Main programme' });
    await f.booking(id, 'Lotus Room', 'rejected');
    await f.booking(id, 'Jade Room', 'released');
    await f.booking(id, 'Pearl Room', 'expired');
    await f.booking(id, 'Ruby Room', 'tentative', { expiresAt: '2020-01-01T00:00:00Z' });
    await f.line(id, await f.equipment('Projector'), 3, { quantity: 3, status: 'reserved' });
    await f.support(id, 'staffed');
    await f.support(id, 'cancelled', true, 'Lighting');

    const before = await getEventReadiness(f.pool, f.user(f.ids.coordA), 'EVT-801');
    assert.equal(before.canSubmit, true);
    assert.deepEqual(before.blockers, []);
    // Same period, so listed by venue name.
    assert.deepEqual(before.venueBookings.map(row => [row.venueName.split(' ')[0], row.state]), [
      ['Jade', 'withdrawn'], ['Lotus', 'withdrawn'], ['Orchid', 'ready'], ['Pearl', 'withdrawn'], ['Ruby', 'withdrawn'],
    ]);

    const submission = await submitForSafetyReview(f.pool, f.user(f.ids.coordA), 'EVT-801');
    assert.equal(submission.status, 'safety_review');
    assert.equal(submission.eventCode, 'EVT-801');
    assert.equal(submission.notifiedSafetyOfficers, 1, 'the inactive Safety Officer is not told');
    assert.equal(await f.status(id), 'safety_review', 'Safety Review, not Confirmed');

    const statusAudit = (await f.audits(id)).filter(row => row.field_changed === 'status');
    assert.deepEqual(statusAudit.map(row => [row.actor_id, row.old_value, row.new_value]), [[f.ids.coordA, 'planning', 'safety_review']]);

    const sent = await f.notices(id);
    assert.deepEqual(sent.map(row => row.user_id).sort(), [f.ids.organiserA, f.ids.safety].sort(),
      'one notice each for the Organiser and the Safety Officer; none for the submitting Coordinator');
    const organiser = sent.find(row => row.user_id === f.ids.organiserA)!;
    assert.equal(organiser.title, 'Awaiting safety check');
    assert.equal(organiser.message, 'Coordinator A submitted EVT-801 Event EVT-801 for its safety check. The event is now in Safety Review, and is confirmed only once the Safety Officer approves it.');
    const officer = sent.find(row => row.user_id === f.ids.safety)!;
    assert.equal(officer.title, 'Safety check needed');
    assert.match(officer.message, /^Coordinator A submitted EVT-801 Event EVT-801 for its Operational Safety Check\./);
    assert.ok(sent.every(row => row.delivery_id), 'each notice has its email-outbox row');

    const after = await getEventReadiness(f.pool, f.user(f.ids.coordA), id);
    assert.equal(after.status, 'safety_review');
    assert.equal(after.canSubmit, false);
    await refused(submitForSafetyReview(f.pool, f.user(f.ids.coordA), id), 409, READINESS_MESSAGES.alreadyInReview);
  });
});

test('TC_E08S03_09: submission is blocked while a venue booking is outstanding, each one listed by venue, and nothing changes', async () => {
  await withFixture(async f => {
    const none = await f.event('EVT-902');
    await f.booking(none, 'Lotus Room', 'rejected');
    const noVenue = await blocked(f, none);
    assert.deepEqual(noVenue.blockers.map(row => row.message), ['No venue booking is Confirmed yet.']);

    const id = await f.event('EVT-901');
    await f.booking(id, 'Grand Auditorium', 'confirmed', { purpose: 'Main programme' });
    const pending = await f.booking(id, 'Seminar Room B', 'pending');
    const conflicting = await f.booking(id, 'Seminar Room C', 'conflicting');
    const buffered = await f.booking(id, 'Seminar Room D', 'pending', { bufferConflict: true });
    const hold = await f.booking(id, 'Seminar Room E', 'tentative', { expiresAt: '2099-01-01T00:00:00Z' });
    await f.booking(id, 'Seminar Room F', 'tentative', { expiresAt: '2020-01-01T00:00:00Z' });
    const snapshot = await blocked(f, id);
    assert.deepEqual(snapshot.blockers.map(row => row.message), [
      `${pending.venueName} — Pending`,
      `${conflicting.venueName} — Conflicting`,
      `${buffered.venueName} — Conflicting (setup or turnaround overlap)`,
      `${hold.venueName} — tentative hold; request it or let it go`,
    ].sort((a, b) => a.localeCompare(b)), 'the lapsed hold is withdrawn and the Confirmed booking is ready');
  });
});

test('TC_E08S03_09: a Confirmed booking with a buffer conflict or flagged after a capacity cut blocks submission', async () => {
  await withFixture(async f => {
    const id = await f.event('EVT-903');
    const buffered = await f.booking(id, 'Grand Auditorium', 'confirmed', { bufferConflict: true });
    const flagged = await f.booking(id, 'Seminar Room A', 'confirmed', { reconfirm: true });
    const snapshot = await blocked(f, id);
    assert.deepEqual(snapshot.blockers.map(row => row.message).sort(), [
      `${buffered.venueName} — Conflicting (setup or turnaround overlap)`,
      `${flagged.venueName} — needs review: its capacity is now below the expected attendance`,
    ].sort(), 'both are Confirmed, so there is no separate "no Confirmed venue" item');
  });
});

test('TC_E08S03_03: a partial equipment reservation blocks submission and shows the outstanding quantity', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-303');
    await f.line(id, await f.equipment('Projector'), 3, { quantity: 2, status: 'partial' });
    await f.line(id, await f.equipment('Microphone'), 4, { quantity: 4, status: 'reserved' });
    const snapshot = await blocked(f, id);
    assert.deepEqual(snapshot.blockers.map(row => row.message), ['Projector — 2 of 3 reserved; 1 outstanding']);
    const shortfall = snapshot.blockers[0]!;
    assert.equal(shortfall.kind, 'equipment-shortfall');
    if (shortfall.kind === 'equipment-shortfall') {
      assert.deepEqual([shortfall.requiredQuantity, shortfall.reservedQuantity, shortfall.issue], [3, 2, 'partial']);
    }
    assert.deepEqual(snapshot.equipment.map(row => [row.name, row.state]), [['Microphone', 'ready'], ['Projector', 'outstanding']]);
  });
});

test('TC_E07S04_07: a missing, released or flagged reservation also blocks submission', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-704');
    await f.line(id, await f.equipment('Lectern'), 1);
    await f.line(id, await f.equipment('Screen'), 2, { quantity: 2, status: 'released' });
    await f.line(id, await f.equipment('Speaker'), 5, { quantity: 5, status: 'reserved', reconfirm: true });
    const snapshot = await blocked(f, id);
    assert.deepEqual(snapshot.blockers.map(row => row.message), [
      'Lectern — not reserved; 1 outstanding',
      'Screen — reservation released; 2 outstanding',
      'Speaker — needs review: stock changed (5 of 5 reserved)',
    ]);
  });
});

test('TC_E08S03_10: equipment recorded as none required, with no request lines, does not block submission', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-310');
    const snapshot = await getEventReadiness(f.pool, f.user(f.ids.coordA), id);
    assert.equal(snapshot.equipmentNoneRequired, true);
    assert.deepEqual(snapshot.equipment, []);
    assert.equal(snapshot.canSubmit, true);
    await submitForSafetyReview(f.pool, f.user(f.ids.coordA), id);
    assert.equal(await f.status(id), 'safety_review');

    // Free-text equipment with no request lines passes too (D61).
    const freeText = await f.event('EVT-311', 'planning', 'Two lecterns');
    await f.booking(freeText, 'Lotus Room', 'confirmed');
    const other = await getEventReadiness(f.pool, f.user(f.ids.coordA), freeText);
    assert.deepEqual([other.equipmentNoneRequired, other.canSubmit], [false, true]);
  });
});

test('TC_E08S03_04: requested technical support with no staff assigned blocks submission', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-404');
    await f.support(id, 'staffed', true, 'Sound desk operator');
    const long = 'Stage lighting technician for the evening keynote, who also runs the follow spot and the house lights';
    await f.support(id, 'open', true, long);
    await f.support(id, 'cancelled', true, 'Camera operator');
    const snapshot = await blocked(f, id);
    assert.deepEqual(snapshot.blockers.map(row => row.message), [
      `Technical support — no staff assigned yet: ${long.slice(0, 79)}…`,
    ]);
    assert.deepEqual(snapshot.support.map(row => [row.description.slice(0, 5), row.state]).sort(), [['Sound', 'ready'], ['Stage', 'outstanding']]);

    // "No support needed" (E07-S06 Scenario 3) is recorded and never blocks.
    const noSupport = await f.ready('EVT-405');
    await f.support(noSupport, 'open', false, '');
    const passing = await getEventReadiness(f.pool, f.user(f.ids.coordA), noSupport);
    assert.deepEqual([passing.supportNoneRequired, passing.support.length, passing.canSubmit], [true, 0, true]);
  });
});

test('TC_E08S03_05: the Organiser sees every confirmed venue with its purpose and period, and the arrangements, once the event is confirmed', async () => {
  await withFixture(async f => {
    const id = await f.event('EVT-505', 'confirmed', 'Projector');
    await f.booking(id, 'Grand Auditorium', 'confirmed', { purpose: 'Main programme' });
    await f.booking(id, 'Seminar Room A', 'confirmed', { purpose: 'Breakout A',
      range: "tstzrange('2027-01-15 14:00+08', '2027-01-15 16:00+08', '[)')" });
    await f.booking(id, 'Seminar Room B', 'rejected', { purpose: 'Breakout B' });
    await f.line(id, await f.equipment('Projector'), 2, { quantity: 2, status: 'reserved' });
    await f.line(id, await f.equipment('Screen'), 1, { quantity: 1, status: 'released' });
    await f.support(id, 'staffed', true, 'Sound desk operator');
    await f.support(id, 'cancelled', true, 'Camera operator');

    const event = await withArrangements(f.query, await getEvent(f.query, f.user(f.ids.organiserA), 'EVT-505'));
    const arrangements = event.arrangements!;
    assert.deepEqual(arrangements.venues.map(row => [row.venueName.split(' ').slice(0, 2).join(' '), row.purpose, row.startsAt, row.endsAt]), [
      ['Grand Auditorium', 'Main programme', '2027-01-15T01:00:00.000Z', '2027-01-15T09:00:00.000Z'],
      ['Seminar Room', 'Breakout A', '2027-01-15T06:00:00.000Z', '2027-01-15T08:00:00.000Z'],
    ]);
    assert.deepEqual(arrangements.equipment, [{ name: 'Projector', quantity: 2 }]);
    assert.deepEqual(arrangements.support.map(row => row.description), ['Sound desk operator']);
    assert.equal(arrangements.equipmentNoneRequired, false);

    // Not shown before the event is confirmed.
    const planning = await f.ready('EVT-506');
    assert.equal((await withArrangements(f.query, await getEvent(f.query, f.user(f.ids.organiserA), planning))).arrangements, null);
  });
});

test('TC_E08S03_09: no one but a Safety Officer can set Confirmed; each refusal is in the activity log and the event stays in Safety Review', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-909');
    await submitForSafetyReview(f.pool, f.user(f.ids.coordA), id);

    await refused(confirmEvent(f.pool, f.user(f.ids.coordA), 'EVT-909'), 403, READINESS_MESSAGES.onlySafetyOfficer);
    await refused(confirmEvent(f.pool, f.user(f.ids.lead), 'EVT-909'), 403, READINESS_MESSAGES.onlySafetyOfficer);
    await refused(confirmEvent(f.pool, f.user(f.ids.organiserB), 'EVT-909'), 403, READINESS_MESSAGES.onlySafetyOfficer);
    assert.equal(await f.status(id), 'safety_review');

    const shown = (await listEventActivity(f.query, id)).rows.filter(row => row.action === 'Confirmation refused');
    assert.deepEqual(shown.map(row => [row.actor_name, row.field_changed, row.new_value]), [
      ['Coordinator A', 'confirmation', 'Refused (Safety Officer only)'],
      ['Lead One', 'confirmation', 'Refused (Safety Officer only)'],
    ], 'staff refusals are shown; the other organisation is never named (#161)');
    const hidden = (await f.audits(id)).filter(row => row.action === 'Access Denied');
    assert.deepEqual(hidden.map(row => [row.actor_id, row.field_changed]), [[f.ids.organiserB, 'event_confirm']]);

    // The Safety Officer's own approval is E08-S06's (D60).
    await refused(confirmEvent(f.pool, f.user(f.ids.safety), 'EVT-909'), 409, READINESS_MESSAGES.confirmThroughApproval);
    const planning = await f.ready('EVT-910');
    await refused(confirmEvent(f.pool, f.user(f.ids.safety), planning), 409, READINESS_MESSAGES.confirmNotInReview);
    await refused(confirmEvent(f.pool, f.user(f.ids.coordA), 'EVT-unknown'), 403, READINESS_MESSAGES.onlySafetyOfficer);
    await refused(confirmEvent(f.pool, undefined, 'EVT-909'), 401, 'Sign in to continue.');
  });
});

test('TC_E08S03_09: the shared status-change path refuses Confirmed from Safety Review for anyone but a Safety Officer, and Planning can no longer go straight to Confirmed', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-911');
    await assert.rejects(inTransaction(f.pool, client => applyEventStatusChange(client, id, 'confirmed', f.ids.coordA)),
      /Illegal event status transition: planning -> confirmed/);

    await submitForSafetyReview(f.pool, f.user(f.ids.coordA), id);
    for (const actor of [f.ids.coordA, f.ids.lead, f.ids.safetyOff]) {
      await assert.rejects(inTransaction(f.pool, client => applyEventStatusChange(client, id, 'confirmed', actor)),
        (error: unknown) => error instanceof ConfirmationRefusedError && error.message === READINESS_MESSAGES.onlySafetyOfficer);
    }
    assert.equal(await f.status(id), 'safety_review');

    // An active Safety Officer can (the path E08-S06 will use).
    await inTransaction(f.pool, client => applyEventStatusChange(client, id, 'confirmed', f.ids.safety));
    assert.equal(await f.status(id), 'confirmed');
  });
});

test('SCRUM-60: only the assigned Coordinator reads readiness or submits; other callers are refused and audited', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-920');
    await refused(getEventReadiness(f.pool, f.user(f.ids.coordB), 'EVT-920'), 403, READINESS_MESSAGES.readNotAssigned);
    await refused(getEventReadiness(f.pool, f.user(f.ids.organiserA), 'EVT-920'), 403, READINESS_MESSAGES.readNotAssigned);
    await refused(getEventReadiness(f.pool, undefined, 'EVT-920'), 401, 'Sign in to continue.');
    await refused(getEventReadiness(f.pool, f.user(f.ids.coordA), ''), 400, 'An event id or code is required.');
    await refused(submitForSafetyReview(f.pool, f.user(f.ids.coordB), 'EVT-920'), 403, READINESS_MESSAGES.submitNotAssigned);
    await refused(submitForSafetyReview(f.pool, f.user(f.ids.organiserA), 'EVT-920'), 403, READINESS_MESSAGES.submitNotAssigned);
    await refused(submitForSafetyReview(f.pool, undefined, 'EVT-920'), 401, 'Sign in to continue.');
    assert.equal(await f.status(id), 'planning');
    const denials = (await f.audits(id)).filter(row => row.action === 'Access Denied').map(row => [row.actor_id, row.field_changed]);
    assert.deepEqual(denials, [
      [f.ids.coordB, 'event_readiness'], [f.ids.organiserA, 'event_readiness'],
      [f.ids.coordB, 'safety_review_submission'], [f.ids.organiserA, 'safety_review_submission'],
    ]);
    assert.deepEqual((await listEventActivity(f.query, id)).rows.filter(row => row.action === 'Access Denied'), []);

    // A draft is nobody's to read here; an Approved event can't be submitted yet (D58).
    const draft = await f.event('EVT-921', 'draft');
    await refused(getEventReadiness(f.pool, f.user(f.ids.coordA), draft), 403, READINESS_MESSAGES.readNotAssigned);
    await refused(submitForSafetyReview(f.pool, f.user(f.ids.coordA), draft), 403, READINESS_MESSAGES.submitNotAssigned);
    const approved = await f.event('EVT-922', 'approved');
    await f.booking(approved, 'Orchid Hall', 'confirmed');
    const snapshot = await getEventReadiness(f.pool, f.user(f.ids.coordA), approved);
    assert.deepEqual([snapshot.blockers.length, snapshot.canSubmit], [0, false]);
    await refused(submitForSafetyReview(f.pool, f.user(f.ids.coordA), approved), 409, READINESS_MESSAGES.notPlanning);
    assert.equal(await f.status(approved), 'approved');
  });
});

test('SCRUM-60: an event in Safety Review stays in every read, counts as active, and its arrangements are frozen', async () => {
  await withFixture(async f => {
    const id = await f.ready('EVT-930');
    const projector = await f.equipment('Projector');
    await f.line(id, projector, 1, { quantity: 1, status: 'reserved' });
    const supportId = await f.support(id, 'staffed');
    await submitForSafetyReview(f.pool, f.user(f.ids.coordA), id);

    const listed = await listEquipmentRequestEvents(f.query, f.user(f.ids.coordA));
    assert.ok(listed.events.some(row => row.id === id), 'the Coordinator still finds its equipment requests');
    const requests = await getEquipmentRequests(f.query, f.user(f.ids.tech), 'EVT-930');
    assert.deepEqual([requests.canReserve, requests.canRelease], [false, false]);
    const edit = await saveEquipmentRequest(f.pool, f.user(f.ids.coordA), 'EVT-930', { equipmentId: await f.equipment('Lectern'), quantity: 1 })
      .catch((error: unknown) => error);
    assert.ok(edit instanceof AccessError && edit.status === 409);

    const queue = await listQueue(f.query, f.user(f.ids.tech));
    assert.ok(queue.requests.some(row => row.id === supportId), 'the staffed request stays in the technician queue');
    assert.equal((await getRequest(f.query, f.user(f.ids.tech), supportId)).canAssign, false);

    await assert.rejects(deactivateAccount(f.pool, f.user(f.ids.coordA), { confirm: true }), { status: 409 });

    await refused(updateEventInformation(f.query, f.user(f.ids.organiserA), 'EVT-930', { venueRequirements: 'A bigger hall' }), 409,
      'Direct editing of venueRequirements is not allowed after approval. Raise a change request.');
    assert.equal(await f.status(id), 'safety_review');
  });
});
