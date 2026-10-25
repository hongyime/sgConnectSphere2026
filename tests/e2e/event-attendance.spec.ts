// E09-S06 / SCRUM-68 browser presentation contract, stubbed API.
// Actual persistence, authorization, audit rollback and retry proof: backend/tests/eventAttendance*.test.ts.
import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';
const initial={eventCode:'ATTENDANCE',title:'Charity Run',status:'completed',canRecord:true,registeredCount:5,attendedCount:0,
 attendees:Array.from({length:5},(_,i)=>({registrationId:`r${i}`,name:`Attendee ${i}`,email:`attendee${i}@example.test`,attended:false}))};
test('TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — attendance saves without changing registered count and survives reload',async({page})=>{
 await signInAs(page,'event_coordinator');const data=structuredClone(initial);
 await page.route('**/api/events?attendance=1**',async route=>{
  if(route.request().method()==='POST') {const body=route.request().postDataJSON();data.attendees.find(a=>a.registrationId===body.registrationId)!.attended=body.attended;data.attendedCount=data.attendees.filter(a=>a.attended).length;return route.fulfill({json:{attendance:body}});}
  return route.fulfill({json:{attendance:data}});
 });
 await page.goto('/coordinator/events/ATTENDANCE/attendance');
 await expect(page.getByText('Registered but not attended',{exact:true})).toHaveCount(5);
 for(let i=0;i<4;i++) {await page.getByRole('button',{name:`Mark attended: Attendee ${i}`,exact:true}).click();await expect(page.getByRole('button',{name:`Mark not attended: Attendee ${i}`,exact:true})).toBeEnabled();}
 await page.reload();const summary=page.locator('section').filter({has:page.getByRole('heading',{name:'Registration and attendance',exact:true})});
 await expect(summary.getByText('5',{exact:true})).toBeVisible();await expect(summary.getByText('4',{exact:true})).toBeVisible();
 await expect(page.getByText('Registered but not attended',{exact:true})).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('TC_E09S06_03 — confirmed event refuses attendance controls',async({page})=>{
 await signInAs(page,'event_coordinator');let writes=0;
 await page.route('**/api/events?attendance=1**',async route=>{if(route.request().method()==='POST')writes++;await route.fulfill({json:{attendance:{...initial,status:'confirmed',canRecord:false}}});});
 await page.goto('/coordinator/events/ATTENDANCE/attendance');
 await expect(page.getByText('Attendance can only be recorded after the event is Completed.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Mark attended: Attendee 0',exact:true})).toBeDisabled();expect(writes).toBe(0);
});
