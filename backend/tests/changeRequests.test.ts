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
  const origin = 'https://app.example.test';
  process.env.PUBLIC_SITE_URL = origin;
  try {
    for (const method of ['GET', 'POST']) {
      let status = 0;
      let body: unknown;
      const headers: Record<string, unknown> = {};
      const response: VercelResponse = {
        setHeader: (key, value) => { headers[key] = value; },
        status: code => { status = code; return { json: value => { body = value; } }; },
        json: value => { body = value; },
      };
      await handler({ method, url: '/api/events?changeRequests=1&id=EVT-CHANGE', headers: { origin } }, response);
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Sign in to continue.' });
      assert.equal(headers['Cache-Control'], 'private, no-store');
      assert.equal(headers.Vary, 'Cookie');
    }
  } finally {
    delete process.env.PUBLIC_SITE_URL;
  }
});

test('TC_E10S01_01: structured requests preserve false, null and canonical accessibility sets', () => {
  const id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
  assert.deepEqual(parseChangeRequest({ description: 'Requirements', changes: {
    layoutId: null, accessibilityFeatureIds: [id, id.toLowerCase()], registrationEnabled: false,
    waitlistEnabled: true, registrationDates: { opensAt: '2027-01-01T09:00:00+08:00', closesAt: null },
    withdrawalDeadline: null,
  } }).fields, { layoutId: null, accessibilityFeatureIds: [id.toLowerCase()], registrationEnabled: false,
    waitlistEnabled: true, registrationDates: { opensAt: '2027-01-01T01:00:00.000Z', closesAt: null }, withdrawalDeadline: null });
  assert.equal(parseChangeRequest({ description: 'Layout', changes: { layoutId: id } }).fields.layoutId, id.toLowerCase());
});

test('TC_E10S01_01: malformed structured fields cannot reach SQL', () => {
  for (const changes of [
    { layoutId: 'not-a-layout' }, { accessibilityFeatureIds: null }, { accessibilityFeatureIds: ['bad'] },
    { registrationEnabled: 'false' }, { waitlistEnabled: 0 }, { registrationDates: [] },
    { registrationDates: { opensAt: null } }, { registrationDates: { opensAt: null, closesAt: null, extra: true } },
    { registrationDates: { opensAt: '2027-01-02T00:00:00Z', closesAt: '2027-01-01T00:00:00Z' } },
    { registrationDates: { opensAt: 'bad', closesAt: null } }, { withdrawalDeadline: '2027-01-01T12:00' },
  ]) assert.throws(() => parseChangeRequest({ description: 'Update settings', changes }));
});
