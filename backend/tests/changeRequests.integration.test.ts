import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { submitChangeRequest, decideChangeRequest, listChangeRequests } from '../src/modules/changeManagement/requests.js';
import { reconfirmBooking } from '../src/modules/venueBooking/decisions.js';
import { updateEventInformationWithNotifications } from '../src/modules/eventNotifications/informationChange.js';

async function fixture() {
  const f = await loginDatabase();
  const org = randomUUID();
  await f.pool.query('INSERT INTO client_organisations(id,name) VALUES ($1,$2)', [org, 'Synthetic change test']);
  async function person(role: AuthenticatedUser['role']) {
    const id = randomUUID();
    await f.pool.query(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id)
      VALUES ($1,$2,'unused','Synthetic tester',$3,$4)`, [id, `${id}@example.test`, role, role === 'event_organiser' ? org : null]);
    return { id, email: `${id}@example.test`, role, clientOrgId: role === 'event_organiser' ? org : null,
      isActive: true, failedLoginCount: 0 } as AuthenticatedUser;
  }
  const organiser = await person('event_organiser');
  const coordinator = await person('event_coordinator');
  const other = await person('event_organiser');
  const foreignCoordinator = await person('event_coordinator');
  const event = randomUUID();
  await f.pool.query(`INSERT INTO events(id,event_code,title,description,purpose,organiser_id,client_org_id,coordinator_id,
    status,event_range,expected_attendance) VALUES ($1,'EVT-CHANGE','Original','Description','Purpose',$2,$3,$4,
    'confirmed',tstzrange('2027-03-01 09:00+00','2027-03-01 12:00+00','[)'),40)`, [event, organiser.id, org, coordinator.id]);
  const submit = (changes = { title: 'Updated' } as Record<string, unknown>) => submitChangeRequest(f.pool, organiser, event, { description: 'Please update', changes });
  const decide = (id: string, decision = 'approve') => decideChangeRequest(f.pool, coordinator, event, id, { decision });
  return { ...f, event, organiser, coordinator, other, foreignCoordinator, submit, decide };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function previewToken(f: Fixture, id: string) {
  const result = await f.decide(id, 'preview');
  assert.ok('preview' in result && result.preview?.canApply);
  return result.preview;
}

async function booking(f: Fixture, name = 'Preview Hall') {
  const venue = randomUUID(), staff = randomUUID();
  await f.pool.query("INSERT INTO users(id,email,password_hash,full_name,role) VALUES($1,$2,'unused','Synthetic Venue Staff','venue_staff')", [staff, `${staff}@example.test`]);
  await f.pool.query("INSERT INTO venues(id,name,location,max_capacity,opens_at,closes_at) VALUES($1,$2,'Test',45,'00:00','23:59')", [venue, name]);
  await f.pool.query('INSERT INTO venue_staff_assignments(venue_id,staff_id) VALUES($1,$2)', [venue, staff]);
  const id = (await f.pool.query(`INSERT INTO venue_bookings(event_id,session_id,venue_id,booking_range,status)
    SELECT $1,id,$2,session_range,'confirmed' FROM sessions WHERE event_id=$1 RETURNING id`, [f.event, venue])).rows[0].id;
  return { id, venue, staff };
}
async function run(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

test('TC_E10S01_04: affected venue preview must be reviewed again after capacity changes; no preview side effects', () => run(async f => {
  const b = await booking(f);
  const request = await f.submit({ expectedAttendance: 50 });
  const preview = await previewToken(f, request.id);
  assert.equal(preview.impact.bookings[0].id, b.id);
  assert.equal((await f.pool.query('SELECT requires_reconfirmation FROM venue_bookings WHERE id=$1', [b.id])).rows[0].requires_reconfirmation, false);
  await f.pool.query('UPDATE venues SET max_capacity=49 WHERE id=$1', [b.venue]);
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token }), /Preview the current/);
  const refreshed = await previewToken(f, request.id);
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: refreshed.token })).status, 'applied');
  assert.equal((await f.pool.query('SELECT requires_reconfirmation FROM venue_bookings WHERE id=$1', [b.id])).rows[0].requires_reconfirmation, true);
  assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1', [b.staff])).rows[0].count, '1');
}));

test('TC_E10S01_04: outbox failure rolls back requested values, request status, flags and audits', () => run(async f => {
  const b = await booking(f);
  await f.pool.query("UPDATE events SET status='safety_review' WHERE id=$1", [f.event]);
  const request = await f.submit({ expectedAttendance: 50, title: 'Atomic new name' });
  const preview = await previewToken(f, request.id);
  const audits = (await f.pool.query('SELECT count(*) FROM audit_logs')).rows[0].count;
  await f.pool.query(`CREATE FUNCTION fail_apply_notice() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF (SELECT title FROM notifications WHERE id=NEW.notification_id) = 'Change applied' THEN
        RAISE EXCEPTION 'synthetic apply outbox failure';
      END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER fail_apply_notice BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_apply_notice()`);
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token }), /synthetic apply outbox failure/);
  const view = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.equal(view.current.expectedAttendance, 40); assert.equal(view.current.title, 'Original');
  assert.equal(view.requests[0].status, 'pending');
  assert.equal(view.event.status, 'safety_review', 'failed apply must roll back the lifecycle');
  assert.equal((await f.pool.query('SELECT requires_reconfirmation FROM venue_bookings WHERE id=$1', [b.id])).rows[0].requires_reconfirmation, false);
  assert.equal((await f.pool.query('SELECT count(*) FROM audit_logs')).rows[0].count, audits);
}));

test('TC_E10S01_04: date application publishes dates and sends one staff notice and one Organiser decision', () => run(async f => {
  const b = await booking(f);
  await f.pool.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
    VALUES($1,'Original','2027-03-01 09:00Z','2027-03-01 12:00Z','Preview Hall','Test')`, [f.event]);
  const request = await f.submit({ startAt: '2027-03-01T10:00:00Z' });
  const preview = await previewToken(f, request.id);
  await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'approve', previewToken: preview.token });
  assert.equal((await f.pool.query('SELECT starts_at FROM event_publications WHERE event_id=$1', [f.event])).rows[0].starts_at.toISOString(), '2027-03-01T10:00:00.000Z');
  for (const user of [b.staff, f.organiser.id]) assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1', [user])).rows[0].count, '1');
  await assert.rejects(f.decide(request.id), /already changed/);
}));

test('TC_E10S01_04: prior approved requests can apply; late registration closing needs explicit confirmation', () => run(async f => {
  const request = await f.submit({ registrationDates: { opensAt: '2027-02-01T00:00:00Z', closesAt: '2027-03-01T10:00:00Z' }, waitlistEnabled: true });
  await f.pool.query("UPDATE change_requests SET status='approved' WHERE id=$1", [request.id]);
  const preview = await previewToken(f, request.id);
  assert.equal(preview.lateClose, true);
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'apply', previewToken: preview.token }), /Confirm registration closing/);
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'apply', previewToken: preview.token, confirmLateClose: true })).status, 'applied');
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.waitlistEnabled, true);
}));

test('TC_E10S01_04: approved request path supports Safety Review while direct edits retain their existing restriction', () => run(async f => {
  await f.pool.query("UPDATE events SET status='safety_review' WHERE id=$1", [f.event]);
  await assert.rejects(updateEventInformationWithNotifications(f.pool, f.coordinator, f.event, { expectedAttendance: 50 }), /Only the assigned Coordinator/);
  const request = await f.submit({ expectedAttendance: 50 });
  const preview = await previewToken(f, request.id);
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token })).status, 'applied');
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'safety_review', 'structured no-impact change does not replan');
}));

test('TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04: pending snapshot leaves Event unchanged; safe apply and outbox are atomic', () => run(async f => {
  await f.pool.query(`INSERT INTO event_publications(event_id,name,starts_at,ends_at,venue_name,venue_location)
    VALUES ($1,'Original','2027-03-01 09:00+00','2027-03-01 12:00+00','Synthetic venue','Synthetic location')`, [f.event]);
  const request = await f.submit();
  assert.equal((await f.pool.query('SELECT name FROM event_publications WHERE event_id=$1', [f.event])).rows[0].name, 'Original');
  const view = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.equal(view.event.status, 'confirmed');
  assert.equal(view.event.id, f.event);
  assert.deepEqual(view.permissions, { canSubmit: true, canDecide: false });
  assert.deepEqual((await listChangeRequests(f.pool, f.coordinator, f.event)).permissions, { canSubmit: false, canDecide: true });
  assert.equal(view.current.title, 'Original');
  assert.equal(view.requests[0].status, 'pending');
  assert.deepEqual(request.requested_changes.before, { title: 'Original' });
  assert.equal((await f.decide(request.id)).status, 'applied');
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).current.title, 'Updated');
  assert.equal((await f.pool.query('SELECT name FROM event_publications WHERE event_id=$1', [f.event])).rows[0].name, 'Updated');
  const notices = (await f.pool.query(`SELECT n.user_id,d.id FROM notifications n JOIN notification_deliveries d
    ON d.notification_id=n.id WHERE n.event_id=$1`, [f.event])).rows;
  assert.equal(notices.length, 2);
  assert.deepEqual(new Set(notices.map(n => n.user_id)), new Set([f.organiser.id, f.coordinator.id]));
  assert.equal((await f.pool.query("SELECT count(*) FROM audit_logs WHERE action='Approved Change Applied' AND event_id=$1", [f.event])).rows[0].count, '1');
  await assert.rejects(f.decide(request.id));
}));

test('TC_E10S01_01 / TC_E10S01_04: invalid input, absent coordinator, inactive actor and unsupported stored requests refuse writes', () => run(async f => {
  await assert.rejects(f.submit({ title: 'Original' }), /unchanged/);
  await assert.rejects(f.submit({ startAt: '2028-01-01T00:00:00Z' }), /End must/);
  await assert.rejects(submitChangeRequest(f.pool, f.organiser, 'missing', { description: 'Update', changes: { title: 'New' } }), /not found/);
  await assert.rejects(listChangeRequests(f.pool, undefined, f.event));
  await assert.rejects(listChangeRequests(f.pool, f.foreignCoordinator, f.event));
  await assert.rejects(listChangeRequests(f.pool, f.organiser, 'missing'));
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, 'missing', { decision: 'invalid' }));
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, 'missing', { decision: 'approve', reason: 42 }));
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, 'missing', { decision: 'approve', reason: 'x'.repeat(4001) }));
  await f.pool.query('UPDATE events SET coordinator_id=NULL WHERE id=$1', [f.event]);
  await assert.rejects(f.submit(), /assigned Coordinator/);
  await f.pool.query('UPDATE events SET coordinator_id=$2 WHERE id=$1', [f.event, f.coordinator.id]);
  await f.pool.query('UPDATE users SET is_active=false WHERE id=$1', [f.organiser.id]);
  await assert.rejects(f.submit(), /Account access changed/);
  await f.pool.query('UPDATE users SET is_active=true WHERE id=$1', [f.organiser.id]);
  const request = await f.submit();
  await assert.rejects(f.decide(request.id, 'apply'), /already changed/);
  await f.pool.query('UPDATE change_requests SET requested_changes=$2::jsonb WHERE id=$1', [request.id, JSON.stringify({ fields: { title: 'Update' } })]);
  await assert.rejects(f.decide(request.id), /changed since/);
}));

test('TC_E10S01_01: submit outbox failure leaves no request or change audit', () => run(async f => {
  await f.pool.query(`CREATE FUNCTION reject_submit_notice() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic submit failure'; END $$;
    CREATE TRIGGER reject_submit_notice BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_submit_notice()`);
  await assert.rejects(f.submit(), /synthetic submit failure/);
  assert.equal((await f.pool.query('SELECT count(*) FROM change_requests')).rows[0].count, '0');
  assert.equal((await f.pool.query('SELECT count(*) FROM audit_logs')).rows[0].count, '0');
}));

test('TC_E10S01_05: decline leaves confirmed details unchanged and notifies requester', () => run(async f => {
  const request = await f.submit();
  const result = await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'decline', reason: 'Not feasible' });
  assert.equal(result.status, 'declined');
  assert.equal(result.decision_reason, 'Not feasible');
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.title, 'Original');
  assert.equal((await f.pool.query('SELECT count(*) FROM notification_deliveries')).rows[0].count, '2');
}));

test('TC_E10S01_04: arrangement preview rolls back; confirmation applies atomically through E10-S02', () => run(async f => {
  const request = await f.submit({ expectedAttendance: 50 });
  await assert.rejects(f.decide(request.id), /Preview the current/);
  const result = await f.decide(request.id, 'preview');
  assert.ok('preview' in result && result.preview?.canApply);
  assert.equal(result.status, 'pending');
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.expectedAttendance, 40);
  assert.equal((await f.pool.query("SELECT count(*) FROM audit_logs WHERE action='Record updated'")).rows[0].count, '0');
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: result.preview.token })).status, 'applied');
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.expectedAttendance, 50);
  const stale = await f.submit({ expectedAttendance: 60 });
  await f.pool.query('UPDATE events SET expected_attendance=45 WHERE id=$1', [f.event]);
  await assert.rejects(f.decide(stale.id, 'preview'), /changed since submission/);
}));

test('TC_E10S01_04: changed-field stale guard; unrelated fields do not block safe application', () => run(async f => {
  const request = await f.submit();
  await f.pool.query("UPDATE events SET title='Another edit' WHERE id=$1", [f.event]);
  await assert.rejects(f.decide(request.id), /changed since submission/);
  await f.pool.query("UPDATE events SET title='Original',description='Unrelated' WHERE id=$1", [f.event]);
  assert.equal((await f.decide(request.id)).status, 'applied');
}));

test('TC_E10S01_04: safe nullable-field changes and a later explicit apply preserve field history', () => run(async f => {
  await f.pool.query('UPDATE events SET purpose=NULL WHERE id=$1', [f.event]);
  const request = await f.submit({ purpose: 'New purpose' });
  // Represents a previously approved safe request, not a caller bypass flag.
  await f.pool.query("UPDATE change_requests SET status='approved' WHERE id=$1", [request.id]);
  assert.equal((await f.decide(request.id, 'apply')).status, 'applied');
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.purpose, 'New purpose');
}));

test('TC_E10S01_04: concurrent account maintenance refuses promptly rather than deadlocking', () => run(async f => {
  const request = await f.submit();
  const holder = await f.pool.connect();
  try {
    await holder.query('BEGIN');
    await holder.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [f.coordinator.id]);
    await assert.rejects(f.decide(request.id), /Account update in progress/);
  } finally { await holder.query('ROLLBACK'); holder.release(); }
  assert.equal((await f.decide(request.id)).status, 'applied');
}));

test('TC_E10S01_01 / TC_E10S01_04: ownership, terminal states and cancellation discriminator are enforced', () => run(async f => {
  await assert.rejects(submitChangeRequest(f.pool, undefined, f.event, {}));
  await assert.rejects(submitChangeRequest(f.pool, f.coordinator, f.event, {}));
  await assert.rejects(submitChangeRequest(f.pool, f.other, f.event, { description: 'Change', changes: { title: 'Other' } }));
  await assert.rejects(listChangeRequests(f.pool, f.other, f.event));
  assert.equal((await f.pool.query("SELECT count(*) FROM audit_logs WHERE action='Access Denied' AND event_id=$1", [f.event])).rows[0].count, '2');
  const request = await f.submit();
  await assert.rejects(decideChangeRequest(f.pool, f.foreignCoordinator, f.event, request.id, { decision: 'approve' }));
  await f.pool.query(`INSERT INTO change_requests(event_id,requested_by,description,requested_changes)
    VALUES ($1,$2,'Cancel','{"action":"cancel"}')`, [f.event, f.organiser.id]);
  const cancel = (await f.pool.query("SELECT id FROM change_requests WHERE requested_changes->>'action'='cancel'")).rows[0].id;
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).requests.length, 1);
  await assert.rejects(f.decide(cancel), /not found/);
  for (const status of ['cancelled', 'completed', 'draft', 'under_review']) {
    await f.pool.query('UPDATE events SET status=$2::event_status WHERE id=$1', [f.event, status]);
    await assert.rejects(f.decide(request.id));
    await assert.rejects(f.submit());
  }
}));

test('TC_E10S01_04: simultaneous decisions have one winner and one result notice', () => run(async f => {
  const request = await f.submit();
  const results = await Promise.allSettled([f.decide(request.id), f.decide(request.id, 'decline')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE event_id=$1', [f.event])).rows[0].count, '2');
}));

test('TC_E10S01_04: notification failure rolls back Event, request and audit writes', () => run(async f => {
  const request = await f.submit();
  await f.pool.query(`CREATE FUNCTION reject_notice() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic outbox failure'; END $$;
    CREATE TRIGGER reject_notice BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_notice()`);
  await assert.rejects(f.decide(request.id), /synthetic outbox failure/);
  const view = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.equal(view.current.title, 'Original');
  assert.equal(view.requests[0].status, 'pending');
  assert.equal((await f.pool.query("SELECT count(*) FROM audit_logs WHERE action='Approved Change Applied' AND event_id=$1", [f.event])).rows[0].count, '0');
}));

test('TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04: structured references/settings are snapshotted but never applied early', () => run(async f => {
  const layout = randomUUID(), feature = randomUUID();
  await f.pool.query("INSERT INTO room_layouts(id,code,label) VALUES ($1,'change_layout','Seminar')", [layout]);
  await f.pool.query("INSERT INTO accessibility_features(id,code,label) VALUES ($1,'change_feature','Step-free')", [feature]);
  const request = await f.submit({ layoutId: layout, accessibilityFeatureIds: [feature, feature],
    registrationEnabled: true, waitlistEnabled: true,
    registrationDates: { opensAt: '2027-02-01T09:00:00+08:00', closesAt: '2027-02-28T18:00:00+08:00' },
    withdrawalDeadline: '2027-02-28T12:00:00+08:00' });
  assert.deepEqual(request.requested_changes.before, { layoutId: null, accessibilityFeatureIds: [], registrationEnabled: false,
    waitlistEnabled: false, registrationDates: { opensAt: null, closesAt: null }, withdrawalDeadline: null });
  const view = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.deepEqual(view.references, { layouts: [{ id: layout, label: 'Seminar' }], accessibility: [{ id: feature, label: 'Step-free' }] });
  assert.deepEqual(request.requested_changes.fields.accessibilityFeatureIds, [feature]);
  const preview = await previewToken(f, request.id);
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token })).status, 'applied');
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.registrationEnabled, true);
  assert.equal(current.layoutId, layout);
  assert.deepEqual(current.accessibilityFeatureIds, [feature]);
  assert.deepEqual(current.registrationDates, { opensAt: '2027-02-01T01:00:00.000Z', closesAt: '2027-02-28T10:00:00.000Z' });
}));

test('TC_E10S01_04: registration-window and accessibility changes make a pending request stale', () => run(async f => {
  const request = await f.submit({ registrationDates: { opensAt: '2027-02-01T00:00:00Z', closesAt: null } });
  await f.pool.query("UPDATE events SET registration_closes_at='2027-02-28T00:00:00Z' WHERE id=$1", [f.event]);
  await assert.rejects(f.decide(request.id), /changed since submission/);
  const feature = randomUUID();
  await f.pool.query("INSERT INTO accessibility_features(id,code,label) VALUES ($1,'stale_feature','Step-free')", [feature]);
  const features = await f.submit({ accessibilityFeatureIds: [feature] });
  await f.pool.query('INSERT INTO event_accessibility_needs(event_id,feature_id) VALUES ($1,$2)', [f.event, feature]);
  await assert.rejects(f.decide(features.id), /changed since submission/);
}));

test('TC_E10S01_01 / TC_E10S01_04: missing/deleted reference values refuse submission/approval but permit decline', () => run(async f => {
  await assert.rejects(f.submit({ layoutId: randomUUID() }), /no longer exists/);
  await assert.rejects(f.submit({ accessibilityFeatureIds: [randomUUID()] }), /no longer exists/);
  const layout = randomUUID();
  await f.pool.query("INSERT INTO room_layouts(id,code,label) VALUES ($1,'deleted_layout','Seminar')", [layout]);
  const request = await f.submit({ layoutId: layout });
  await f.pool.query('DELETE FROM room_layouts WHERE id=$1', [layout]);
  await assert.rejects(f.decide(request.id), /no longer exists/);
  assert.equal((await f.decide(request.id, 'decline')).status, 'declined');
}));

test('TC_E10S01_01: clearing existing settings is distinct from omitted fields', () => run(async f => {
  await f.pool.query(`UPDATE events SET registration_enabled=true,waitlist_enabled=true,
    registration_opens_at='2027-02-01T00:00:00Z',registration_closes_at='2027-02-28T00:00:00Z',
    withdrawal_deadline='2027-02-28T00:00:00Z' WHERE id=$1`, [f.event]);
  const request = await f.submit({ registrationEnabled: false, waitlistEnabled: false,
    registrationDates: { opensAt: null, closesAt: null }, withdrawalDeadline: null });
  assert.equal(request.requested_changes.fields.registrationEnabled, false);
  assert.equal(request.requested_changes.fields.withdrawalDeadline, null);
  const preview = await previewToken(f, request.id);
  assert.equal((await decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token })).status, 'applied');
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.registrationEnabled, false);
  assert.equal(current.waitlistEnabled, false);
  assert.deepEqual(current.registrationDates, { opensAt: null, closesAt: null });
  assert.equal(current.withdrawalDeadline, null);
}));

test('TC_E10S01_04: approved registration enablement shares the preview revision and nullable-window validation', () => run(async f => {
  const { previewEventChange } = await import('../src/modules/changeManagement/eventChange.js');
  const fields = { registrationEnabled: true, registrationDates: { opensAt: null, closesAt: '2027-02-28T00:00:00Z' } };
  const request = await f.submit(fields);
  const preview = await previewToken(f, request.id);
  assert.equal(preview.token, preview.revision);
  await assert.rejects(updateEventInformationWithNotifications(f.pool, f.coordinator, f.event, fields), /valid opening and closing/);
  await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'approve', previewToken: preview.token });
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.registrationEnabled, true);
  assert.deepEqual(current.registrationDates, { opensAt: null, closesAt: '2027-02-28T00:00:00.000Z' });
  // Shared callers retain their previous direct-edit contract and revision shape.
  const direct = await previewEventChange(f.pool, f.coordinator, f.event, { description: 'Direct preview' });
  assert.match(direct.revision, /^[0-9a-f]{32}$/);
}));


test('TC_E10S01_01: missing Coordinator hides submission but preserves Organiser history access', () => run(async f => {
  await f.pool.query('UPDATE events SET coordinator_id=NULL WHERE id=$1', [f.event]);
  const view = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.deepEqual(view.permissions, { canSubmit: false, canDecide: false });
  assert.equal(view.current.title, 'Original');
  await assert.rejects(f.submit(), { status: 409 });
}));

test('TC_E10S01_02: viewing requests does not block an Event writer while the read transaction remains open', { timeout: 10000 }, () => run(async f => {
  let reached!: () => void, resume!: () => void;
  const paused = new Promise<void>(resolve => { reached = resolve; });
  const released = new Promise<void>(resolve => { resume = resolve; });
  const readPool = {
    query: f.pool.query.bind(f.pool),
    connect: async () => {
      const client = await f.pool.connect();
      return { release: () => client.release(), query: async (sql: string, values?: unknown[]) => {
        const result = await client.query(sql, values);
        if (sql.includes('SELECT * FROM change_requests')) { reached(); await released; }
        return result;
      } };
    },
  } as unknown as Pool;
  const listing = listChangeRequests(readPool, f.organiser, f.event);
  const writer = await f.pool.connect();
  try {
    await Promise.race([paused, listing.then(() => { throw new Error('Read did not pause'); })]);
    await writer.query('BEGIN');
    // Fails immediately with55P03 if the reader retains an Event row lock.
    await writer.query('SELECT id FROM events WHERE id=$1 FOR UPDATE NOWAIT', [f.event]);
    await writer.query("UPDATE events SET title='Concurrent edit' WHERE id=$1", [f.event]);
    await writer.query('COMMIT');
  } finally {
    await writer.query('ROLLBACK'); writer.release(); resume(); await listing;
  }
  assert.equal((await f.pool.query('SELECT title FROM events WHERE id=$1', [f.event])).rows[0].title, 'Concurrent edit');
}));


test('TC_E10S01_04: layout/accessibility preview rolls back, then applies atomically with venue flags and capacity warning', () => run(async f => {
  const b = await booking(f);
  const layout = randomUUID(), feature = randomUUID();
  await f.pool.query("INSERT INTO room_layouts(id,code,label) VALUES($1,'smaller_layout','Seminar')", [layout]);
  await f.pool.query('INSERT INTO venue_supported_layouts(venue_id,layout_id,capacity) VALUES($1,$2,20)', [b.venue, layout]);
  await f.pool.query("INSERT INTO accessibility_features(id,code,label) VALUES($1,'layout_step_free','Step free')", [feature]);
  const session = (await f.pool.query('SELECT id FROM sessions WHERE event_id=$1', [f.event])).rows[0].id;
  await f.pool.query(`WITH people AS (
    INSERT INTO users(email,password_hash,full_name,role)
    SELECT 'layout-' || gen_random_uuid() || '@example.test','synthetic','Attendee','attendee' FROM generate_series(1,21) RETURNING id),
    registrations AS (
    INSERT INTO event_registrations(event_id,attendee_id,status) SELECT $1,id,'registered' FROM people RETURNING id)
    INSERT INTO event_registration_sessions(registration_id,event_id,session_id) SELECT id,$1,$2 FROM registrations`, [f.event, session]);
  const request = await f.submit({ layoutId: layout, accessibilityFeatureIds: [feature], title: 'Changed with requirements' });
  const preview = await previewToken(f, request.id);
  assert.deepEqual(preview.impact.bookings[0].reasons, ['layout', 'accessibility', 'capacity']);
  assert.equal(preview.impact.bookings[0].capacity, 20);
  assert.deepEqual(preview.overSubscription.map(over => [over.scope, over.registered, over.capacity]), [['session',21,20],['event',21,20]]);
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.layoutId, null);
  assert.equal((await f.pool.query('SELECT count(*) FROM event_accessibility_needs WHERE event_id=$1', [f.event])).rows[0].count, '0');
  const audits = (await f.pool.query('SELECT count(*) FROM audit_logs')).rows[0].count;
  await f.pool.query(`CREATE FUNCTION fail_layout_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'layout outbox failure'; END $$;
    CREATE TRIGGER fail_layout_notice BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION fail_layout_notice()`);
  await assert.rejects(decideChangeRequest(f.pool, f.coordinator, f.event, request.id,
    { decision: 'approve', previewToken: preview.token }), /layout outbox failure/);
  assert.equal((await f.pool.query('SELECT count(*) FROM audit_logs')).rows[0].count, audits);
  const unchanged = await listChangeRequests(f.pool, f.organiser, f.event);
  assert.equal(unchanged.requests[0].status, 'pending');
  assert.equal(unchanged.current.title, 'Original');
  assert.deepEqual(unchanged.current.accessibilityFeatureIds, []);
  await f.pool.query('DROP TRIGGER fail_layout_notice ON notification_deliveries');
  await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'approve', previewToken: preview.token });
  assert.equal((await f.pool.query("SELECT count(*) FROM event_registrations WHERE event_id=$1 AND status='registered'", [f.event])).rows[0].count, '21');
  assert.equal((await f.pool.query('SELECT layout_id FROM sessions WHERE event_id=$1', [f.event])).rows[0].layout_id, layout);
  assert.equal((await f.pool.query('SELECT requires_reconfirmation FROM venue_bookings WHERE id=$1', [b.id])).rows[0].requires_reconfirmation, true);
  assert.equal((await f.pool.query('SELECT count(*) FROM notifications WHERE user_id=$1', [b.staff])).rows[0].count, '1');
  const clear = await f.submit({ layoutId: null, accessibilityFeatureIds: [] });
  const clearing = await previewToken(f, clear.id);
  await decideChangeRequest(f.pool, f.coordinator, f.event, clear.id, { decision: 'approve', previewToken: clearing.token });
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.layoutId, null); assert.deepEqual(current.accessibilityFeatureIds, []);
}));


test('TC_E10S01_04: the trusted primitive validates structured values and does not open direct-edit access', () => run(async f => {
  const { updateEventInformation } = await import('../src/modules/eventVisibility/service.js');
  const q = <T,>(sql: string, values?: unknown[]) => f.pool.query<T & import('pg').QueryResultRow>(sql, values);
  for (const changes of [{ layoutId: 'bad' }, { accessibilityFeatureIds: ['bad'] }, { accessibilityFeatureIds: 'bad' },
    { layoutId: randomUUID() }, { accessibilityFeatureIds: [randomUUID()] }]) {
    await assert.rejects(updateEventInformation(q, f.coordinator, f.event, changes, true), /valid|no longer exists/);
  }
  await assert.rejects(updateEventInformation(q, f.coordinator, f.event, { layoutId: null }), /No editable/);
  assert.deepEqual((await listChangeRequests(f.pool, f.organiser, f.event)).current.accessibilityFeatureIds, []);
}));


test('TC_E10S01_04: Event requirements do not overwrite individually authored multi-Session requirements', () => run(async f => {
  const b = await booking(f);
  const layout = randomUUID(), first = (await f.pool.query('SELECT id FROM sessions WHERE event_id=$1', [f.event])).rows[0].id;
  await f.pool.query("INSERT INTO room_layouts(id,code,label) VALUES($1,'multi_change','Seminar')", [layout]);
  await f.pool.query(`INSERT INTO sessions(event_id,session_range,expected_attendance)
    VALUES($1,tstzrange('2027-03-01 10:00Z','2027-03-01 11:00Z','[)'),10)`, [f.event]);
  const request = await f.submit({ layoutId: layout });
  const preview = await previewToken(f, request.id);
  assert.deepEqual(preview.impact.bookings.map(item => item.id), [b.id]);
  await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'approve', previewToken: preview.token });
  assert.equal((await f.pool.query('SELECT layout_id FROM events WHERE id=$1', [f.event])).rows[0].layout_id, layout);
  assert.equal((await f.pool.query('SELECT layout_id FROM sessions WHERE id=$1', [first])).rows[0].layout_id, null);
  assert.equal((await f.pool.query('SELECT count(*) FROM sessions WHERE event_id=$1 AND layout_id IS NOT NULL', [f.event])).rows[0].count, '0');
}));


test('TC_E10S01_04: affected apply interrupts first Safety Review and reconfirmation requests a fresh SO check', () => run(async f => {
  const b = await booking(f);
  const second = await booking(f, 'Second Preview Hall');
  const officer = randomUUID();
  await f.pool.query("INSERT INTO users(id,email,password_hash,full_name,role) VALUES($1,$2,'unused','Synthetic SO','safety_officer')", [officer, `${officer}@example.test`]);
  await f.pool.query("UPDATE events SET status='safety_review',equipment_requirements='none_required' WHERE id=$1", [f.event]);
  const request = await f.submit({ startAt: '2027-03-01T10:00:00Z' });
  const preview = await previewToken(f, request.id);
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'safety_review', 'preview must not replan');
  await decideChangeRequest(f.pool, f.coordinator, f.event, request.id, { decision: 'approve', previewToken: preview.token });
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'planning');
  assert.equal((await f.pool.query('SELECT status,requires_reconfirmation FROM venue_bookings WHERE id=$1', [b.id])).rows[0].status, 'confirmed');
  const staff = { id: b.staff, role: 'venue_staff', isActive: true } as AuthenticatedUser;
  assert.equal((await reconfirmBooking(f.pool, staff, b.id)).status, 200);
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'planning', 'wait for the last flagged booking');
  assert.equal((await f.pool.query("SELECT count(*) FROM notifications WHERE user_id=$1 AND title='Safety check needed'", [officer])).rows[0].count, '0');
  const secondStaff = { id: second.staff, role: 'venue_staff', isActive: true } as AuthenticatedUser;
  assert.equal((await reconfirmBooking(f.pool, secondStaff, second.id)).status, 200);
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'safety_review');
  assert.equal((await f.pool.query("SELECT count(*) FROM notifications WHERE user_id=$1 AND title='Safety check needed'", [officer])).rows[0].count, '1');
  const history = (await f.pool.query("SELECT old_value,new_value FROM audit_logs WHERE event_id=$1 AND entity_type='event' AND field_changed='status' ORDER BY occurred_at,id", [f.event])).rows;
  assert.deepEqual(history.map(row => [row.old_value,row.new_value]), [['safety_review','planning'],['planning','safety_review']]);
}));

test('TC_E10S01_04: safe-only apply leaves Safety Review unchanged', () => run(async f => {
  await f.pool.query("UPDATE events SET status='safety_review' WHERE id=$1", [f.event]);
  const request = await f.submit({ title: 'Safe new title' });
  await f.decide(request.id);
  assert.equal((await listChangeRequests(f.pool, f.coordinator, f.event)).event.status, 'safety_review');
}));
