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
