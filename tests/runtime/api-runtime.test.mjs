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
};
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
    app: true, supabase: false, upstashRedis: false, brevo: false, cronSecret: false, database: false,
  });
});

for (const [path, method, expected, expectedError] of [
  // Consolidated /api/events serves both GET (browse, auth check via AccessError)
  // and POST (create, direct auth check). See ADR-014 for the one-file-per-route
  // rule and api/events.ts for the method dispatch. GET without a session cookie
  // trips currentUser's AccessError before any database query, so the "without
  // invoking a provider" invariant still holds.
  ['api/events.js', 'GET', 401, 'Sign in to continue.'],
  ['api/events.js', 'POST', 401, 'unauthorized'],
  // SCRUM-27: PATCH/DELETE are now real, bearer-auth-gated branches (draft
  // edit/delete), not unsupported methods - see requireOrganiserBearer in
  // api/events.ts. PUT stays genuinely unsupported, covering the 405 branch.
  ['api/events.js', 'PATCH', 401, 'unauthorized'],
  ['api/events.js', 'DELETE', 401, 'unauthorized'],
  ['api/events.js', 'PUT', 405, 'method_not_allowed'],
  ['api/notifications/send.js', 'GET', 405, 'method_not_allowed'],
  ['api/notifications/send.js', 'POST', 401, 'unauthorized'],
  ['api/cron/outbox-relay.js', 'POST', 405, 'method_not_allowed'],
  ['api/cron/outbox-relay.js', 'GET', 401, 'unauthorized'],
]) {
  test(`compiled ${path} rejects ${method} without invoking a provider`, () => {
    const response = invoke(path, method);
    assert.equal(response.status, expected);
    assert.equal(response.body.error, expectedError);
  });
}

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
