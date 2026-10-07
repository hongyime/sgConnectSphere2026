import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { EquipmentCatalogue, EquipmentFormPage } from './EquipmentCatalogue';
import { stubApi, deferred } from '../../testing/fakeApi';
const item={id:'eq1',name:'Microphone',category:'Audio',description:'Handheld',total_quantity:10,home_location:'Storage',operational_status:'available',is_active:true};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function show(){render(<MemoryRouter><Routes><Route path="/" element={<EquipmentCatalogue />} /><Route path="/support/catalogue" element={<EquipmentCatalogue />} /><Route path="/support/catalogue/new" element={<EquipmentFormPage />} /><Route path="/support/catalogue/:equipmentId/edit" element={<EquipmentFormPage />} /></Routes></MemoryRouter>);}
test('saving new equipment persists all fields and reloads the catalogue',async()=>{
  let saved=false;
  const calls=stubApi({'GET /api/equipment':()=>({body:{equipment:saved?[item]:[]}}),'POST /api/equipment':()=>{saved=true;return {status:201,body:{equipment:item,affectedReservations:[]}};}},{role:'technical_support_staff'});
  show();fireEvent.click(await screen.findByRole('link',{name:'Add equipment'}));
  for(const [label,value] of [['Equipment name','Microphone'],['Type','Audio'],['Description','Handheld'],['Quantity','10'],['Location','Storage']]) fireEvent.change(await screen.findByLabelText(label),{target:{value}});
  fireEvent.click(await screen.findByRole('button',{name:'Save equipment'}));
  expect(await screen.findByText('Microphone saved.')).toBeInTheDocument();
  expect(calls.find(c=>c.method==='POST')?.body).toMatchObject({name:'Microphone',category:'Audio',description:'Handheld',total_quantity:10,home_location:'Storage',operational_status:'available',action:'create'});
});
test('quantity reduction displays affected reservations and notification acknowledgement',async()=>{
  stubApi({'GET /api/equipment?id=eq1':{body:{equipment:item}},'GET /api/equipment':{body:{equipment:[item]}},'POST /api/equipment':{body:{equipment:{...item,total_quantity:4},affectedReservations:[{id:'r1',eventId:'e1',eventCode:'EVT-1',title:'Conference',quantity:6}]}}},{role:'technical_support_staff'});
  show();fireEvent.click(await screen.findByRole('link',{name:'Edit Microphone'}));fireEvent.change(await screen.findByLabelText('Quantity'),{target:{value:'4'}});fireEvent.click(await screen.findByRole('button',{name:'Save equipment'}));
  expect(await screen.findByText('EVT-1: 6 units reserved')).toBeInTheDocument();expect(screen.getByText(/eligible Coordinators notified/)).toBeInTheDocument();
});
test('retirement conflict preserves item and names blocking reservations',async()=>{
  stubApi({'GET /api/equipment?id=eq1':{body:{equipment:item}},'GET /api/equipment':{body:{equipment:[item]}},'POST /api/equipment':{status:409,body:{error:'future_reservations_exist',message:'Resolve active reservations before retiring this item.',blockingReservations:[{id:'r1',eventCode:'EVT-1',quantity:6}]}}},{role:'technical_support_staff'});
  show();fireEvent.click(await screen.findByRole('button',{name:'Retire Microphone…'}));fireEvent.click(screen.getByRole('button',{name:'Confirm retirement'}));
  expect(await screen.findByText('EVT-1: 6 units')).toBeInTheDocument();expect(screen.getByText('Resolve active reservations before retiring this item.')).toBeInTheDocument();
});
test('Coordinator catalogue has no mutation actions',async()=>{
  stubApi({'GET /api/equipment':{body:{equipment:[item]}}},{role:'event_coordinator'});show();await screen.findByText('Microphone');expect(screen.queryByRole('link',{name:'Add equipment'})).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:'Edit Microphone'})).not.toBeInTheDocument();
});
test('server validation retains the form and associates field error',async()=>{
  stubApi({'GET /api/equipment?id=eq1':{body:{equipment:item}},'GET /api/equipment':{body:{equipment:[item]}},'POST /api/equipment':{status:409,body:{error:'name_in_use',message:'Name already exists.',errors:{name:['Choose a different equipment name.']}}}},{role:'technical_support_staff'});
  show();fireEvent.click(await screen.findByRole('link',{name:'Edit Microphone'}));fireEvent.click(await screen.findByRole('button',{name:'Save equipment'}));
  await waitFor(()=>expect(screen.getByLabelText('Equipment name')).toHaveAttribute('aria-invalid','true'));expect(screen.getByLabelText('Equipment name')).toHaveValue('Microphone');
});
test('equipment load failure offers retry and empty catalogue offers add',async()=>{
  let fail=true;
  stubApi({'GET /api/equipment':()=>fail?{status:503,body:{error:'Service unavailable. Please try again.'}}:{body:{equipment:[]}}},{role:'technical_support_staff'});
  show();expect(await screen.findByText('Service unavailable. Please try again.')).toBeInTheDocument();fail=false;fireEvent.click(screen.getByRole('button',{name:'Try again'}));expect(await screen.findByText('No equipment yet')).toBeInTheDocument();
});

test('late equipment response does not overwrite the next edit route',async()=>{
  const pending=deferred<{body:unknown}>();
  stubApi({'GET /api/equipment?id=eq1':()=>pending.promise,'GET /api/equipment?id=eq2':{body:{equipment:{...item,id:'eq2',name:'Projector'}}}},{role:'technical_support_staff'});
  render(<MemoryRouter initialEntries={['/support/catalogue/eq1/edit']}><Link to="/support/catalogue/eq2/edit">Next item</Link><Routes><Route path="/support/catalogue/:equipmentId/edit" element={<EquipmentFormPage />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('link',{name:'Next item'}));expect(await screen.findByLabelText('Equipment name')).toHaveValue('Projector');
  pending.resolve({body:{equipment:item}});await waitFor(()=>expect(screen.getByLabelText('Equipment name')).toHaveValue('Projector'));
});
