import test from 'node:test';
import assert from 'node:assert/strict';
import { selectEventRecipients, type EventAudience, type EventChange } from '../src/modules/eventNotifications/service.js';

const audience: EventAudience = {
  eventId:'event', title:'Private planning title', publicName:'Published event', status:'confirmed',
  startsAt:'2027-01-01T09:00:00Z', endsAt:'2027-01-01T12:00:00Z',
  organiser:['o'], coordinator:['c'], venueStaff:['v'], technicalStaff:['t'], registered:['r'], waitlisted:['w'], unresolvedVenueIds:[],
};
const selected = (change: EventChange, before=audience, after=audience, actorId?: string) =>
  [...selectEventRecipients(before, after, change, actorId).recipients.keys()].sort();

test('TC_E11S01_10: approved recipient matrix distinguishes internal decisions from public changes', () => {
  const cases: [EventChange, string[]][] = [
    [{kind:'status',from:'draft',to:'submitted'}, ['o','c']],
    [{kind:'status',from:'submitted',to:'under_review'}, ['o','c']],
    [{kind:'status',from:'under_review',to:'awaiting_clarification'}, ['o','c']],
    [{kind:'status',from:'under_review',to:'approved'}, ['o','c']],
    [{kind:'status',from:'under_review',to:'rejected'}, ['o','c']],
    [{kind:'status',from:'approved',to:'planning'}, ['o','c']],
    [{kind:'status',from:'planning',to:'confirmed'}, ['o','c','v','t','r','w']],
    [{kind:'status',from:'confirmed',to:'planning'}, ['o','c','v','t','r','w']],
    [{kind:'status',from:'confirmed',to:'completed'}, ['o','c','v','t','r','w']],
    [{kind:'status',from:'confirmed',to:'cancelled'}, ['o','c','v','t','r','w']],
    [{kind:'booking_requested'}, ['v']],
    [{kind:'booking_decided',decision:'confirmed'}, ['c']],
    [{kind:'booking_decided',decision:'rejected'}, ['c']],
    [{kind:'booking_decided',decision:'released'}, ['c']],
    [{kind:'arrangements',fields:['venue']}, ['o','c','v','t','r','w']],
    [{kind:'arrangements',fields:['date','time']}, ['o','c','v','t','r','w']],
    [{kind:'equipment_changed',venueAffected:false,technicalAffected:false}, ['c']],
    [{kind:'equipment_changed',venueAffected:true,technicalAffected:true}, ['c','v','t']],
    [{kind:'place_released'}, ['w']],
    [{kind:'description_only'}, []],
    [{kind:'arrangements',fields:[]}, []],
    [{kind:'status',from:'confirmed',to:'confirmed'}, []],
  ];
  for (const [change, expected] of cases) assert.deepEqual(selected(change), expected.sort(), JSON.stringify(change));
});

test('TC_E11S01_11: actor is excluded and duplicate links yield one recipient', () => {
  const duplicate = {...audience, venueStaff:['v','v'], technicalStaff:['t','t']};
  assert.deepEqual(selected({kind:'arrangements',fields:['venue']}, duplicate, duplicate, 'c'), ['o','r','t','v','w']);
  assert.deepEqual(selected({kind:'booking_decided',decision:'confirmed'}, audience, audience, 'c'), []);
});

test('TC_E11S01_12: cancellation captures released links; venue moves notify old and new staff', () => {
  const after = {...audience, venueStaff:['v2'], technicalStaff:['t2'], registered:[], waitlisted:[]};
  assert.deepEqual(selected({kind:'status',from:'confirmed',to:'cancelled'}, audience, after), ['c','o','r','t','t2','v','v2','w']);
  assert.deepEqual(selected({kind:'arrangements',fields:['venue']}, audience, after), ['c','o','t','t2','v','v2']);
});

test('TC_E11S01_13: unresolved Venue Staff is explicit and cannot broaden recipients', () => {
  const missing = {...audience, venueStaff:[], unresolvedVenueIds:['venue-1']};
  const result = selectEventRecipients(missing, missing, {kind:'booking_requested'});
  assert.deepEqual([...result.recipients], []);
  assert.deepEqual(result.unresolvedVenueIds, ['venue-1']);
  assert.deepEqual(selectEventRecipients(missing, missing, {kind:'booking_decided',decision:'rejected'}).unresolvedVenueIds, []);
});

test('TC_E11S01_14: unpublished internal events cannot leak to attendee recipients', () => {
  const internal = {...audience, publicName:null};
  assert.deepEqual(selected({kind:'arrangements',fields:['time']}, internal, internal), ['c','o','t','v']);
  assert.throws(() => selected({kind:'place_released'}, audience, {...audience,eventId:'another'}), /event_mismatch/);
});
