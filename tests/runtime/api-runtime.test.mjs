import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = join(root, 'node_modules', '.cache');
const allowedEnvironment = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR',
  'COMSPEC', 'PATHEXT', 'APPDATA', 'LOCALAPPDATA', 'SYSTEMDRIVE', 'PROCESSOR_ARCHITECTURE',
]);
const environment = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => allowedEnvironment.has(name.toUpperCase()))),
  NODE_ENV: 'production',
  APP_ENV: 'runtime-test',
  APP_URL: 'https://connectsphere.example.com',
};
const allowedOriginHeader = { origin: 'https://connectsphere.example.com' };
let output;

before(async () => {
  await mkdir(cache, { recursive: true });
  output = await mkdtemp(join(cache, 'connectsphere-runtime-'));
  await writeFile(join(output, 'package.json'), JSON.stringify({ type: 'module' }));
  const compile = spawnSync(process.execPath, [
    join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    '-p', join(root, 'backend', 'tsconfig.json'),
    '--noEmit', 'false', '--rootDir', root, '--outDir', output,
  ], { cwd: root, env: environment, encoding: 'utf8', timeout: 120_000 });
  assert.equal(compile.error, undefined, compile.error?.message);
  assert.equal(compile.status, 0, compile.stdout + compile.stderr);
});

after(async () => {
  if (!output) return;
  const target = await realpath(output);
  assert.equal(dirname(target), await realpath(cache));
  assert.ok(relative(await realpath(root), target).startsWith(`node_modules${sep}.cache${sep}`));
  assert.ok(target.startsWith(resolve(cache, 'connectsphere-runtime-')));
  await rm(target, { recursive: true, force: true });
});

function invoke(path, method, request = {}, extraEnvironment = {}) {
  const script = `
    globalThis.fetch = async () => { throw new Error('Unexpected provider request in runtime smoke test'); };
    const { default: handler } = await import(process.argv[1]);
    let status;
    let body;
    const headers = {};
    const response = {
      setHeader(name, value) { headers[name] = value; },
      status(value) { status = value; return this; },
      json(value) { body = value; return this; },
    };
    await handler({ method: process.argv[2], headers: {}, body: {}, ...JSON.parse(process.argv[3]) }, response);
    process.stdout.write(JSON.stringify({ status, body, headers }));
  `;
  const run = spawnSync(process.execPath, [
    '--input-type=module', '--eval', script, pathToFileURL(join(output, path)).href, method, JSON.stringify(request),
  ], { cwd: root, env: { ...environment, ...extraEnvironment }, encoding: 'utf8', timeout: 15_000 });
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  return JSON.parse(run.stdout);
}

test('compiled health handler loads under Node and reports configuration without provider calls', () => {
  const response = invoke('api/health.js', 'GET');
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.app, 'sgconnectsphere');
  assert.deepEqual(response.body.readiness, {
    app: true, upstashRedis: false, brevo: false, cronSecret: false, database: false,
  });
});

for (const [path, method, expected, expectedError, request] of [
  // Consolidated /api/events serves GET (browse), POST (create), PATCH (edit
  // draft), and DELETE (delete draft) from one file. Post-ADR-015 every
  // branch reads the same cookie session via currentUser() and throws
  // AccessError(401, 'Sign in to continue.') when the cookie is missing.
  // No provider or database query fires before the auth check, so the
  // "without invoking a provider" invariant still holds. PUT stays
  // genuinely unsupported, covering the 405 branch.
  ['api/events.js', 'GET', 401, 'Sign in to continue.'],
  ['api/events.js', 'POST', 401, 'Sign in to continue.', { headers: allowedOriginHeader }],
  ['api/events.js', 'PATCH', 401, 'Sign in to continue.', { headers: allowedOriginHeader }],
  ['api/events.js', 'DELETE', 401, 'Sign in to continue.', { headers: allowedOriginHeader }],
  ['api/events.js', 'PUT', 405, 'method_not_allowed'],
  ['api/notifications/send.js', 'GET', 405, 'method_not_allowed'],
  ['api/notifications/send.js', 'POST', 401, 'unauthorized'],
  ['api/cron/outbox-relay.js', 'POST', 405, 'method_not_allowed'],
  ['api/cron/outbox-relay.js', 'GET', 401, 'unauthorized'],
]) {
  test(`compiled ${path} rejects ${method} without invoking a provider`, () => {
    const response = invoke(path, method, request);
    assert.equal(response.status, expected);
    assert.equal(response.body.error, expectedError);
  });
}

test('compiled api/events.js rejects mutating requests from unauthorized origins with 403', () => {
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = invoke('api/events.js', method, { headers: { origin: 'https://evil.attacker.com' } });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Request origin not allowed.');
  }
});

test('compiled api/events.js rejects mutating requests with missing origin with 403', () => {
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = invoke('api/events.js', method, { headers: {} });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Request origin not allowed.');
  }
});

// GET ?mine=1 dispatches to handleGetMine instead of the default browse
// branch. Both go through currentUser() (post-ADR-015 unified cookie auth)
// and throw AccessError(401, 'Sign in to continue.') when the cookie is
// missing, so the response shape matches the default GET row above. Value
// of a dedicated row: proves the query-param dispatch does not skip auth
// before hitting handleGetMine's requireOrganiserWithClient() and does not
// invoke a provider before the guard trips. Matches the runtime-shape
// contract other query-param variants use (see the outbox-relay
// ?task=worker rewrite test below).
test('compiled api/events.js rejects GET ?mine=1 without a session', () => {
  const response = invoke('api/events.js', 'GET', { url: '/api/events?mine=1' });
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Sign in to continue.');
});

const internal = { headers: { authorization: 'Bearer synthetic-internal-credential' } };
const internalEnvironment = { CRON_SECRET: 'synthetic-internal-credential' }; // pragma: allowlist secret - isolated test process only
for (const [path, error, request] of [
  ['api/cron/outbox-relay.js', 'notification_relay_not_enabled', internal],
  // /api/cron/notification-worker rewrites to this same function with ?task=worker (see vercel.json)
  ['api/cron/outbox-relay.js', 'notification_delivery_not_enabled', { ...internal, url: '/api/cron/outbox-relay?task=worker' }],
]) {
  test(`authorized compiled ${path}${request.url ? ` (${request.url})` : ''} stays disabled without activation`, () => {
    const result = invoke(path, 'GET', request, internalEnvironment);
    assert.equal(result.status, 503);
    assert.equal(result.body.error, error);
  });
}

// E06-S05: the hold-expiry branch needs the database; without one it fails
// closed with its own error rather than falling through to the relay.
// The daily /api/cron/hold-expiry cron rewrites here with ?task=holds (see vercel.json).
test('authorized compiled api/cron/outbox-relay.js (?task=holds) reports expiry unavailable without a database', () => {
  const result = invoke('api/cron/outbox-relay.js', 'GET', { ...internal, url: '/api/cron/outbox-relay?task=holds' }, internalEnvironment);
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'hold_expiry_unavailable');
});

test('compiled send handler rejects arbitrary email content before accessing storage', () => {
  const result = invoke('api/notifications/send.js', 'POST', {
    ...internal, body: { to: 'recipient@example.invalid', subject: 'Synthetic', html: '<p>Synthetic</p>' },
  }, internalEnvironment);
  assert.equal(result.status, 400);
  assert.deepEqual(result.body.required, ['deliveryId']);
});

test('compiled send handler reports unavailable storage without exposing configuration', () => {
  const result = invoke('api/notifications/send.js', 'POST', {
    ...internal, body: { deliveryId: '00000000-0000-4000-8000-000000000001' },
  }, internalEnvironment);
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { error: 'notification_storage_unavailable' });
});

test('compiled venue booking submission rejects origin and anonymous actors before database access', () => {
  const environment = { APP_URL: 'https://app.example.test' };
  const denied = invoke('api/venues/index.js', 'POST', { headers: { origin: 'https://other.example.test' }, body: { action: 'request_booking' } }, environment);
  assert.equal(denied.status, 403);
  const missing = invoke('api/venues/index.js', 'POST', { headers: {}, body: { action: 'request_booking' } }, environment);
  assert.equal(missing.status, 403);
  const anonymous = invoke('api/venues/index.js', 'POST', { headers: { origin: 'https://app.example.test' }, body: { action: 'request_booking' } }, environment);
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.body.error, 'Sign in to continue.');
});

test('compiled Pending withdrawal shares origin and identity protection', () => {
  const environment = { APP_URL: 'https://app.example.test' };
  for (const [origin,status] of [['https://other.example.test',403],['https://app.example.test',401]]) {
    const result=invoke('api/venues/index.js','POST',{headers:{origin},body:{action:'withdraw_booking',booking_id:'00000000-0000-4000-8000-000000000001'}},environment);
    assert.equal(result.status,status);
  }
});

test('compiled primary selection protects origin and requires a signed-in actor', () => {
  const environment={APP_URL:'https://app.example.test'};
  for(const [origin,status] of [['https://other.example.test',403],['https://app.example.test',401]]) {
    const result=invoke('api/venues/index.js','POST',{headers:{origin},body:{action:'set_primary',booking_id:'00000000-0000-4000-8000-000000000001'}},environment);
    assert.equal(result.status,status);
  }
});

test('compiled venue block history and lifted list require a signed-in actor (E05-S06, T-91)', () => {
  const venue = '00000000-0000-4000-8000-000000000001';
  for (const url of [`/api/venues?id=${venue}&blocks=1&history=${venue}`, `/api/venues?id=${venue}&blocks=1&lifted=1`]) {
    const result = invoke('api/venues/index.js', 'GET', { url }, { APP_URL: 'https://app.example.test' });
    assert.equal(result.status, 401);
    assert.equal(result.body.error, 'Sign in to continue.');
  }
});

// E08-S05 completion dispatch must authenticate before touching PostgreSQL.
for (const method of ['GET','POST']) test(`completion ${method} refuses a missing session before database access`,()=>{
 const request = method === 'POST'
   ? { url: '/api/events?completion=1&id=COMP-1', headers: allowedOriginHeader }
   : { url: '/api/events?completion=1&id=COMP-1' };
 const response=invoke('api/events.js',method,request);
 assert.equal(response.status,401);assert.equal(response.body.error,'Sign in to continue.');
});
test('completion POST rejects missing origin before database access', () => {
 const response = invoke('api/events.js', 'POST', { url: '/api/events?completion=1&id=COMP-1', headers: {} });
 assert.equal(response.status, 403);
 assert.equal(response.body.error, 'Request origin not allowed.');
});
test('completion evaluator rejects missing internal credentials in production',()=>{
 const response=invoke('api/cron/outbox-relay.js','GET',{url:'/api/cron/outbox-relay?task=completion'});
 assert.equal(response.status,401);
});
