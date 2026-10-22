import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChangeRequest } from '../src/modules/changeManagement/requests.js';
import handler from '../../api/events.js';
import type { VercelResponse } from '../src/vercel.js';

test('TC_E10S01_01: explicit field allowlist, trimmed text and canonical zoned dates', () => {
  assert.deepEqual(parseChangeRequest({ description: ' Change ', changes: {
    title: ' New title ', description: ' Details ', purpose: ' Purpose ', expectedAttendance: 20,
    startAt: '2027-03-01T09:00:00+08:00', endAt: '2027-03-01T10:00:00+08:00',
  } }), { description: 'Change', fields: { title: 'New title', description: 'Details', purpose: 'Purpose',
    expectedAttendance: 20, startAt: '2027-03-01T01:00:00.000Z', endAt: '2027-03-01T02:00:00.000Z' } });
});

test('TC_E10S01_01: reject malformed, empty, unsafe or oversized changes before SQL', () => {
  const bad = [null, [], {}, { description: '' }, { description: 'x'.repeat(4001), changes: { title: 'a' } },
    ...[{}, [], null, { action: 'cancel' }, { status: 'confirmed' }, { constructor: 'x' },
      { title: '' }, { title: 'x'.repeat(241) }, { description: 'x'.repeat(4001) },
      { purpose: null }, { expectedAttendance: 0 }, { expectedAttendance: 1.5 },
      { expectedAttendance: 2147483648 }, { expectedAttendance: '2' },
      { startAt: 'tomorrow' }, { endAt: '2027-01-01T12:00:00' }, { startAt: 20 },
    ].map(changes => ({ description: 'Change', changes }))];
  for (const body of bad) assert.throws(() => parseChangeRequest(body));
});

test('TC_E10S01_01: GET and POST dispatch refuse missing cookie sessions with private responses', async () => {
  for (const method of ['GET', 'POST']) {
    let status = 0;
    let body: unknown;
    const headers: Record<string, unknown> = {};
    const response: VercelResponse = {
      setHeader: (key, value) => { headers[key] = value; },
      status: code => { status = code; return { json: value => { body = value; } }; },
      json: value => { body = value; },
    };
    await handler({ method, url: '/api/events?changeRequests=1&id=EVT-CHANGE', headers: {} }, response);
    assert.equal(status, 401);
    assert.deepEqual(body, { error: 'Sign in to continue.' });
    assert.equal(headers['Cache-Control'], 'private, no-store');
    assert.equal(headers.Vary, 'Cookie');
  }
});
