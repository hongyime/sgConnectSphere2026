import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Route,Routes,Link} from 'react-router-dom';
import {EquipmentRequests,EquipmentRequestFormPage} from './EquipmentRequests';
import {stubApi,deferred} from '../../testing/fakeApi';
const event={id:'event-a',eventCode:'EVT-A',title:'Conference',status:'planning'};
const equipment=[{id:'eq1',name:'Microphone',category:'Audio',total_quantity:10,operational_status:'available'}];
const row={id:'req1',equipmentId:'eq1',name:'Microphone',quantity:2,notes:'Handheld',totalStock:10,operationalStatus:'available',isActive:true,reserved:false};
const endpoint='/api/equipment?mode=requests&event=EVT-A';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function show(path='/coordinator/events/EVT-A/equipment'){render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/coordinator/events/:eventCode/equipment" element={<EquipmentRequests/>}/><Route path="/coordinator/events/:eventCode/equipment/new" element={<EquipmentRequestFormPage/>}/><Route path="/coordinator/events/:eventCode/equipment/:requestId/edit" element={<EquipmentRequestFormPage/>}/></Routes></MemoryRouter>);}
test('request form saves event-scoped quantity and displays total-stock warning without losing requirement',async()=>{
  let saved=false;const calls=stubApi({[`GET ${endpoint}`]:()=>({body:{event,equipment,requests:saved?[{...row,quantity:15}]:[],canEdit:true}}),[`POST ${endpoint}`]:()=>{saved=true;return {status:201,body:{requestId:'req1',changed:true,notified:1,warning:{name:'Microphone',requested:15,totalStock:10}}};}},{role:'event_coordinator'});
  show();fireEvent.click(await screen.findByRole('link',{name:'Add equipment request'}));fireEvent.change(await screen.findByLabelText('Equipment item'),{target:{value:'eq1'}});fireEvent.change(screen.getByLabelText('Quantity requested'),{target:{value:'15'}});fireEvent.click(screen.getByRole('button',{name:'Save equipment request'}));
  expect(await screen.findByText(/15 units requested, but total stock is 10/)).toBeInTheDocument();expect(screen.getByText(/Technical Support Staff notified/)).toBeInTheDocument();expect(calls.find(c=>c.method==='POST')?.body).toMatchObject({equipmentId:'eq1',quantity:15,action:'saveRequest'});
});
test('request removal requires confirmation and reports failure while retaining the row',async()=>{
  stubApi({[`GET ${endpoint}`]:{body:{event,equipment,requests:[row],canEdit:true}},[`POST ${endpoint}`]:{status:409,body:{error:'This request has been reserved and cannot be amended or removed here.'}}},{role:'event_coordinator'});
  show();fireEvent.click(await screen.findByRole('button',{name:'Remove Microphone…'}));fireEvent.click(screen.getByRole('button',{name:'Confirm removal'}));expect(await screen.findByText('This request has been reserved and cannot be amended or removed here.')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Edit Microphone'})).toBeInTheDocument();
});
test('reserved and read-only requests expose no editing form',async()=>{
  stubApi({[`GET ${endpoint}`]:{body:{event,equipment,requests:[{...row,reserved:true}],canEdit:true}}},{role:'event_coordinator'});show('/coordinator/events/EVT-A/equipment/req1/edit');expect(await screen.findByText('This request has been reserved and cannot be amended or removed here.')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Save equipment request'})).not.toBeInTheDocument();
});
test('Technical Support has read-only event requirements',async()=>{
  stubApi({[`GET ${endpoint}`]:{body:{event,equipment,requests:[row],canEdit:false}}},{role:'technical_support_staff'});show();await screen.findByText('Microphone');expect(screen.queryByRole('link',{name:'Add equipment request'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Remove Microphone…'})).not.toBeInTheDocument();
});
test('request form associates server quantity errors and retains entered values',async()=>{
  stubApi({[`GET ${endpoint}`]:{body:{event,equipment,requests:[],canEdit:true}},[`POST ${endpoint}`]:{status:400,body:{error:'validation_failed',errors:{quantity:['Enter a whole number.']}}}},{role:'event_coordinator'});show('/coordinator/events/EVT-A/equipment/new');fireEvent.change(await screen.findByLabelText('Equipment item'),{target:{value:'eq1'}});fireEvent.click(screen.getByRole('button',{name:'Save equipment request'}));await waitFor(()=>expect(screen.getByLabelText('Quantity requested')).toHaveAttribute('aria-invalid','true'));expect(screen.getByLabelText('Equipment item')).toHaveValue('eq1');
});
test('late event response cannot overwrite the next equipment request form',async()=>{
  const pending=deferred<{body:unknown}>();stubApi({[`GET ${endpoint}`]:()=>pending.promise,'GET /api/equipment?mode=requests&event=EVT-B':{body:{event:{...event,eventCode:'EVT-B',title:'Charity Run'},equipment,requests:[],canEdit:true}}},{role:'event_coordinator'});
  render(<MemoryRouter initialEntries={['/coordinator/events/EVT-A/equipment/new']}><Link to="/coordinator/events/EVT-B/equipment/new">Next event</Link><Routes><Route path="/coordinator/events/:eventCode/equipment/new" element={<EquipmentRequestFormPage/>}/></Routes></MemoryRouter>);fireEvent.click(screen.getByRole('link',{name:'Next event'}));await screen.findByText('Charity Run');pending.resolve({body:{event,equipment,requests:[],canEdit:true}});await waitFor(()=>expect(screen.queryByText('Conference')).not.toBeInTheDocument());
});

test('equipment request load failure offers retry and then the empty state',async()=>{
  let fail=true;stubApi({[`GET ${endpoint}`]:()=>fail?{status:503,body:{error:'Service unavailable. Please try again.'}}:{body:{event,equipment,requests:[],canEdit:true}}},{role:'event_coordinator'});show();await screen.findByText('Service unavailable. Please try again.');fail=false;fireEvent.click(screen.getByRole('button',{name:'Try again'}));expect(await screen.findByText('No equipment requested yet')).toBeInTheDocument();
});
