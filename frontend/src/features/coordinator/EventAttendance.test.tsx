// E09-S06 / SCRUM-68 AC1–3 and count checklist. API-stubbed UI; real persistence in backend DB suite.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { EventAttendance } from './EventAttendance';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const initial={eventCode:'A',title:'Charity Run',status:'completed',canRecord:true,registeredCount:2,attendedCount:0,
 attendees:[{registrationId:'r1',name:'Attendee A',email:'a@example.test',attended:false},{registrationId:'r2',name:'Attendee B',email:'b@example.test',attended:false}]};
function mount(){render(<MemoryRouter initialEntries={['/coordinator/events/A/attendance']}><Link to="/coordinator/events/B/attendance">Event B</Link><Routes><Route path="/coordinator/events/:eventCode/attendance" element={<EventAttendance/>}/></Routes></MemoryRouter>);}
function reply(body:unknown,status=200){return {ok:status<400,status,json:async()=>body} as Response;}
test('TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — save and correct attendance while registered count stays two',async()=>{
 const data=structuredClone(initial); const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){const body=JSON.parse(init.body as string);data.attendees[0].attended=body.attended;data.attendedCount=body.attended?1:0;return reply({attendance:body});}
  return reply({attendance:data});});vi.stubGlobal('fetch',fetcher);mount();
 expect(await screen.findAllByText('Registered but not attended')).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Mark attended: Attendee A'}));
 expect(await screen.findByText('Attendance saved. Registration numbers are unchanged.')).toBeInTheDocument();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Mark not attended: Attendee A'})).toBeEnabled());
 const summary=screen.getByRole('heading',{name:'Registration and attendance'}).closest('section')!;
 expect(within(summary).getByText('2')).toBeInTheDocument();expect(within(summary).getByText('1')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Mark not attended: Attendee A'}));
 await waitFor(()=>expect(screen.getAllByText('Registered but not attended')).toHaveLength(2));
 fireEvent.click(screen.getByRole('button',{name:'Refresh attendance'}));
 expect(fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(2);
});
test('TC_E09S06_03 — non-Completed server capability disables writes',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>reply({attendance:{...initial,status:'confirmed',canRecord:false}})));mount();
 expect(await screen.findByText('Attendance can only be recorded after the event is Completed.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Mark attended: Attendee A'})).toBeDisabled();
});
test('attendance empty state and server read refusal/retry',async()=>{
 let failed=true;vi.stubGlobal('fetch',vi.fn(async()=> failed?reply({error:'Attendance temporarily unavailable.'},503):reply({attendance:{...initial,attendees:[],registeredCount:0}})));mount();
 expect(await screen.findByText('Attendance temporarily unavailable.')).toBeInTheDocument();
 failed=false;fireEvent.click(screen.getByRole('button',{name:/Try again|Retry/i}));
 expect(await screen.findByText('No registered Attendees for this event.')).toBeInTheDocument();
});
test('server write refusal is visible without changing the attendee',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_u:string,init?:RequestInit)=> init?.method==='POST'?reply({error:'Attendance can only be recorded after the event is Completed.'},409):reply({attendance:initial})));mount();
 fireEvent.click(await screen.findByRole('button',{name:'Mark attended: Attendee A'}));
 expect(await screen.findByText('Attendance can only be recorded after the event is Completed.')).toBeInTheDocument();
 expect(screen.getAllByText('Registered but not attended')).toHaveLength(2);
});
test.each([200,503])('late read %s for event A never replaces event B',async status=>{
 let release!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('id=A')?new Promise<Response>(r=>{release=r;}):reply({attendance:{...initial,eventCode:'B',title:'Other event'}})));mount();
 await waitFor(()=>expect(release).toBeTypeOf('function'));fireEvent.click(screen.getByText('Event B'));
 expect(await screen.findByRole('heading',{name:'Attendance: Other event'})).toBeInTheDocument();
 await act(async()=>release(reply({attendance:initial},status)));
 expect(screen.getByRole('heading',{name:'Attendance: Other event'})).toBeInTheDocument();
});
test('navigating during save aborts late response and hides the old success',async()=>{
 let release!:(r:Response)=>void;let signal:AbortSignal|undefined;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(init?.method==='POST'){signal=init.signal as AbortSignal;return new Promise<Response>(r=>{release=r;});}
  return reply({attendance:{...initial,title:url.endsWith('id=A')?'Charity Run':'Other event'}});
 }));mount();fireEvent.click(await screen.findByRole('button',{name:'Mark attended: Attendee A'}));
 fireEvent.click(screen.getByText('Event B'));expect(await screen.findByRole('heading',{name:'Attendance: Other event'})).toBeInTheDocument();
 expect(signal?.aborted).toBe(true);await act(async()=>release(reply({attendance:{}})));
 expect(screen.queryByText('Attendance saved. Registration numbers are unchanged.')).not.toBeInTheDocument();
});
test('aborted save rejection on navigation is ignored',async()=>{
 let reject!:(e:unknown)=>void;vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(init?.method==='POST')return new Promise<Response>((_r,j)=>{reject=j;});
  return reply({attendance:initial});
 }));mount();fireEvent.click(await screen.findByRole('button',{name:'Mark attended: Attendee A'}));
 fireEvent.click(screen.getByText('Event B'));
 await act(async()=>reject(new DOMException('Aborted','AbortError')));
 expect(screen.queryByText('Unable to save attendance. Please try again.')).not.toBeInTheDocument();
});
test('unexpected save response failure is recoverable and shows an error',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
   if(init?.method==='POST')return {json:async()=>({}),get ok(){throw new Error('invalid response');}} as unknown as Response;
   return reply({attendance:initial});
 }));mount();fireEvent.click(await screen.findByRole('button',{name:'Mark attended: Attendee A'}));
 expect(await screen.findByText('Unable to save attendance. Please try again.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Mark attended: Attendee A'})).toBeEnabled();
});
