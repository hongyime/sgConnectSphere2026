import {test,expect} from '@playwright/test';
import {signInAs} from './helpers/fakeSession';
const initial={id:'eq-1',name:'Wireless Microphone',category:'Audio',description:'Handheld UHF',total_quantity:10,home_location:'Main Storage',operational_status:'available',is_active:true};
test('TC_E07S01_01 add equipment and expose it in Coordinator catalogue',async({page})=>{
  let items:typeof initial[]=[];
  await signInAs(page,'technical_support_staff');
  await page.route('**/api/equipment**',async route=>{
    if(route.request().method()==='POST') {const {action,...input}=route.request().postDataJSON();expect(action).toBe('create');items=[{...input,id:'eq-1',is_active:true}];return route.fulfill({status:201,json:{equipment:items[0],affectedReservations:[]}});}
    return route.fulfill({json:{equipment:items}});
  });
  await page.goto('/support/catalogue');await page.getByRole('link',{name:'Add equipment'}).click();
  for(const [label,value] of [['Equipment name','Wireless Microphone'],['Type','Audio'],['Description','Handheld UHF'],['Quantity','10'],['Location','Main Storage']]) await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save equipment'}).click();await expect(page.getByText('Wireless Microphone saved.')).toBeVisible();
  await signInAs(page,'event_coordinator');await page.reload();await expect(page.getByRole('link',{name:'Wireless Microphone',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Add equipment'})).toHaveCount(0);
});
test('TC_E07S01_02 stock reduction displays flagged reservation and notification outcome',async({page})=>{
  let item={...initial};await signInAs(page,'technical_support_staff');
  await page.route('**/api/equipment**',async route=>{
    if(route.request().method()==='POST') {item={...item,...route.request().postDataJSON()};return route.fulfill({json:{equipment:item,affectedReservations:[{id:'r1',eventCode:'EVT-100',quantity:6}]}});}
    return route.fulfill({json:{equipment:new URL(route.request().url()).searchParams.has('id')?item:[item]}});
  });
  await page.goto('/support/catalogue');await page.getByRole('link',{name:'Edit Wireless Microphone'}).click();await page.getByLabel('Quantity',{exact:true}).fill('4');await page.getByRole('button',{name:'Save equipment'}).click();
  await expect(page.getByText('EVT-100: 6 units reserved')).toBeVisible();await expect(page.getByText(/eligible Coordinators notified/)).toBeVisible();
});
test('TC_E07S01_03 retirement removes item and detail retains historical reservations',async({page})=>{
  let item={...initial};await signInAs(page,'technical_support_staff');
  await page.route('**/api/equipment**',async route=>{
    if(route.request().method()==='POST') {expect(route.request().postDataJSON().action).toBe('retire');item.is_active=false;return route.fulfill({json:{retired:true}});}
    return route.fulfill({json:{equipment:new URL(route.request().url()).searchParams.has('id')?{...item,reservations:[{id:'old',eventCode:'EVT-PAST',quantity:2,startsAt:'2026-01-01T01:00:00Z',endsAt:'2026-01-01T03:00:00Z',status:'released',requiresReconfirmation:false}]}:item.is_active?[item]:[]}});
  });
  await page.goto('/support/catalogue');await page.getByRole('button',{name:'Retire Wireless Microphone…'}).click();await page.getByRole('button',{name:'Confirm retirement'}).click();await expect(page.getByText('No equipment yet')).toBeVisible();
  await page.goto('/support/catalogue/eq-1');await expect(page.getByText('EVT-PAST',{exact:true})).toBeVisible();await expect(page.getByText('Retired',{exact:true})).toBeVisible();
});
test('TC_E07S01_04 update equipment location persists after reopening, with responsive shared layout',async({page},info)=>{
  let item={...initial};await signInAs(page,'technical_support_staff');
  await page.route('**/api/equipment**',async route=>{
    if(route.request().method()==='POST') {item={...item,...route.request().postDataJSON()};return route.fulfill({json:{equipment:item,affectedReservations:[]}});}
    return route.fulfill({json:{equipment:new URL(route.request().url()).searchParams.has('id')?item:[item]}});
  });
  await page.goto('/support/catalogue');await page.getByRole('link',{name:'Edit Wireless Microphone'}).click();await page.getByLabel('Location',{exact:true}).fill('Annex Storage');
  await page.screenshot({path:`artifacts/equipment-form-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Save equipment'}).click();await page.getByRole('link',{name:'Wireless Microphone',exact:true}).click();await expect(page.getByText('Annex Storage',{exact:true})).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('main')).toHaveClass(/ui-page/);
  await page.goto('/support/catalogue');await page.screenshot({path:`artifacts/equipment-catalogue-${info.project.name}.png`,fullPage:true});
  await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
