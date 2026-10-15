import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loginDatabase } from './helpers/loginDatabase.js';
import { saveEquipment, listEquipment, getEquipment, retireEquipment } from '../src/modules/equipmentSupport/catalogue.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';

test('TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 equipment catalogue against PostgreSQL',async()=>{
  const db=await loginDatabase();const {pool}=db;const q=pool.query.bind(pool);
  const staffId=randomUUID(),coordId=randomUUID(),otherCoord=randomUUID(),organiser=randomUUID(),org=randomUUID();
  const staff:AuthenticatedUser={id:staffId,email:'staff@example.test',role:'technical_support_staff',isActive:true,failedLoginCount:0};
  const coord:AuthenticatedUser={...staff,id:coordId,role:'event_coordinator'};
  const input={name:'Wireless Microphone',category:'Audio',description:'Handheld UHF',total_quantity:10,home_location:'Main Storage',operational_status:'available'};
  try {
    await q('INSERT INTO client_organisations(id,name) VALUES ($1,\'Test client\')',[org]);
    for(const [id,role] of [[staffId,'technical_support_staff'],[coordId,'event_coordinator'],[otherCoord,'event_coordinator'],[organiser,'event_organiser']]) await q(`INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES ($1,$2,'unused','Synthetic user',$3,$4)`,[id,`${id}@example.test`,role,org]);
    const created=await saveEquipment(pool,staff,input);assert.equal(created.status,201);
    const item=(created.body as {equipment:{id:string}}).equipment;
    assert.equal((await listEquipment(q,coord))[0].total_quantity,10);
    assert.equal((await getEquipment(q,coord,item.id)).operational_status,'available');
    async function reservation(code:string,coordinator:string,quantity:number,from:number,to:number,status='reserved') {
      const eventId=randomUUID(),requestId=randomUUID(),reservationId=randomUUID();
      const range=`[${new Date(Date.now()+from*3600000).toISOString()},${new Date(Date.now()+to*3600000).toISOString()})`;
      await q(`INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES ($1,$2,$3,$4,$5,$2,$6::tstzrange,10,'planning')`,[eventId,code,organiser,coordinator,org,range]);
      await q(`INSERT INTO equipment_requests(id,event_id,equipment_id,quantity_requested,requested_by) VALUES ($1,$2,$3,$4,$5)`,[requestId,eventId,item.id,quantity,coordId]);
      await q(`INSERT INTO equipment_reservations(id,request_id,event_id,equipment_id,quantity_reserved,reservation_range,reserved_by,status) VALUES ($1,$2,$3,$4,$5,$6::tstzrange,$7,$8)`,[reservationId,requestId,eventId,item.id,quantity,range,staffId,status]);
      return {eventId,reservationId};
    }
    const a=await reservation('EVT-A',coordId,6,24,26);
    const b=await reservation('EVT-B',otherCoord,2,48,50);
    const past=await reservation('EVT-PAST',coordId,9,-48,-46);
    const released=await reservation('EVT-RELEASED',coordId,20,24,26,'released');
    const reduced=await saveEquipment(pool,staff,{...input,total_quantity:4},item.id);
    assert.equal(reduced.status,200);
    assert.deepEqual((reduced.body as {affectedReservations:Array<{id:string}>}).affectedReservations.map(r=>r.id),[a.reservationId]);
    const flags=await q('SELECT id,requires_reconfirmation FROM equipment_reservations ORDER BY id');
    assert.equal(flags.rows.find(r=>r.id===a.reservationId).requires_reconfirmation,true);
    for(const r of [b,past,released]) assert.equal(flags.rows.find(row=>row.id===r.reservationId).requires_reconfirmation,false);
    assert.equal((await q('SELECT * FROM notifications WHERE user_id=$1',[coordId])).rowCount,1);
    assert.equal((await q('SELECT * FROM notifications WHERE user_id=$1',[otherCoord])).rowCount,0);
    assert.equal((await q('SELECT * FROM notification_deliveries')).rowCount,1);
    assert.equal((await retireEquipment(pool,staff,item.id)).status,409);
    // Overlapping reservations can exceed stock collectively even if each fits.
    await saveEquipment(pool,staff,input,item.id);
    await q('UPDATE equipment_reservations SET requires_reconfirmation=false');
    const c=await reservation('EVT-C',otherCoord,6,24,26);
    const overlapping=await saveEquipment(pool,staff,{...input,total_quantity:9},item.id);
    assert.equal((overlapping.body as {affectedReservations:unknown[]}).affectedReservations.length,2);
    assert.equal((await q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1',[c.reservationId])).rows[0].requires_reconfirmation,true);
    // A forced outbox failure must roll back BOTH the stock change and flags.
    await q('UPDATE equipment_reservations SET requires_reconfirmation=false');
    await q(`CREATE FUNCTION reject_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic delivery failure'; END $$`);
    await q('CREATE TRIGGER reject_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_delivery()');
    await assert.rejects(saveEquipment(pool,staff,{...input,total_quantity:1},item.id),/synthetic delivery failure/);
    assert.equal((await getEquipment(q,coord,item.id)).total_quantity,9);
    assert.equal((await q('SELECT count(*)::int AS n FROM equipment_reservations WHERE requires_reconfirmation')).rows[0].n,0);
    await q('DROP TRIGGER reject_delivery ON notification_deliveries');
    await q(`UPDATE equipment_reservations SET status='released' WHERE upper(reservation_range)>now()`);
    const updated=await saveEquipment(pool,staff,{...input,home_location:'Annex Storage'},item.id);assert.equal(updated.status,200);
    assert.equal((await getEquipment(q,coord,item.id)).home_location,'Annex Storage');
    const historyCount=(await q('SELECT count(*)::int AS n FROM equipment_reservations')).rows[0].n;
    assert.equal((await retireEquipment(pool,staff,item.id)).status,200);
    assert.equal((await listEquipment(q,coord)).length,0);
    assert.equal((await getEquipment(q,coord,item.id)).is_active,false);
    assert.equal((await q('SELECT count(*)::int AS n FROM equipment_reservations')).rows[0].n,historyCount);
    await assert.rejects(saveEquipment(pool,staff,input,item.id),{status:409});
  } finally {await db.close();}
});

async function withdrawalFixture() {
  const db = await loginDatabase();
  const q = db.pool.query.bind(db.pool);
  const staffId=randomUUID(),coordId=randomUUID(),organiser=randomUUID(),org=randomUUID();
  await q("INSERT INTO client_organisations(id,name) VALUES($1,'Synthetic withdrawal organisation')",[org]);
  for(const [id,role] of [[staffId,'technical_support_staff'],[coordId,'event_coordinator'],[organiser,'event_organiser']]) {
    await q("INSERT INTO users(id,email,password_hash,full_name,role,client_org_id) VALUES($1,$2,'unused','Synthetic user',$3,$4)",[id,`${id}@example.test`,role,org]);
  }
  const staff:AuthenticatedUser={id:staffId,email:'stock-test@example.test',role:'technical_support_staff',isActive:true,failedLoginCount:0};
  const input={name:'Withdrawal regression item',category:'Audio',description:'Synthetic test item',total_quantity:10,home_location:'Test store',operational_status:'available'};
  const created=await saveEquipment(db.pool,staff,input);
  const id=(created.body as {equipment:{id:string}}).equipment.id;
  const now=(await q('SELECT clock_timestamp() AS now')).rows[0].now as Date;
  const range=(from:number,to:number)=>`[${new Date(now.getTime()+from*3600000).toISOString()},${new Date(now.getTime()+to*3600000).toISOString()})`;
  const event=randomUUID(),request=randomUUID(),reservation=randomUUID();
  async function reserve(from:number,to:number,quantity=5) {
    await q("INSERT INTO events(id,event_code,organiser_id,coordinator_id,client_org_id,title,event_range,expected_attendance,status) VALUES($1,'EVT-WITHDRAWAL',$2,$3,$4,'Synthetic withdrawal event',$5,10,'planning')",[event,organiser,coordId,org,range(from,to)]);
    await q('INSERT INTO equipment_requests(id,event_id,equipment_id,quantity_requested,requested_by) VALUES($1,$2,$3,$4,$5)',[request,event,id,quantity,coordId]);
    await q("INSERT INTO equipment_reservations(id,request_id,event_id,equipment_id,quantity_reserved,reservation_range,reserved_by,status) VALUES($1,$2,$3,$4,$5,$6,$7,'reserved')",[reservation,request,event,id,quantity,range(from,to),staffId]);
  }
  const withdraw=(from:number,to:number,quantity:number)=>q("INSERT INTO equipment_unavailability(equipment_id,quantity,unavailable_range,reason) VALUES($1,$2,$3,'Synthetic withdrawal')",[id,quantity,range(from,to)]);
  return {...db,q,staff,input,id,reserve,withdraw,reservation,coordId,event};
}

test('TC_E07S09_01 stock 10 with 4 withdrawn and 5 reserved: reducing to 8 flags the reservation and notifies once',async()=>{
  const f=await withdrawalFixture();
  try {
    await f.reserve(24,28); await f.withdraw(24,28,4);
    // Exact fit: 9 total minus 4 withdrawn still fulfils the reservation of 5.
    assert.equal((await saveEquipment(f.pool,f.staff,{...f.input,total_quantity:9},f.id)).status,200);
    assert.equal((await f.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1',[f.reservation])).rows[0].requires_reconfirmation,false);
    const reduced=await saveEquipment(f.pool,f.staff,{...f.input,total_quantity:8},f.id);
    assert.equal(reduced.status,200);
    assert.deepEqual((reduced.body as {affectedReservations:Array<{id:string}>}).affectedReservations.map(r=>r.id),[f.reservation]);
    const row=(await f.q('SELECT status,requires_reconfirmation FROM equipment_reservations WHERE id=$1',[f.reservation])).rows[0];
    assert.deepEqual(row,{status:'reserved',requires_reconfirmation:true});
    assert.equal((await f.q('SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND event_id=$2',[f.coordId,f.event])).rows[0].n,1);
    assert.equal((await f.q('SELECT count(*)::int AS n FROM notification_deliveries')).rows[0].n,1);
  } finally {await f.close();}
});

for(const scenario of [
  {name:'withdrawal starts during the reservation',periods:[[26,27,4]],affected:true},
  {name:'withdrawal is on unrelated dates',periods:[[30,31,4]],affected:false},
  {name:'withdrawal starts exactly when reservation ends',periods:[[28,29,4]],affected:false},
  {name:'withdrawal ends exactly when reservation starts',periods:[[23,24,4]],affected:false},
  {name:'ended withdrawal is excluded',periods:[[-10,-8,4]],affected:false},
  {name:'non-overlapping withdrawals use their peak, not their sum',periods:[[24,25,2],[26,27,2]],affected:false},
  {name:'overlapping withdrawals combine at the constrained instant',periods:[[24,28,2],[26,27,2]],affected:true},
]) {
  test('TC_E07S09_02 catalogue stock reduction: ' + scenario.name,async()=>{
    const f=await withdrawalFixture();
    try {
      await f.reserve(24,28);
      for(const [from,to,quantity] of scenario.periods) await f.withdraw(from,to,quantity);
      const saved=await saveEquipment(f.pool,f.staff,{...f.input,total_quantity:8},f.id);
      assert.equal(saved.status,200);
      assert.equal((saved.body as {affectedReservations:unknown[]}).affectedReservations.length,scenario.affected?1:0);
      assert.equal((await f.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1',[f.reservation])).rows[0].requires_reconfirmation,scenario.affected);
    } finally {await f.close();}
  });
}

test('TC_E07S09_03 withdrawal-aware stock edit rolls back stock, review flags and notifications when outbox persistence fails',async()=>{
  const f=await withdrawalFixture();
  try {
    await f.reserve(24,28); await f.withdraw(26,27,4);
    await f.q("CREATE FUNCTION reject_stock_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic stock delivery failure'; END $$");
    await f.q('CREATE TRIGGER reject_stock_delivery BEFORE INSERT ON notification_deliveries FOR EACH ROW EXECUTE FUNCTION reject_stock_delivery()');
    await assert.rejects(saveEquipment(f.pool,f.staff,{...f.input,total_quantity:8},f.id),/synthetic stock delivery failure/);
    assert.equal((await f.q('SELECT total_quantity FROM equipment WHERE id=$1',[f.id])).rows[0].total_quantity,10);
    assert.equal((await f.q('SELECT requires_reconfirmation FROM equipment_reservations WHERE id=$1',[f.reservation])).rows[0].requires_reconfirmation,false);
    assert.equal((await f.q('SELECT count(*)::int AS n FROM notifications')).rows[0].n,0);
  } finally {await f.close();}
});
