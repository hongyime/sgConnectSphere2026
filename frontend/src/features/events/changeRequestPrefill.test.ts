import { expect, test } from 'vitest';
import { changeRequestPath, readChangeRequestPrefill, refusedEditOffer, restrictedEditFields } from './changeRequestPrefill';
import type { ApiFailure } from '../../shared';

const refusal: ApiFailure = { ok: false, status: 409, message: 'Direct editing is refused.', details: { changeRequestUrl: '/change-requests/new?event=event-a' } };
test('TC_E10S01_03: offered refusal carries restricted attempted values, without proposed details in the URL', () => {
  const offer = refusedEditOffer(refusal, 'event-a', { expectedAttendance: 75, title: 'Private draft' })!;
  expect(offer.to).toBe('/change-requests/new?event=event-a&fields=expectedAttendance');
  expect(offer.state).toEqual({ changeRequestPrefill: { eventId: 'event-a', changes: { expectedAttendance: 75 } } });
  expect(offer.to).not.toContain('75');
  expect(readChangeRequestPrefill(new URLSearchParams(offer.to.split('?')[1]), offer.state, 'event-a')).toEqual({ fields: ['expectedAttendance'], changes: { expectedAttendance: 75 } });
});
test('Field links encode the Event and select only known fields once', () => {
  expect(changeRequestPath('EVENT A&B', ['startAt'])).toBe('/change-requests/new?event=EVENT+A%26B&fields=startAt');
  expect(readChangeRequestPrefill(new URLSearchParams('fields=unknown,expectedAttendance,expectedAttendance,title'), null, 'event')).toEqual({ fields: ['expectedAttendance'], changes: {} });
  expect(readChangeRequestPrefill(new URLSearchParams(), undefined, 'event')).toEqual({ fields: [], changes: {} });
});
test.each([400, 401, 403, 500])('A %i refusal never offers a change request', status => {
  expect(refusedEditOffer({ ...refusal, status }, 'event-a', { expectedAttendance: 75 })).toBeNull();
});
test.each([undefined, null, 5, '', 'javascript:alert(1)', '//evil.test/change-requests/new?event=event-a', 'https://evil.test/change-requests/new?event=event-a', '/change-requests/new?event=other', '/change-requests/new?event=event-a&x=1/../other'])('Malformed or mismatched server offer %s cannot redirect outside this Event', target => {
  const result = refusedEditOffer({ ...refusal, details: { changeRequestUrl: target } }, 'event-a', { expectedAttendance: 75 });
  // Extra query data is discarded, even when the canonical event matches.
  if (typeof target === 'string' && target.endsWith('&x=1/../other')) expect(result?.to).toBe('/change-requests/new?event=event-a&fields=expectedAttendance');
  else expect(result).toBeNull();
});
test('No offer without an explicit server link or a restricted edit', () => {
  expect(refusedEditOffer({ ...refusal, details: undefined }, 'event-a', { expectedAttendance: 75 })).toBeNull();
  expect(refusedEditOffer(refusal, 'event-a', { title: 'Safe' })).toBeNull();
  expect(refusedEditOffer({ ...refusal, details: { changeRequestUrl: '/change-requests/new?/../other?event=event-a' } }, 'event-a', { expectedAttendance: 75 })).toBeNull();
});
test.each([null, undefined, 1, [], {}, { changeRequestPrefill: [] }, { changeRequestPrefill: { eventId: 'other', changes: { expectedAttendance: 75 } } }, { changeRequestPrefill: { eventId: 'event-a', changes: null } }])('Unknown or cross-Event state %j cannot leak a draft', state => {
  expect(readChangeRequestPrefill(new URLSearchParams('fields=expectedAttendance'), state, 'event-a')).toEqual({ fields: ['expectedAttendance'], changes: {} });
});
test.each(['75', -1, 0, 1.5, Infinity, null])('Invalid attendance draft %s falls back to the current value', value => {
  expect(readChangeRequestPrefill(new URLSearchParams('fields=expectedAttendance'), { changeRequestPrefill: { eventId: 'event-a', changes: { expectedAttendance: value } } }, 'event-a').changes).toEqual({});
});
test('Every restricted field keeps its typed proposed value; unrelated draft keys are ignored', () => {
  const changes = Object.fromEntries(restrictedEditFields.map(field => [field, field === 'expectedAttendance' ? 75 : field === 'startAt' || field === 'endAt' ? '2027-03-01T02:00:00.000Z' : 'Proposed']));
  const result = readChangeRequestPrefill(new URLSearchParams({ fields: restrictedEditFields.join(',') }), { changeRequestPrefill: { eventId: 'event-a', changes: { ...changes, title: 'Ignore me' } } }, 'event-a');
  expect(result.changes).toEqual(changes);
});
test.each([undefined, 5, {}, '', ' ', 'x'.repeat(4001)])('Invalid text draft falls back safely', value => {
  expect(readChangeRequestPrefill(new URLSearchParams('fields=venueRequirements'), { changeRequestPrefill: { eventId: 'event-a', changes: { venueRequirements: value } } }, 'event-a').changes).toEqual({});
});
test('Invalid dates do not break the form', () => {
  expect(readChangeRequestPrefill(new URLSearchParams('fields=startAt,endAt'), { changeRequestPrefill: { eventId: 'event-a', changes: { startAt: 'bad', endAt: 'bad' } } }, 'event-a').changes).toEqual({});
});
