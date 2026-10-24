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
  let submitted=false;
  const rejected={id:'rejected',venue_id:'old',venue_name:'Original Hall',location:'Campus',status:'rejected',starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z',purpose:'Breakout',headcount:40,decision_reason:'Try another room',suggested_venue_id:'new',suggested_venue_name:'Suggested Hall'};
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event:{id:'event',event_code:'EVT-1',title:'Synthetic Conference',status:'planning',starts_at:'2027-01-15T01:00:00Z',ends_at:'2027-01-15T10:00:00Z'},bookings:[{...rejected,has_replacement:submitted},...(submitted?[{...rejected,id:'replacement',venue_id:'new',venue_name:'Suggested Hall',status:'pending',suggested_venue_id:null,suggested_venue_name:null}]:[])]}}));
  await page.route('**/api/venues',route=>{
    expect(route.request().postDataJSON()).toMatchObject({venue_id:'new',replaces_booking_id:'rejected',purpose:'Breakout',headcount:40});
    submitted=true;
    return route.fulfill({status:201,json:{booking:{id:'replacement'},suitability:{mismatches:[]}}});
  });
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await page.getByRole('button',{name:'Request suggested venue',exact:true}).click();
  await expect(page.getByLabel('Purpose (optional)')).toHaveValue('Breakout');
  await expect(page.getByLabel('Headcount (optional)')).toHaveValue('40');
  await expect(page.getByText('Rejected',{exact:true})).toBeVisible();
  await page.screenshot({path:test.info().outputPath('suggested-venue-prefill.png'),fullPage:true});
  await page.getByRole('button',{name:'Submit booking request'}).click();
  await expect(page.getByText('Replacement booking request submitted. The new request is Pending.',{exact:true})).toBeVisible();
  await expect(page.getByText('Rejected',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Suggested Hall',exact:true})).toBeVisible();
  await expect(page.getByText('Pending',{exact:true})).toBeVisible();
  await expect(page.getByText('A replacement request has already been submitted.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Booking request submitted'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Request suggested venue',exact:true})).toHaveCount(0);
});

test('TC_E06S03_08 TC_E06S03_12 withdraw a replacement and offer a fresh suggested-venue request',async({page})=>{
  let released=false;
  const event={id:'event',event_code:'EVT-1',title:'Synthetic Conference',status:'planning'};
  const common={location:'Campus',starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z'};
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event,bookings:[
    {...common,id:'original',venue_id:'old',venue_name:'Original Hall',status:'rejected',suggested_venue_id:'new',suggested_venue_name:'Suggested Hall',has_replacement:!released},
    {...common,id:'replacement',venue_id:'new',venue_name:'Suggested Hall',status:released?'released':'pending',replaces_booking_id:'original'},
    {...common,id:'other',venue_id:'other-venue',venue_name:'Confirmed Hall',status:'confirmed',is_primary:true},
  ]}}));
  await page.route('**/api/venues',route=>{
    expect(route.request().postDataJSON()).toEqual({action:'withdraw_booking',booking_id:'replacement'});
    released=true;return route.fulfill({json:{booking:{id:'replacement',status:'released'},unresolved_venue_ids:[]}});
  });
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await expect(page.getByRole('button',{name:'Withdraw request'})).toHaveCount(1);
  await page.getByRole('button',{name:'Withdraw request'}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(released).toBe(false);
  await page.getByRole('button',{name:'Withdraw request'}).click();
  await page.getByRole('button',{name:'Confirm withdrawal'}).click();
  await expect(page.getByText('Booking request withdrawn. Other bookings are unchanged.')).toBeVisible();
  await expect(page.getByText('Released',{exact:true})).toBeVisible();
  await expect(page.getByText('Confirmed',{exact:true})).toBeVisible();
  await expect(page.getByText('Primary venue',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Request suggested venue',exact:true})).toBeVisible();
  await page.screenshot({path:test.info().outputPath('withdrawal-retry.png'),fullPage:true});
});

test('TC_E06S03_10 a staff decision racing withdrawal prompts refresh instead of overwriting',async({page})=>{
  let decided=false;
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event:{id:'event',event_code:'EVT-1',title:'Synthetic Conference',status:'planning'},bookings:[
    {id:'booking',venue_id:'venue',venue_name:'Central Hall',location:'Campus',status:decided?'confirmed':'pending',starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z'},
  ]}}));
  await page.route('**/api/venues',route=>{decided=true;return route.fulfill({status:409,json:{error:'Only Pending venue requests can be withdrawn. Refresh the booking list to see its current status.'}});});
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await page.getByRole('button',{name:'Withdraw request'}).click();
  await page.getByRole('button',{name:'Confirm withdrawal'}).click();
  await expect(page.getByRole('alert')).toContainText('Only Pending venue requests');
  await page.getByRole('button',{name:'Refresh booking list'}).click();
  await expect(page.getByText('Confirmed',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Withdraw request'})).toHaveCount(0);
});

test('TC_E06S03_07 Coordinator selects another Confirmed primary without changing booking statuses',async({page})=>{
  let selected=false,posts=0;
  const common={location:'Campus',starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z'};
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event:{id:'event',event_code:'EVT-1',title:'Synthetic Confirmed Event',status:'confirmed'},bookings:[
    {...common,id:'first',venue_id:'v1',venue_name:'First Hall',status:'confirmed',is_primary:!selected},
    {...common,id:'second',venue_id:'v2',venue_name:'Second Hall',status:'confirmed',is_primary:selected},
    {...common,id:'pending',venue_id:'v3',venue_name:'Pending Hall',status:'pending',is_primary:false},
  ]}}));
  await page.route('**/api/venues',route=>{
    expect(route.request().postDataJSON()).toEqual({action:'set_primary',booking_id:'second'});
    posts++;selected=true;return route.fulfill({json:{booking:{id:'second',status:'confirmed',is_primary:true},replayed:false}});
  });
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await expect(page.getByRole('button',{name:'Set as primary venue',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Set as primary venue',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(posts).toBe(0);
  await page.getByRole('button',{name:'Set as primary venue',exact:true}).click();
  await page.getByRole('button',{name:'Set primary venue',exact:true}).click();
  await expect(page.getByText('Primary venue updated. Booking statuses are unchanged.')).toBeVisible();
  await expect(page.getByRole('region',{name:'Second Hall',exact:true}).getByText('Primary venue',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'First Hall',exact:true}).getByRole('button',{name:'Set as primary venue'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Pending Hall',exact:true}).getByRole('button',{name:'Set as primary venue'})).toHaveCount(0);
  await expect(page.getByText('Confirmed',{exact:true})).toHaveCount(3);
  expect(posts).toBe(1);
  await page.screenshot({path:test.info().outputPath('primary-selected.png'),fullPage:true});
});

test('TC_E06S03_07 stale primary selection refuses and refreshes current status',async({page})=>{
  let released=false;
  await page.route('**/api/venues?*',route=>route.fulfill({json:{event:{id:'event',title:'Synthetic Event',status:'planning'},bookings:[
    {id:'second',venue_id:'v2',venue_name:'Second Hall',location:'Campus',status:released?'released':'confirmed',is_primary:false,starts_at:'2027-01-15T02:00:00Z',ends_at:'2027-01-15T03:00:00Z'},
  ]}}));
  await page.route('**/api/venues',route=>{released=true;return route.fulfill({status:409,json:{error:'Only Confirmed bookings can be the primary venue. Refresh the booking list.'}});});
  await page.goto('/coordinator/events/EVT-1/venue-bookings');
  await page.getByRole('button',{name:'Set as primary venue',exact:true}).click();
  await page.getByRole('button',{name:'Set primary venue',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Only Confirmed');
  await page.getByRole('button',{name:'Refresh booking list'}).click();
  await expect(page.getByText('Released',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Set as primary venue'})).toHaveCount(0);
});
