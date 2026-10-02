import { test, expect } from '@playwright/test';
import { signInAs } from './helpers/fakeSession';
test.beforeEach(async ({ page }) => { await signInAs(page, 'event_coordinator'); });
const options={layouts:[{id:'layout',label:'Theatre'}],accessibility:[{id:'ramp',label:'Ramp'}],facilities:[{id:'wifi',label:'WiFi'}]};
const defaults={title:'Synthetic Event',start:'2026-11-10T09:00:00Z',end:'2026-11-10T11:00:00Z',attendance:80,layout:'layout',accessibility:['ramp'],facilities:['wifi'],accessibility_note:'Manual review note'};
const venue={id:'v',name:'Central Hall',location:'Central',max_capacity:200,effective_capacity:50,available:true,suitable:false,mismatches:['Capacity 50 is below the required 80 places.'],layouts:[{id:'layout',label:'Theatre',capacity:50}],accessibility:options.accessibility,facilities:options.facilities};
test('TC_E06S01_01 TC_E06S01_02 TC_E06S01_03: combined filters and near-match failures',async({page})=>{
 await page.route('**/api/venues?*',async route=>{
  const url=new URL(route.request().url());expect(url.searchParams.get('event_id')).toBe('EVT-TEST');
  if(url.searchParams.get('search')==='1') {
   for(const [key,value] of Object.entries({attendance:'80',layout:'layout',accessibility:'ramp',facilities:'wifi',location:'Central',q:'Central',capacity:'70'})) expect(url.searchParams.get(key)).toBe(value);
   expect(url.searchParams.get('start')).toBe(defaults.start.replace('Z','.000Z'));
   expect(url.searchParams.get('end')).toBe(defaults.end.replace('Z','.000Z'));
   await route.fulfill({json:{venues:[venue]}});
  } else await route.fulfill({json:{options,defaults}});
 });
 await page.goto('/coordinator/events/EVT-TEST/venues');
 await expect(page.getByLabel('Expected attendance')).toHaveValue('80');await expect(page.getByLabel('Ramp')).toBeChecked();await expect(page.getByText(/Manual review note/)).toBeVisible();
 await page.getByLabel('Venue name',{exact:true}).fill('Central');await page.getByLabel('Minimum capacity (optional)',{exact:true}).fill('70');await page.getByLabel('Location',{exact:true}).fill('Central');await page.getByRole('button',{name:'Search venues',exact:true}).click();
 await expect(page.getByText('Unsuitable / near match',{exact:true})).toBeVisible();await expect(page.getByText('Capacity 50 is below the required 80 places.',{exact:true})).toBeVisible();await expect(page.getByText('Theatre (50)', {exact:true})).toBeVisible();
 await expect(page.getByRole('main')).toHaveClass(/ui-page/);
 await expect(page.getByRole('heading', {level:1})).toHaveCount(1);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
 await page.evaluate(() => window.scrollTo(0, 0));
 await page.screenshot({path: test.info().outputPath('venue-search-near-match.png'), fullPage:true});
});
test('TC_E06S01_04: unavailable result is not presented as suitable',async({page})=>{
 await page.route('**/api/venues?*',route=>route.fulfill({json:new URL(route.request().url()).searchParams.has('search')?{venues:[{...venue,available:false,mismatches:['Unavailable during the requested period.']}]}:{options,defaults}}));
 await page.goto('/coordinator/venues');await page.getByRole('button',{name:'Search venues',exact:true}).click();await expect(page.getByText('Unavailable',{exact:true})).toBeVisible();
});
test('search access denial shows safe error and no criteria form',async({page})=>{
 await page.route('**/api/venues?*',route=>route.fulfill({status:403,json:{error:'Only Event Coordinators can search for suitable venues.'}}));
 await page.goto('/coordinator/venues');await expect(page.getByRole('alert')).toContainText('Only Event Coordinators');await expect(page.getByRole('button',{name:'Search venues',exact:true})).toHaveCount(0);
});

test('venue search shows suitable results, field errors and empty states', async ({ page }) => {
 let searches = 0;
 await page.route('**/api/venues?*', async route => {
  if (!new URL(route.request().url()).searchParams.has('search')) return route.fulfill({json:{options, defaults}});
  searches += 1;
  if (searches === 1) return route.fulfill({status:400,json:{errors:{end:['End must be after start.']}}});
  if (searches === 2) return route.fulfill({json:{venues:[]}});
  return route.fulfill({json:{venues:[{...venue, suitable:true, effective_capacity:100, mismatches:[]}]}});
 });
 await page.goto('/coordinator/venues');
 await expect(page.getByText('Ready to search', {exact:true})).toBeVisible();
 await page.getByRole('button', {name:'Search venues',exact:true}).click();
 await expect(page.getByLabel('End (required)')).toHaveAttribute('aria-invalid','true');
 await expect(page.getByLabel('End (required)')).toHaveAccessibleDescription('End must be after start.');
 await page.getByRole('button', {name:'Search venues',exact:true}).click();
 await expect(page.getByText('No venues match this name', {exact:true})).toBeVisible();
 await page.getByRole('button', {name:'Search venues',exact:true}).click();
 await expect(page.getByText('Suitable', {exact:true})).toBeVisible();
 await expect(page.getByText('Unmet requirements', {exact:true})).toHaveCount(0);
 await page.setViewportSize({width:320,height:800});
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
