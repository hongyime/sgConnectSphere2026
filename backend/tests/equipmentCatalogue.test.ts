import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEquipmentInput, requireEquipmentAccess, getEquipment } from '../src/modules/equipmentSupport/catalogue.js';
import type { AuthenticatedUser } from '../src/modules/accessControl/types.js';
import type { Query } from '../src/modules/eventVisibility/service.js';
const staff: AuthenticatedUser = {id:'00000000-0000-4000-8000-000000000001',email:'staff@example.test',role:'technical_support_staff',isActive:true,failedLoginCount:0};
const input = {name:'Microphone',category:'Audio',description:'Handheld',total_quantity:10,home_location:'Storage',operational_status:'available'};
test('equipment input rejects invalid quantities and forged retirement',()=>{
  for (const total_quantity of [-1,1.5,'10',NaN,2147483648]) assert.ok(validateEquipmentInput({...input,total_quantity}).errors?.total_quantity);
  assert.ok(validateEquipmentInput({...input,operational_status:'retired'}).errors?.operational_status);
  assert.ok(validateEquipmentInput(null).errors);
  assert.ok(validateEquipmentInput({...input,operational_status:['available']}).errors?.operational_status);
  assert.equal(validateEquipmentInput({...input,name:' Microphone ',total_quantity:0}).input?.name,'Microphone');
});
test('catalogue denies unauthenticated, wrong-role, inactive and locked writes before querying equipment',async()=>{
  const calls:string[]=[];const query:Query=async sql=>{calls.push(sql);return {rows:[]};};
  await assert.rejects(requireEquipmentAccess(query,undefined,true),{status:401});
  for (const user of [{...staff,role:'event_coordinator' as const},{...staff,isActive:false},{...staff,lockedUntil:new Date(Date.now()+60000)}]) {
    await assert.rejects(requireEquipmentAccess(query,user,true),{status:403});
  }
  assert.equal(calls.length,3);assert.ok(calls.every(sql=>sql.includes('audit_logs')));
  await requireEquipmentAccess(query,{...staff,role:'event_coordinator'},false);
});
test('catalogue rejects invalid identifiers before database casts',async()=>{
  const query:Query=async()=>{throw new Error('unexpected query');};
  await assert.rejects(getEquipment(query,staff,'invalid'),{status:400});
});
