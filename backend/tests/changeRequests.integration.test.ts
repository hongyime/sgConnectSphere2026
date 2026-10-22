import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import { submitChangeRequest, decideChangeRequest, listChangeRequests } from '../src/modules/changeManagement/requests.js';

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
async function run(work: (f: Fixture) => Promise<void>) {
  const f = await fixture();
  try { await work(f); } finally { await f.close(); }
}

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

test('TC_E10S01_04: arrangement changes are approved but never applied without E10-S02', () => run(async f => {
  const request = await f.submit({ expectedAttendance: 50 });
  assert.equal((await f.decide(request.id)).status, 'approved');
  await assert.rejects(f.decide(request.id, 'apply'), /waiting for the arrangement check/);
  assert.equal((await listChangeRequests(f.pool, f.organiser, f.event)).current.expectedAttendance, 40);
  await f.pool.query('UPDATE events SET expected_attendance=45 WHERE id=$1', [f.event]);
  await assert.rejects(f.decide(request.id, 'apply'), /changed since submission/);
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
  assert.equal((await f.decide(request.id)).status, 'approved');
  await assert.rejects(f.decide(request.id, 'apply'), /waiting for the arrangement check/);
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.registrationEnabled, false);
  assert.equal(current.layoutId, null);
  assert.deepEqual(current.accessibilityFeatureIds, []);
  assert.deepEqual(current.registrationDates, { opensAt: null, closesAt: null });
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
  assert.equal((await f.decide(request.id)).status, 'approved');
  const current = (await listChangeRequests(f.pool, f.organiser, f.event)).current;
  assert.equal(current.registrationEnabled, true);
  assert.equal(current.withdrawalDeadline, '2027-02-28T00:00:00.000Z');
}));
