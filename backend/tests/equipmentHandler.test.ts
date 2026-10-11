import test from 'node:test';
import assert from 'node:assert/strict';
import type {Pool} from 'pg';
import { createEquipmentHandler } from '../src/modules/equipmentSupport/handler.js';
import type {VercelResponse} from '../src/vercel.js';
const staff={id:'00000000-0000-4000-8000-000000000001',email:'test@example.test',role:'technical_support_staff' as const,isActive:true,failedLoginCount:0};
test('equipment handler checks origin before writes and rejects unsupported methods',async()=>{
  let status=0;let body:unknown;const headers:Record<string,string|number|string[]>={};
  const response:VercelResponse={setHeader:(k,v)=>{headers[k]=v;},status:code=>{status=code;return {json:value=>{body=value;}};},json:value=>{body=value;}};
  const handler=createEquipmentHandler({authenticate:async()=>staff,query:async()=>{throw new Error('unexpected database access');},pool:()=>{throw new Error('unexpected pool access');},allowedOrigin:()=>false});
  await handler({method:'POST',url:'/api/equipment',headers:{origin:'https://attacker.example.test'},body:{action:'create'}},response);
  assert.equal(status,403);assert.deepEqual(body,{error:'Request origin not allowed.'});assert.equal(headers['Cache-Control'],'private, no-store');
  await handler({method:'DELETE',url:'/api/equipment',headers:{}},response);assert.equal(status,405);assert.equal(headers.Allow,'GET, POST');
});
test('equipment handler returns validation failures without creating a transaction',async()=>{
  let status=0;let body:unknown;
  const response:VercelResponse={setHeader:()=>{},status:code=>{status=code;return {json:value=>{body=value;}};},json:()=>{}};
  const handler=createEquipmentHandler({authenticate:async()=>staff,query:async()=>({rows:[]}),pool:()=>({query:async()=>{throw new Error('unexpected query');}} as unknown as Pool),allowedOrigin:()=>true});
  await handler({method:'POST',url:'/api/equipment',headers:{},body:{action:'create'}},response);
  assert.equal(status,400);assert.equal((body as {error:string}).error,'validation_failed');
});
