import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile, updateProfile, ProfileValidationError, type Profile, type ProfileRepository } from '../src/modules/accessControl/profile.js';
import { createProfileRepository } from '../src/modules/accessControl/profileRepository.js';
import { createProfileHandler } from '../../api/account/profile.js';
import { AccessError, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelRequest, VercelResponse } from '../src/vercel.js';

const user: AuthenticatedUser = { id: 'user-a', email: 'a@example.test', role: 'event_organiser', clientOrgId: 'org-a', isActive: true, failedLoginCount: 0 };
const valid = { full_name: 'Alexandra Organiser', email: '  NEW@Example.test  ', contact_number: '9876 5432' };
// E14-S02: loadProfile/updateProfile write one audit row on a 403 denial.
// Not the focus of these fixtures, so just accept the write.
const auditQuery: Query = async () => ({ rows: [] });
function fixture() {
  const rows = new Map<string, Profile>([
    ['user-a', { id: 'user-a', full_name: 'Alex', email: 'a@example.test', contact_number: '9123 4567', client_org_id: 'org-a', organisation_name: 'Client A' }],
    ['user-b', { id: 'user-b', full_name: 'Bob', email: 'b@example.test', contact_number: '9000 0000', client_org_id: 'org-b', organisation_name: 'Client B' }],
  ]);
  let writes = 0;
  const repository: ProfileRepository = {
    async load(id) { return rows.get(id) ?? null; },
    async update(id, input) {
      if ([...rows.values()].some(row => row.id !== id && row.email.toLowerCase() === input.email)) {
        throw new ProfileValidationError({ email: ['This email address is already in use'] }, 409);
      }
      const previous = rows.get(id);
      if (!previous) return null;
      const next = { ...previous, ...input };
      rows.set(id, next); writes++;
      return next;
    },
  };
  return { rows, repository, writes: () => writes };
}

test('signed-in user loads, saves all editable fields and reloads normalized values', async () => {
  const { repository, rows } = fixture();
  const other = { ...rows.get('user-b')! };
  assert.equal((await loadProfile(auditQuery, repository, user)).full_name, 'Alex');
  const saved = await updateProfile(auditQuery, repository, user, valid);
  assert.equal(saved.full_name, valid.full_name);
  assert.equal(saved.email, 'new@example.test');
  assert.equal(saved.contact_number, valid.contact_number);
  assert.equal(saved.client_org_id, 'org-a');
  assert.equal(saved.organisation_name, 'Client A');
  assert.deepEqual(await loadProfile(auditQuery, repository, user), saved);
  assert.deepEqual(rows.get('user-b'), other);
});

test('own current email can be retained with different casing and whitespace', async () => {
  const { repository } = fixture();
  assert.equal((await updateProfile(auditQuery, repository, user, { ...valid, email: ' A@EXAMPLE.TEST ' })).email, user.email);
});

for (const email of ['b@example.test', ' B@EXAMPLE.TEST ']) {
  test(`rejects duplicate ${email} without partially updating name`, async () => {
    const { repository, rows, writes } = fixture();
    await assert.rejects(updateProfile(auditQuery, repository, user, { ...valid, email }), { status: 409 });
    assert.equal(rows.size, 2); assert.equal(writes(), 0);
    assert.equal(rows.get(user.id)?.full_name, 'Alex');
  });
}

for (const field of ['full_name', 'email', 'contact_number']) {
  for (const value of [undefined, '', '   ', null, 123]) {
    test(`rejects missing/invalid ${field}: ${value}`, async () => {
      const { repository, writes } = fixture();
      await assert.rejects(updateProfile(auditQuery, repository, user, { ...valid, [field]: value }), error =>
        error instanceof ProfileValidationError && Boolean(error.errors[field]));
      assert.equal(writes(), 0);
    });
  }
}
for (const email of ['bad-address', 'a@', 'a b@example.test']) {
  test(`identifies malformed email ${email}`, async () => {
    const { repository, writes } = fixture();
    await assert.rejects(updateProfile(auditQuery, repository, user, { ...valid, email }), error =>
      error instanceof ProfileValidationError && error.errors.email[0] === 'Please enter a valid email address');
    assert.equal(writes(), 0);
  });
}
for (const field of ['id', 'user_id', 'role', 'is_active', 'failed_login_count', 'locked_until', 'deactivated_at', 'password_hash', 'client_org_id', 'organisation', 'organisation_name']) {
  test(`rejects client override ${field}`, async () => {
    const { repository, rows, writes } = fixture();
    await assert.rejects(updateProfile(auditQuery, repository, user, { ...valid, [field]: 'user-b' }), error =>
      error instanceof ProfileValidationError && Boolean(error.errors[field]));
    assert.equal(writes(), 0);
    assert.equal(rows.get('user-b')?.full_name, 'Bob');
  });
}
for (const identity of [undefined, { ...user, isActive: false }, { ...user, failedLoginCount: 5 }, { ...user, lockedUntil: new Date(Date.now() + 60000) }]) {
  test(`denies missing or disabled identity ${JSON.stringify(identity)}`, async () => {
    const { repository, writes } = fixture();
    await assert.rejects(loadProfile(auditQuery, repository, identity), AccessError);
    await assert.rejects(updateProfile(auditQuery, repository, identity, valid), AccessError);
    assert.equal(writes(), 0);
  });
}

async function invoke(handler: ReturnType<typeof createProfileHandler>, request: Partial<VercelRequest>) {
  let status = 0;
  let body: any;
  const headers: Record<string, string> = {};
  const json = (value: unknown) => { body = value; };
  const response: VercelResponse = { setHeader: (name, value) => { headers[name] = value; }, status: code => { status = code; return { json }; }, json };
  await handler({ method: 'GET', headers: {}, ...request }, response);
  return { status, body, headers };
}

test('endpoint uses authenticated identity, rejects unauthenticated and cross-origin writes, and returns field errors', async () => {
  const { repository } = fixture();
  const handler = createProfileHandler(repository, async () => user, () => 'https://app.example.test');
  const loaded = await invoke(handler, { url: '/api/account/profile?user_id=user-b' });
  assert.equal(loaded.body.profile.id, user.id);
  assert.equal(loaded.headers['Cache-Control'], 'private, no-store');
  assert.equal('password_hash' in loaded.body.profile, false);
  assert.equal('role' in loaded.body.profile, false);
  const denied = createProfileHandler(repository, async () => { throw new AccessError(401, 'Sign in'); }, () => 'https://app.example.test');
  assert.equal((await invoke(denied, {})).status, 401);
  assert.equal((await invoke(denied, { method: 'PUT', body: valid })).status, 401);
  assert.equal((await invoke(handler, { method: 'PUT', body: valid })).status, 403);
  assert.equal((await invoke(handler, { method: 'PUT', headers: { origin: 'https://evil.example.test' }, body: valid })).status, 403);
  const invalid = await invoke(handler, { method: 'PUT', headers: { origin: 'https://app.example.test' }, body: { ...valid, email: 'bad' } });
  assert.equal(invalid.status, 400); assert.ok(invalid.body.errors.email);
  const saved = await invoke(handler, { method: 'PUT', headers: { origin: 'https://app.example.test' }, body: valid });
  assert.equal(saved.status, 200); assert.equal(saved.body.profile.email, 'new@example.test');
  assert.equal((await invoke(handler, { method: 'POST' })).status, 405);
});

for (const constraint of ['users_email_key', 'users_email_normalized_key', 'users_email_case_insensitive_idx']) {
  test(`repository translates unique constraint ${constraint}`, async () => {
    const query: Query = async () => { throw { code: '23505', constraint }; };
    await assert.rejects(createProfileRepository(query).update(user.id, valid), error =>
      error instanceof ProfileValidationError && error.status === 409 && Boolean(error.errors.email));
  });
}

test('unexpected database errors do not expose internals', async () => {
  const repository = createProfileRepository(async () => { throw new Error('private database detail'); });
  const handler = createProfileHandler(repository, async () => user, () => 'https://app.example.test');
  const result = await invoke(handler, {});
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result.body).includes('private database detail'), false);
});
