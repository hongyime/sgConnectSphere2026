import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerAccount, type AccountInsert, type AccountRepository } from '../src/modules/accessControl/registration';
import { verifyPassword } from '../src/modules/accessControl/password';
import { createRegistrationHandler } from '../../api/auth/register';

const valid = { full_name: 'Jamie Lee', email: 'jamie@example.com', password: 'LongPassword12!', contact_number: '+65 9000 0000' }; // pragma: allowlist secret - synthetic test credential
function fixture() {
  const rows: AccountInsert[] = [];
  const repository: AccountRepository = { async createAttendee(input) {
    if (rows.some(row => row.email === input.email)) return null;
    rows.push(input);
    return { id: 'test-id', email: input.email, role: 'attendee' };
  } };
  return { rows, repository };
}

test('creates an attendee, hashes password and verifies original credentials', async () => {
  const { rows, repository } = fixture();
  const result = await registerAccount(valid, repository);
  assert.equal(result.status, 201);
  assert.equal(result.body.account?.role, 'attendee');
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].password_hash, valid.password);
  assert.equal('password' in rows[0], false);
  assert.equal(await verifyPassword(valid.password, rows[0].password_hash), true);
  assert.equal(await verifyPassword('WrongPassword12!', rows[0].password_hash), false);
  assert.equal(await verifyPassword(valid.password, 'seed-sha256:invalid'), false);
  assert.equal(JSON.stringify(result).includes('password_hash'), false);
  const other = fixture();
  await registerAccount(valid, other.repository);
  assert.notEqual(rows[0].password_hash, other.rows[0].password_hash);
});

test('normalizes mixed-case email and rejects a differently cased duplicate', async () => {
  const { rows, repository } = fixture();
  const created = await registerAccount({ ...valid, email: '  User@Example.COM  ' }, repository);
  assert.equal(created.status, 201);
  assert.equal(created.body.account?.email, 'user@example.com');
  assert.equal(rows[0].email, 'user@example.com');
  const duplicate = await registerAccount({ ...valid, email: 'USER@example.com' }, repository);
  assert.equal(duplicate.status, 409);
  assert.deepEqual(duplicate.body.errors?.email, ['This email address is already in use']);
  assert.equal(rows.length, 1);
});

test('duplicate email creates only one record', async () => {
  const { rows, repository } = fixture();
  assert.equal((await registerAccount(valid, repository)).status, 201);
  const result = await registerAccount(valid, repository);
  assert.equal(result.status, 409);
  assert.deepEqual(result.body.errors?.email, ['This email address is already in use']);
  assert.equal(rows.length, 1);
});

for (const field of Object.keys(valid)) {
  for (const value of [undefined, '', '   ', 123, null]) {
    test(`rejects invalid required ${field}: ${String(value)}`, async () => {
      const { rows, repository } = fixture();
      const result = await registerAccount({ ...valid, [field]: value }, repository);
      assert.equal(result.status, 400);
      assert.ok(result.body.errors?.[field]);
      assert.equal(rows.length, 0);
    });
  }
}
for (const [password, message] of [
  ['Short1!', '12 characters'], ['longpassword12!', 'uppercase'],
  ['LongPassword!!', 'number'], ['LongPassword12', 'special'],
  ['LongPassword12 ', 'special'],
]) {
  test(`rejects password missing ${message}`, async () => {
    const { rows, repository } = fixture();
    const result = await registerAccount({ ...valid, password }, repository);
    assert.equal(result.status, 400);
    assert.ok(result.body.errors?.password.some(error => error.includes(message)));
    assert.equal(rows.length, 0);
  });
}
for (const role of ['ATTENDEE', 'EVENT_COORDINATOR', 'EVENT_ORGANISER', 'VENUE_STAFF', 'TECHNICAL_SUPPORT', 'admin', 'event_coordinator']) {
  test(`rejects client role ${role}`, async () => {
    const { rows, repository } = fixture();
    const result = await registerAccount({ ...valid, role }, repository);
    assert.equal(result.status, 400);
    assert.ok(result.body.errors?.role);
    assert.equal(rows.length, 0);
  });
}

test('TC_E01S08_06: a password that fails the stated policy blocks the account and names each requirement it fails', async () => {
  const { rows, repository } = fixture();
  const result = await registerAccount({ ...valid, full_name: 'Jordan Tan', email: 'newattendee4@example.com', password: '1234' }, repository); // pragma: allowlist secret - synthetic weak password
  assert.equal(result.status, 400);
  assert.equal(rows.length, 0);
  assert.deepEqual(Object.keys(result.body.errors ?? {}), ['password']);
  assert.deepEqual(result.body.errors?.password, [
    'Password must be at least 12 characters.',
    'Password must include at least one uppercase letter.',
    'Password must include at least one special character.',
  ]);
});

test('rejects invalid email and reports all password corrections', async () => {
  const { rows, repository } = fixture();
  const result = await registerAccount({ ...valid, email: 'invalid', password: 'abc' }, repository);
  assert.equal(result.status, 400);
  assert.ok(result.body.errors?.email);
  assert.equal(result.body.errors?.password.length, 4);
  assert.equal(rows.length, 0);
});

test('endpoint returns method, validation, creation and safe failure responses', async () => {
  const { repository } = fixture();
  const handler = createRegistrationHandler(repository);
  let status = 0;
  let body: unknown;
  const headers: Record<string, string> = {};
  const json = (value: unknown) => { body = value; };
  const response = { setHeader: (key: string, value: string) => { headers[key] = value; }, status: (value: number) => { status = value; return { json }; }, json };
  await handler({ method: 'GET', headers: {} }, response);
  assert.equal(status, 405);
  assert.equal(headers.allow, 'POST');
  await handler({ method: 'POST', headers: {}, body: [] }, response);
  assert.equal(status, 400);
  await handler({ method: 'POST', headers: {}, body: valid }, response);
  assert.equal(status, 201);
  assert.equal(headers['cache-control'], 'no-store');
  const failing = createRegistrationHandler({ async createAttendee() { throw new Error('secret connection data'); } });
  await failing({ method: 'POST', headers: {}, body: valid }, response);
  assert.equal(status, 500);
  assert.equal(JSON.stringify(body).includes('secret'), false);
});
