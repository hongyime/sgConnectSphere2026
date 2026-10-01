// E11-S01 / PR #143: handler tests use the local query/auth doubles below.
// Prove all-role ownership, Origin and request validation before database access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInboxHandler } from '../src/modules/eventNotifications/inbox.js';
import { AccessError, type Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { VercelRequest } from '../src/vercel.js';
import { USER_ROLES } from '../src/modules/shared/roles.js';

const id = '11111111-1111-4111-8111-111111111111';
const user: AuthenticatedUser = { id: 'owner', email: 'owner@example.test', role: 'attendee', isActive: true, failedLoginCount: 0 };
function fixture(options: { user?: AuthenticatedUser; anonymous?: boolean; missing?: boolean; fail?: boolean } = {}) {
  const calls: {sql: string; values?: unknown[]}[] = [];
  const query: Query = async <T extends Record<string, unknown>>(sql: string, values?: unknown[]) => {
    calls.push({sql, values});
    if (options.fail) throw new Error('PRIVATE database failure');
    return { rows: (options.missing ? [] : [{id, is_read: sql.startsWith('UPDATE')}]) as T[] };
  };
  const handler = createInboxHandler(query, async () => {
    if (options.anonymous) throw new AccessError(401, 'Sign in to continue.');
    return options.user ?? user;
  }, (origin) => origin === 'https://app.example.test');
  return {calls, async request(request: Partial<VercelRequest> = {}) {
    let status = 200; let body: any;
    const headers: Record<string, string> = {};
    await handler({ method:'GET', headers:{origin:'https://app.example.test'}, ...request }, {
      setHeader: (key,value) => {headers[key]=value;},
      status: code => {status=code; return {json: value => {body=value;}};}, json: value => {body=value;},
    });
    return {status,body,headers};
  }};
}
for (const role of USER_ROLES) {
  test(`TC_E11S01_06: ${role} lists only own notifications newest first`, async () => {
    const f=fixture({user:{...user,role}}); const result=await f.request();
    assert.equal(result.status,200);
    assert.deepEqual(f.calls[0].values,[user.id]);
    assert.match(f.calls[0].sql,/WHERE user_id = \$1 AND event_id IS NOT NULL\s+ORDER BY created_at DESC, id DESC LIMIT 100/);
    assert.equal(result.headers['Cache-Control'],'private, no-store');
  });
}
test('TC_E11S01_07: read update is owned and preserves the original read timestamp', async () => {
  const f=fixture(); const result=await f.request({method:'POST',body:{action:'mark_read',id}});
  assert.equal(result.status,200); assert.equal(result.body.notification.is_read,true);
  assert.deepEqual(f.calls[0].values,[id,user.id]);
  assert.match(f.calls[0].sql,/read_at = COALESCE/);
  assert.match(f.calls[0].sql,/WHERE id = \$1 AND user_id = \$2 AND event_id IS NOT NULL/);
});
test('TC_E11S01_07: another user notification and missing notification return the same 404', async () => {
  const f=fixture({missing:true}); assert.equal((await f.request({method:'POST',body:{action:'mark_read',id}})).status,404);
});
test('rejects anonymous, inactive and locked callers before database access', async () => {
  for (const options of [{anonymous:true},{user:{...user,isActive:false}},{user:{...user,failedLoginCount:5}}]) {
    const f=fixture(options); assert.ok([401,403].includes((await f.request()).status)); assert.equal(f.calls.length,0);
  }
});
test('rejects cross-origin writes and client supplied identity', async () => {
  const f=fixture();
  assert.equal((await f.request({method:'POST',headers:{origin:'https://other.example.test'},body:{action:'mark_read',id}})).status,403);
  for (const body of [{action:'mark_read',id,user_id:'other'},{action:'mark_read',id:'invalid'},null]) {
    assert.equal((await f.request({method:'POST',body})).status,400);
  }
  assert.equal(f.calls.length,0);
});
test('storage errors never disclose database details', async () => {
  const result=await fixture({fail:true}).request();
  assert.equal(result.status,503); assert.ok(!JSON.stringify(result.body).includes('PRIVATE'));
});
