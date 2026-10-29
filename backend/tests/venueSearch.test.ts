import test from 'node:test';
import assert from 'node:assert/strict';
import { assessVenue, venueSearch, type Candidate, type Criteria } from '../src/modules/venueBooking/search.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
const criteria: Criteria = { start: '2026-11-10T09:00:00Z', end: '2026-11-10T11:00:00Z', attendance: 80, capacity: 80, layout: 'theatre', location: 'central', accessibility: ['ramp','loop'], facilities: ['wifi','projector'], q: '' };
const venue: Candidate = { id: 'v', name: 'Hall', location: 'Central', max_capacity: 200, available: true, layouts: [{id:'theatre',label:'Theatre',capacity:100}], accessibility:[{id:'ramp',label:'Ramp'},{id:'loop',label:'Loop'}], facilities:[{id:'wifi',label:'WiFi'},{id:'projector',label:'Projector'}] };
test('TC_E06S01_01: all combined requirements produce a suitable venue', () => assert.equal(assessVenue(venue,criteria).suitable,true));
for (const [name, change, expected] of [
  ['layout capacity',{layouts:[{id:'theatre',label:'Theatre',capacity:50}]},'Capacity 50'],
  ['missing layout',{layouts:[]},'layout'],
  ['missing accessibility',{accessibility:venue.accessibility.slice(0,1)},'loop'],
  ['missing facility',{facilities:venue.facilities.slice(0,1)},'projector'],
  ['location',{location:'West'},'Location'],
  ['unavailable',{available:false},'Unavailable'],
] as [string,Partial<Candidate>,string][]) test(`TC_E06S01_02 TC_E06S01_03: ${name} identifies failing criterion`,()=> {
 const result=assessVenue({...venue,...change},criteria); assert.equal(result.suitable,false); assert.ok(result.mismatches.some(m=>m.includes(expected)));
});
test('TC_E05S05_07: an unavailable venue names the buffered overlap in Singapore time', () => {
 const result = assessVenue({ ...venue, available: false, booking_overlap: { starts_at: '2027-01-15T04:30:00.000Z', ends_at: '2027-01-15T04:45:00.000Z' } }, criteria);
 assert.equal(result.suitable, false);
 assert.ok(result.mismatches.includes('Unavailable during the requested period: another booking needs the venue from 15 Jan 2027, 12:30 pm to 15 Jan 2027, 12:45 pm, including setup and turnaround.'));
});
test('TC_E05S05_07: an unavailable venue with no clashing booking keeps the plain sentence', () => {
 for (const booking_overlap of [null, undefined]) {
  assert.ok(assessVenue({ ...venue, available: false, booking_overlap }, criteria).mismatches.includes('Unavailable during the requested period.'));
 }
});
test('capacity without layout uses venue maximum and respects separate minimum',()=>assert.equal(assessVenue(venue,{...criteria,layout:'',capacity:250}).suitable,false));
const user: AuthenticatedUser={id:'u',email:'u@example.test',role:'event_coordinator',isActive:true,failedLoginCount:0};
const query: Query=async <T extends Record<string,unknown>>()=>({rows:[] as T[]});
test('anonymous search is rejected',async()=>assert.rejects(venueSearch(query,undefined,new URLSearchParams()),{status:401}));
for(const role of ['attendee','event_organiser','venue_staff','technical_support_staff'] as const) test(`role ${role} cannot search even with client role override`,async()=>assert.rejects(venueSearch(query,{...user,role},new URLSearchParams('role=event_coordinator')),{status:403}));
test('inactive coordinator is rejected',async()=>assert.rejects(venueSearch(query,{...user,isActive:false},new URLSearchParams()),{status:403}));
test('coordinator can load search options',async()=>assert.deepEqual((await venueSearch(query,user,new URLSearchParams())).options,{layouts:[],accessibility:[],facilities:[]}));
test('invalid input identifies fields before venue query',async()=> {
 const result=await venueSearch(query,user,new URLSearchParams('search=1&start=bad&end=bad&attendance=-1&layout=unknown&facilities=unknown'));
 for(const key of ['start','end','attendance','layout','facilities']) assert.ok(result.errors?.[key]);
});

test('TC_E04S02_03: venue suitability uses the selected Session requirements', async () => {
  const sessions = [
    { id: 's-a', title: 'Opening', start: '2027-03-12T01:00:00.000Z', end: '2027-03-12T03:00:00.000Z', attendance: 40, layout: 'theatre', accessibility: ['ramp'], facilities: [] },
    { id: 's-b', title: 'Workshop', start: '2027-03-13T05:00:00.000Z', end: '2027-03-13T08:00:00.000Z', attendance: 120, layout: '', accessibility: [], facilities: ['wifi'] },
  ];
  const calls: string[] = [];
  const scoped: Query = async <T extends Record<string, unknown>>(sql: string) => {
    calls.push(sql);
    const rows = sql.includes('FROM room_layouts') ? [{ id: 'theatre', label: 'Theatre' }]
      : sql.includes('FROM accessibility_features') ? [{ id: 'ramp', label: 'Ramp' }]
      : sql.includes('FROM facilities') ? [{ id: 'wifi', label: 'WiFi' }]
      : sql.includes('FROM events e WHERE') ? [{ id: 'event', title: 'Event', status: 'planning', start: '2027-03-12T01:00:00Z', end: '2027-03-13T08:00:00Z', attendance: 160, layout: '', accessibility: [], facilities: [] }]
      : sql.includes('FROM sessions s WHERE') ? sessions
        : sql.includes('SELECT v.id') ? [venue] : [];
    return { rows: rows as T[] };
  };
  const result = await venueSearch(scoped, user, new URLSearchParams({ event_id: 'event', session_id: 's-b', search: '1' }));
  assert.equal(result.criteria?.attendance, 120);
  assert.equal(result.criteria?.start, sessions[1]!.start);
  assert.deepEqual(result.criteria?.facilities, ['wifi']);
  assert.equal(result.defaults.session_id, 's-b');
  assert.ok(calls.some(sql => sql.includes('session_accessibility_needs')));
});

test('multi-Session searches require a Session and reject foreign Session ids', async () => {
  const multi: Query = async <T extends Record<string, unknown>>(sql: string) => ({ rows: (sql.includes('FROM events e WHERE')
    ? [{ id: 'event', title: 'Event', status: 'planning', start: criteria.start, end: criteria.end, attendance: 80, layout: '', accessibility: [], facilities: [] }]
    : sql.includes('FROM sessions s WHERE') ? [{ id: 's-a' }, { id: 's-b' }] : []) as T[] });
  const missing = await venueSearch(multi, user, new URLSearchParams({ event_id: 'event', search: '1' }));
  assert.deepEqual(missing.errors?.session_id, ['Choose a Session before searching.']);
  await assert.rejects(venueSearch(multi, user, new URLSearchParams({ event_id: 'event', session_id: 'foreign', search: '1' })), { status: 400 });
});

test('a single-Session event defaults suitability to that Session', async () => {
  const single: Query = async <T extends Record<string, unknown>>(sql: string) => ({ rows: (sql.includes('FROM events e WHERE')
    ? [{ id: 'event', title: 'Event', status: 'planning', start: criteria.start, end: criteria.end, attendance: 80, layout: '', accessibility: [], facilities: [] }]
    : sql.includes('FROM sessions s WHERE') ? [{ id: 'session', title: 'Session', start: criteria.start, end: criteria.end, attendance: 40, layout: 'theatre', accessibility: ['ramp'], facilities: ['wifi'] }]
      : []) as T[] });
  const result = await venueSearch(single, user, new URLSearchParams({ event_id: 'event' }));
  assert.equal(result.defaults.session_id, 'session');
  assert.equal(result.defaults.attendance, 40);
  assert.deepEqual(result.defaults.facilities, ['wifi']);
});
