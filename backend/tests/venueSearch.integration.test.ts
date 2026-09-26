import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { venueSearch } from '../src/modules/venueBooking/search.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: PostgreSQL event requirements, near matches and range boundaries', async()=> {
 const url=process.env.TEST_DATABASE_URL || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
 assert.ok(url,'Configure a database; fixtures use a unique rollback-only schema.');
 const client=new Client({connectionString:url,connectionTimeoutMillis:8000});
 await client.connect();
 try {
  await client.query('BEGIN');
  await client.query('SET LOCAL statement_timeout=15000');
  const schema='venue_search_test_'+randomUUID().replaceAll('-','');
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path=${schema},public`);
  const extensions=await client.query("SELECT count(*)::int AS n FROM pg_extension WHERE extname IN ('pgcrypto','btree_gist')");
  assert.equal(extensions.rows[0].n,2,'Extensions must already be provisioned');
  await client.query(await readFile(new URL('../database/migrations/0001_connectsphere_schema.sql',import.meta.url),'utf8'));
  const query: Query=(sql,values)=>client.query(sql,values);
  const org=(await client.query("INSERT INTO client_organisations(name) VALUES('Synthetic Org') RETURNING id")).rows[0].id;
  const uid=(await client.query("INSERT INTO users(full_name,email,password_hash,role) VALUES('Synthetic Coordinator','coordinator@example.test','fixture','event_coordinator') RETURNING id")).rows[0].id;
  const user: AuthenticatedUser={id:uid,email:'coordinator@example.test',role:'event_coordinator',isActive:true,failedLoginCount:0};
  const layout=(await client.query("INSERT INTO room_layouts(code,label) VALUES('theatre','Theatre') RETURNING id")).rows[0].id;
  const features=(await client.query("INSERT INTO accessibility_features(code,label) VALUES('ramp','Ramp'),('loop','Loop') RETURNING id")).rows.map(r=>r.id);
  const facilities=(await client.query("INSERT INTO facilities(code,label) VALUES('wifi','WiFi'),('projector','Projector') RETURNING id")).rows.map(r=>r.id);
  const range='[2026-11-10T09:00:00Z,2026-11-10T11:00:00Z)';
  const event=(await client.query("INSERT INTO events(organiser_id,coordinator_id,client_org_id,title,status,event_range,expected_attendance,layout_id,accessibility_note) VALUES($1,$1,$2,'Synthetic Event','planning',$3,80,$4,'Manual only') RETURNING id",[uid,org,range,layout])).rows[0].id;
  for(const id of features) await client.query('INSERT INTO event_accessibility_needs VALUES($1,$2)',[event,id]);
  for(const id of facilities) await client.query('INSERT INTO event_facility_needs VALUES($1,$2)',[event,id]);
  const ids: Record<string,string>={};
  for(const name of ['Full','Small','Missing','Inactive','Pending','Confirmed','Blocked','Adjacent','Released']) {
   const id=(await client.query("INSERT INTO venues(name,location,max_capacity,opens_at,closes_at,is_active) VALUES($1,'Central',200,'00:00','23:59',$2) RETURNING id",[name,name!=='Inactive'])).rows[0].id; ids[name]=id;
   if(name!=='Missing') await client.query('INSERT INTO venue_supported_layouts VALUES($1,$2,$3)',[id,layout,name==='Small'?50:100]);
   for(const feature of name==='Missing'?features.slice(0,1):features) await client.query('INSERT INTO venue_accessibility_features VALUES($1,$2)',[id,feature]);
   for(const facility of name==='Missing'?facilities.slice(0,1):facilities) await client.query('INSERT INTO venue_facilities VALUES($1,$2)',[id,facility]);
  }
  for(const [name,status,period] of [['Pending','pending',range],['Confirmed','confirmed',range],['Adjacent','confirmed','[2026-11-10T11:00:00Z,2026-11-10T12:00:00Z)'],['Released','released',range]]) await client.query('INSERT INTO venue_bookings(venue_id,event_id,status,booking_range) VALUES($1,$2,$3,$4)',[ids[name],event,status,period]);
  await client.query("INSERT INTO venue_blocks(venue_id,block_range,reason) VALUES($1,$2,'Private maintenance detail')",[ids.Blocked,range]);
  const params=new URLSearchParams({event_id:event,search:'1',location:'central'});
  const result=await venueSearch(query,user,params); assert.ok(result.venues);
  const byName=Object.fromEntries(result.venues.map(v=>[v.name,v]));
  assert.equal(result.venues.length,8); assert.equal(byName.Full.suitable,true); assert.equal(byName.Adjacent.suitable,true); assert.equal(byName.Released.suitable,true);
  for(const name of ['Pending','Confirmed','Blocked']) { assert.equal(byName[name].available,false); assert.equal(byName[name].suitable,false); }
  assert.equal(byName.Small.suitable,false); assert.equal(byName.Small.effective_capacity,50);
  for(const word of ['layout','Loop','Projector']) assert.ok(byName.Missing.mismatches.some(m=>m.includes(word)));
  assert.ok(!JSON.stringify(result.venues).includes('Private maintenance detail')); assert.ok(!JSON.stringify(result.venues).includes(event));
  params.set('attendance','300'); const near=await venueSearch(query,user,params); assert.ok(near.venues?.length); assert.ok(near.venues?.every(v=>!v.suitable && v.mismatches.length));
  params.set('q','Full'); assert.equal((await venueSearch(query,user,params)).venues?.length,1);
  params.delete('q'); params.set('attendance','80'); params.set('start','2026-11-10T19:00:00+08:00'); params.set('end','2026-11-10T20:00:00+08:00');
  const shifted=await venueSearch(query,user,params); assert.equal(shifted.venues?.find(v=>v.name==='Confirmed')?.available,true); assert.equal(shifted.venues?.find(v=>v.name==='Adjacent')?.available,false);
 } finally {await client.query('ROLLBACK');await client.end();}
});
