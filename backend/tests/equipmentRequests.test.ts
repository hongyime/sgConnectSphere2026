import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateRequestInput,getEquipmentRequests,saveEquipmentRequest,listEquipmentRequestEvents} from '../src/modules/equipmentSupport/requests.js';
import {createEquipmentRequestHandler} from '../src/modules/equipmentSupport/requestHandler.js';
import type {Pool} from 'pg';
import type {Query} from '../src/modules/eventVisibility/service.js';
import type {VercelResponse} from '../src/vercel.js';
const user={id:randomUUID(),email:'coordinator@example.test',role:'event_coordinator' as const,isActive:true,failedLoginCount:0};
test('equipment request input rejects zero, fractions, duplicate shapes and forged ids',()=>{
  const equipmentId=randomUUID();assert.deepEqual(validateRequestInput({equipmentId,quantity:2}).input,{equipmentId,quantity:2,notes:''});
  for(const quantity of [0,-1,1.2,'2',Infinity,2147483648]) assert.ok(validateRequestInput({equipmentId,quantity}).errors?.quantity);
  assert.ok(validateRequestInput({equipmentId:['x'],quantity:1}).errors?.equipmentId);
  assert.ok(validateRequestInput({equipmentId,quantity:1,notes:['x']}).errors?.notes);
});
test('request readers and writers deny wrong roles and inactive accounts before reading event data',async()=>{
  const calls:string[]=[];const query:Query=async sql=>{calls.push(sql);return {rows:[]};};
  await assert.rejects(getEquipmentRequests(query,undefined,'EVT-A'),{status:401});
  for(const wrong of [{...user,role:'event_organiser' as const},{...user,isActive:false}]) await assert.rejects(listEquipmentRequestEvents(query,wrong),{status:403});
  await assert.rejects(saveEquipmentRequest({query} as unknown as Pool,{...user,role:'technical_support_staff'},'EVT-A',{}),{status:403});
  assert.ok(calls.every(sql=>sql.includes('audit_logs')));
});
test('request handler enforces method, origin and valid action without opening a transaction',async()=>{
  let status=0;let payload:unknown;let pools=0;
  const response={setHeader(){},status(s:number){status=s;return {json(body:unknown){payload=body;}}},json(body:unknown){payload=body;}} as unknown as VercelResponse;
  const handler=createEquipmentRequestHandler({authenticate:async()=>user,query:async()=>({rows:[]}),pool:()=>{pools++;throw new Error('unexpected');},allowedOrigin:origin=>origin==='http://localhost:5173'});
  await handler({method:'DELETE',url:'/api/equipment?mode=requests',headers:{}},response);assert.equal(status,405);
  await handler({method:'POST',url:'/api/equipment?mode=requests&event=EVT-A',headers:{origin:'https://attacker.example.test'},body:{action:'saveRequest'}},response);assert.equal(status,403);
  await handler({method:'POST',url:'/api/equipment?mode=requests&event=EVT-A',headers:{origin:'http://localhost:5173'},body:{action:'retire'}},response);assert.equal(status,400);assert.equal(pools,0);assert.ok(payload);
});
