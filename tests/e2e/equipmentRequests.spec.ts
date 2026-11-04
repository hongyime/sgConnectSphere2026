import {test,expect,type Page} from '@playwright/test';
import {signInAs} from './helpers/fakeSession';
const equipment=[{id:'eq1',name:'Wireless Microphone',category:'Audio',total_quantity:10,operational_status:'available'},{id:'eq2',name:'Projector',category:'Projection',total_quantity:2,operational_status:'available'}];
type Row={id:string;equipmentId:string;name:string;quantity:number;notes:string;totalStock:number;operationalStatus:string;isActive:boolean;reserved:boolean};
async function setup(page:Page,initial:Row[]=[]){
  const rows:{[code:string]:Row[]}={'EVT-A':initial,'EVT-B':[]};await signInAs(page,'event_coordinator');
  await page.route('**/api/equipment**',async route=>{
    const code=new URL(route.request().url()).searchParams.get('event')??'EVT-A';
    if(route.request().method()==='POST'){
      const body=route.request().postDataJSON();if(body.action==='removeRequest'){rows[code]=rows[code].filter(r=>r.id!==body.id);return route.fulfill({json:{removed:true,notified:1}});}
      const option=equipment.find(e=>e.id===body.equipmentId)!;const id=body.id??`req-${rows[code].length+1}`;
      rows[code]=[...rows[code].filter(r=>r.id!==id),{id,equipmentId:option.id,name:option.name,quantity:body.quantity,notes:body.notes,totalStock:option.total_quantity,operationalStatus:'available',isActive:true,reserved:false}];
      return route.fulfill({status:body.id?200:201,json:{requestId:id,changed:true,notified:1,warning:body.quantity>option.total_quantity?{name:option.name,requested:body.quantity,totalStock:option.total_quantity}:null}});
    }
    return route.fulfill({json:{event:{id:code,eventCode:code,title:code==='EVT-A'?'Tech Conference':'Charity Run',status:'planning'},equipment,requests:rows[code],canEdit:true}});
  });return rows;
}
async function add(page:Page,item:string,quantity:string){await page.getByRole('link',{name:'Add equipment request'}).click();await page.getByLabel('Equipment item',{exact:true}).selectOption(item);await page.getByLabel('Quantity requested',{exact:true}).fill(quantity);await page.getByRole('button',{name:'Save equipment request'}).click();}
test('TC_E07S02_01 save microphone and projector requirements against the selected event',async({page},info)=>{
  const rows=await setup(page);await page.goto('/coordinator/events/EVT-A/equipment');await add(page,'eq1','2');await expect(page.getByText(/Technical Support Staff notified/)).toBeVisible();await add(page,'eq2','1');await expect(page.getByText('Projector',{exact:true})).toBeVisible();expect(rows['EVT-A']).toHaveLength(2);
  await page.screenshot({path:`artifacts/equipment-requests-${info.project.name}.png`,fullPage:true});await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('TC_E07S02_02 over-stock request saves with explicit requested-versus-owned warning',async({page},info)=>{
  await setup(page);await page.goto('/coordinator/events/EVT-A/equipment');await page.getByRole('link',{name:'Add equipment request'}).click();await page.getByLabel('Equipment item').selectOption('eq1');await page.getByLabel('Quantity requested').fill('15');await page.screenshot({path:`artifacts/equipment-request-form-${info.project.name}.png`,fullPage:true});await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Save equipment request'}).click();await expect(page.getByText(/15 units requested, but total stock is 10/)).toBeVisible();await expect(page.getByText('Exceeds total stock',{exact:true})).toBeVisible();
});
test('TC_E07S02_03 requests remain independent across separate events',async({page})=>{
  const rows=await setup(page);await page.goto('/coordinator/events/EVT-A/equipment');await add(page,'eq2','1');await page.goto('/coordinator/events/EVT-B/equipment');await expect(page.getByText('No equipment requested yet')).toBeVisible();expect(rows['EVT-B']).toEqual([]);
});
test('TC_E07S02_04 amend and remove an unreserved equipment line',async({page})=>{
  const rows=await setup(page);await page.goto('/coordinator/events/EVT-A/equipment');await add(page,'eq1','2');await page.getByRole('link',{name:'Edit Wireless Microphone'}).click();await page.getByLabel('Quantity requested').fill('3');await page.getByRole('button',{name:'Save equipment request'}).click();await expect(page.getByText('Equipment request saved.',{exact:false})).toBeVisible();expect(rows['EVT-A'][0].quantity).toBe(3);await page.getByRole('button',{name:'Remove Wireless Microphone…'}).click();await page.getByRole('button',{name:'Confirm removal'}).click();await expect(page.getByText('No equipment requested yet')).toBeVisible();expect(rows['EVT-A']).toEqual([]);
});
// E07-S08 (SCRUM-181): a two-Session event; the fake keeps each request's Session.
test('TC_E07S08_01 the Coordinator records two microphones for Session B and they belong to Session B only',async({page},info)=>{
  const sessions=[{id:'ses-a',title:'A',number:1,startsAt:'2026-11-20T01:00:00.000Z',endsAt:'2026-11-20T03:00:00.000Z'},{id:'ses-b',title:'B',number:2,startsAt:'2026-11-20T05:00:00.000Z',endsAt:'2026-11-20T07:00:00.000Z'}];
  const rows:(Row&{sessionId:string})[]=[{id:'req-a',equipmentId:'eq1',name:'Wireless Microphone',quantity:1,notes:'',totalStock:10,operationalStatus:'available',isActive:true,reserved:false,sessionId:'ses-a'}];
  const posts:Record<string,unknown>[]=[];await signInAs(page,'event_coordinator');
  await page.route('**/api/equipment**',async route=>{
    if(route.request().method()==='POST'){const body=route.request().postDataJSON();posts.push(body);rows.push({...rows[0]!,id:'req-b',quantity:body.quantity,sessionId:body.sessionId});return route.fulfill({status:201,json:{requestId:'req-b',changed:true,notified:1,warning:null}});}
    return route.fulfill({json:{event:{id:'e1',eventCode:'E-1',title:'Two-Session Summit',status:'planning'},equipment,sessions,requests:rows,canEdit:true}});
  });
  await page.goto('/coordinator/events/E-1/equipment');await page.getByRole('link',{name:'Add equipment request'}).click();
  await page.getByLabel('Session',{exact:true}).selectOption('ses-b');await page.getByLabel('Equipment item',{exact:true}).selectOption('eq1');await page.getByLabel('Quantity requested',{exact:true}).fill('2');
  await page.screenshot({path:`artifacts/equipment-request-session-form-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Save equipment request'}).click();await expect(page.getByText('Equipment request saved.')).toBeVisible();
  expect(posts[0]).toMatchObject({action:'saveRequest',equipmentId:'eq1',quantity:2,sessionId:'ses-b'});
  const b=page.getByRole('region',{name:'B',exact:true});await expect(b.locator('tbody tr')).toHaveCount(1);await expect(b.locator('tbody tr')).toContainText('2');
  await expect(page.getByRole('region',{name:'A',exact:true}).locator('tbody tr')).toHaveCount(1);
  await page.screenshot({path:`artifacts/equipment-requests-sessions-${info.project.name}.png`,fullPage:true});await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
