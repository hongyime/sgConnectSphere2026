// SCRUM-47 / E06-S03. Intercepted API browser checks, not a manual or live DB run.
import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';

const assessment = { event: {id:'event',title:'Synthetic Conference',status:'approved',start:'2027-01-15T01:00:00Z',end:'2027-01-15T10:00:00Z'},
  assessment: {id:'venue',name:'Central Hall',location:'Campus',suitable:false,available:true,advisory:true,
    mismatches:['Capacity 100 is below the required 150 places.'],comparisons:[{criterion:'Capacity',required:'150',provided:'100'}]} };
test.beforeEach(async ({page})=>{await signInAs(page,'event_coordinator');});

test('TC_E06S03_01 advisory assessment permits submission and displays Pending with its booking metadata', async ({page})=>{
  await page.route('**/api/venues?*',route=>route.fulfill({json:assessment}));
  let submitted: Record<string,unknown> = {};
  await page.route('**/api/venues',async route=>{
    submitted=route.request().postDataJSON();
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    await route.fulfill({status:201,json:{booking:{id:'booking'},event_status:'planning',suitability:assessment.assessment}});
  });
  await page.goto('/coordinator/events/EVT-1/venues/venue/suitability');
  await page.getByLabel('Purpose (optional)').fill('Main programme');
  await page.getByLabel('Headcount (optional)').fill('120');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:test.info().outputPath('booking-form.png'),fullPage:true});
  await page.getByRole('button',{name:'Submit booking request'}).click();
  await expect(page.getByRole('heading',{name:'Booking request submitted'})).toBeVisible();
  await expect(page.getByText(/Your request is Pending/)).toBeVisible();
  expect(submitted).toMatchObject({event_id:'event',venue_id:'venue',headcount:120,purpose:'Main programme'});
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path:test.info().outputPath('booking-submitted.png'),fullPage:true});
});

test('conflict refusal keeps form available; invalid period prevents a POST',async({page})=>{
  await page.route('**/api/venues?*',route=>route.fulfill({json:assessment}));
  let posts=0;
  await page.route('**/api/venues',route=>{posts++;return route.fulfill({status:409,json:{error:'This venue is occupied, including setup and turnaround.'}});});
  await page.goto('/coordinator/events/EVT-1/venues/venue/suitability');
  await page.getByLabel('Booking start').fill('2027-01-14T09:00');
  await page.getByRole('button',{name:'Submit booking request'}).click();
  await expect(page.getByText('The booking period must fall within the event.')).toBeVisible();expect(posts).toBe(0);
  await page.getByLabel('Booking start').fill('2027-01-15T09:00');
  await page.getByRole('button',{name:'Submit booking request'}).click();
  await expect(page.getByRole('alert')).toContainText('This venue is occupied');
  await expect(page.getByRole('button',{name:'Submit booking request'})).toBeEnabled();
});

test('Confirmed event assessment provides no booking submission controls',async({page})=>{
  await page.route('**/api/venues?*',route=>route.fulfill({json:{...assessment,event:{...assessment.event,status:'confirmed'}}}));
  await page.goto('/coordinator/events/EVT-1/venues/venue/suitability');
  await expect(page.getByRole('heading',{name:'Central Hall'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Submit booking request'})).toHaveCount(0);
});


test('rejected booking switches through a prefilled new Pending request',async({page})=>{
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event:{id:'event',event_code:'EVT-1',title:'Synthetic Conference',status:'planning',starts_at:'2027-01-15T01:00:00Z',ends_at:'2027-01-15T10:00:00Z'},bookings:[{id:'rejected',venue_id:'old',venue_name:'Original Hall',location:'Campus',status:'rejected',starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z',purpose:'Breakout',headcount:40,decision_reason:'Try another room',suggested_venue_id:'new',suggested_venue_name:'Suggested Hall',has_replacement:false}]}}));
  await page.route('**/api/venues',route=>{
    expect(route.request().postDataJSON()).toMatchObject({venue_id:'new',replaces_booking_id:'rejected',purpose:'Breakout',headcount:40});
    return route.fulfill({status:201,json:{booking:{id:'replacement'},suitability:{mismatches:[]}}});
  });
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await page.getByRole('button',{name:'Request suggested venue',exact:true}).click();
  await expect(page.getByLabel('Purpose (optional)')).toHaveValue('Breakout');
  await expect(page.getByLabel('Headcount (optional)')).toHaveValue('40');
  await expect(page.getByText('Rejected',{exact:true})).toBeVisible();
  await page.screenshot({path:test.info().outputPath('suggested-venue-prefill.png'),fullPage:true});
  await page.getByRole('button',{name:'Submit booking request'}).click();
  await expect(page.getByRole('heading',{name:'Booking request submitted'})).toBeVisible();
  await expect(page.getByText('Rejected',{exact:true})).toBeVisible();
});
