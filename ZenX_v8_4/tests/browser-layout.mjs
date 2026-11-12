import { createRequire } from 'node:module';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdirSync } from 'node:fs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join,extname,sep} from 'node:path';
import {createServer} from 'node:http';
const require=createRequire(import.meta.url);
const extensionRoot=resolve(fileURLToPath(new URL('../',import.meta.url)));
const artifacts=resolve(process.env.ZENX_TEST_ARTIFACTS||join(extensionRoot,'tests/artifacts'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(extensionRoot,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(extensionRoot+sep)){res.writeHead(403);res.end();return;}
  const content=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(content);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let chromium;
try{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'));}
catch{server.close();throw new Error('Install Playwright: npm install --no-save playwright. Or set PLAYWRIGHT_MODULE to its installed module path.');}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:process.getuid?.()===0?['--no-sandbox']:[]});
const results=[], errors=[];
mkdirSync(artifacts,{recursive:true});
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,detail});console.log('PASS',name,detail||'');}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
async function command(page,type,extra={}){return page.evaluate(({type,extra})=>new Promise(resolve=>chrome.runtime.__send({type,...extra},resolve)),{type,extra});}
async function ready(page,url){await page.goto(base+url);await page.waitForSelector('html.zenx-premium #zd-floating-sla-timer');await page.waitForTimeout(750);}
async function geometry(page){return page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const fields=document.querySelector('[data-test-id="component-type-TicketFieldsPane"]');
 const main=document.querySelector('[data-test-id="component-type-MainConversationPane"]');
 const apps=document.querySelector('[data-test-id="component-type-AppsPane"]');
 const layout=document.querySelector('.workspace-grid');
 const log=document.querySelector('#chat-area');
 const composer=document.querySelector('.composer-wrap');
 return {fields:rect(fields),main:rect(main),apps:rect(apps),layout:rect(layout),log:rect(log),composer:rect(composer),workspaceTag:layout.dataset.zenxWorkspace||null,columns:getComputedStyle(layout).gridTemplateColumns,display:getComputedStyle(layout).display,bodyHeight:document.body.scrollHeight,innerHeight:innerHeight,logScroll:log.scrollHeight-log.clientHeight,mainStyle:{backgroundImage:getComputedStyle(main).backgroundImage,borderRadius:getComputedStyle(main).borderRadius},navStyle:{backgroundImage:getComputedStyle(document.querySelector('nav')).backgroundImage,backgroundColor:getComputedStyle(document.querySelector('nav')).backgroundColor}};
 });}
if(process.env.ZENX_UI_ONLY!=='1'){
for(const fixture of ['grid','nested','flex','nested-height']){
 for(const [width,height] of [[1917,940],[1672,941],[1100,800],[800,700]]){
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',e=>errors.push({fixture,width,message:e.message}));
  await check(`${fixture} ${width}×${height} layout`,async()=>{
   await ready(page,`/tests/fixtures/${fixture}.html`);
   const g=await geometry(page);
   assert.ok(g.main.width>200,`conversation width=${g.main.width}`);
   assert.ok(g.main.height>200,`conversation height=${g.main.height}`);
   assert.ok(Math.abs(g.main.height-g.fields.height)<3,`fields height ${g.fields.height} differs from conversation ${g.main.height}`);
   assert.ok(Math.abs(g.main.height-g.apps.height)<3,`apps height ${g.apps.height} differs from conversation ${g.main.height}`);
   assert.ok(g.fields.y-g.layout.y>=7,`top padding=${g.fields.y-g.layout.y}`);
   assert.ok(g.main.y-g.layout.y>=7,`conversation top padding=${g.main.y-g.layout.y}`);
   assert.ok(g.layout.bottom-g.main.bottom>=7,`bottom padding=${g.layout.bottom-g.main.bottom}`);
   assert.ok(g.main.x-g.fields.right>=7,`left gap=${g.main.x-g.fields.right}`);
   assert.ok(g.apps.x-g.main.right>=7,`right gap=${g.apps.x-g.main.right}`);
   assert.ok(g.main.x-g.layout.x>=7,`outer left padding=${g.main.x-g.layout.x}`);
   assert.ok(g.composer.bottom<=g.main.bottom+1,`composer clipped: composer ${g.composer.bottom}, main ${g.main.bottom}`);
   assert.ok(g.log.bottom<=g.composer.y+1,`log overlaps composer ${g.log.bottom-g.composer.y}px`);
   assert.ok(g.composer.y-g.log.bottom<26,`chat ends ${g.composer.y-g.log.bottom}px above composer`);
   assert.ok(g.log.height>100,`log height ${g.log.height}`);
   assert.ok(g.bodyHeight<=g.innerHeight+1,`page vertical overflow ${g.bodyHeight-g.innerHeight}`);
   assert.ok(g.mainStyle.backgroundImage.includes('url('),'conversation wallpaper missing');
   await page.screenshot({path:join(artifacts,`${fixture}-${width}.png`)});
   return {workspaceTag:g.workspaceTag,gaps:[g.main.x-g.fields.right,g.apps.x-g.main.right],padding:[g.main.y-g.layout.y,g.layout.bottom-g.main.bottom],columns:g.columns};
  });
  await check(`${fixture} ${width} long log and composer`,async()=>{
   await page.evaluate(()=>{const box=document.querySelector('#mock-messages'),first=box.firstElementChild;for(let i=0;i<36;i++){const el=first.cloneNode(true);el.dataset.eventId='long-'+i;el.querySelector('[data-test-id="omni-log-message-content"]').textContent='Long conversation message '+i+' '+('Content remains readable. '.repeat(7));box.appendChild(el);}});
   await page.waitForTimeout(350);
   const g=await geometry(page);
   assert.ok(g.logScroll>100,'long log should scroll');
   await page.locator('#chat-area').evaluate(el=>el.scrollTop=el.scrollHeight);
   const message=page.locator('#mock-messages article').last();
   const mr=await message.boundingBox();
   assert.ok(mr.y+mr.height<=g.log.bottom+2,'last message clipped at scroll end');
   assert.ok(g.composer.bottom<=g.main.bottom+1,'composer clipped after long log');
   await page.locator('[contenteditable="true"]').fill('Reviewable draft text');
   assert.equal(await page.locator('[contenteditable="true"]').innerText(),'Reviewable draft text');
   return {scrollRange:g.logScroll};
  });
  await page.close();
 }
}
const page=await browser.newPage({viewport:{width:1672,height:941}});
page.on('pageerror',e=>errors.push({fixture:'interactions',message:e.message}));
await ready(page,'/tests/fixtures/nested.html');
await check('Navigation, header avatar, ticket use glass surfaces',async()=>{
 const styles=await page.evaluate(()=>Object.fromEntries(Object.entries({nav:document.querySelector('nav'),avatar:document.querySelector('[data-test-id="user-menu"]'),ticket:document.querySelector('[data-test-id="ticket-id"]')}).map(([key,el])=>{const s=getComputedStyle(el);return [key,{backdropFilter:s.backdropFilter,borderRadius:s.borderRadius,boxShadow:s.boxShadow}];})));
 for(const [key,s] of Object.entries(styles)){
  assert.ok(s.backdropFilter.includes('blur('),`${key} has no glass blur: ${JSON.stringify(s)}`);
  assert.ok(parseFloat(s.borderRadius)>=9,`${key} corners ${s.borderRadius}`);
 }
 return styles;
});
await check('Native field edits persist through theme changes',async()=>{
 await page.locator('#native-assignee').fill('Different Agent');
 await page.locator('#native-priority').selectOption('High');
 await page.evaluate(()=>chrome.storage.local.set({zenx_active_theme:ZenXThemes.presets.find(p=>p.id==='ocean-glass')}));
 await page.waitForTimeout(400);
 assert.equal(await page.locator('html').getAttribute('data-zenx-theme'),'ocean-glass');
 assert.equal(await page.locator('#native-assignee').inputValue(),'Different Agent');
 assert.equal(await page.locator('#native-priority').inputValue(),'High');
});
await check('Native app tabs and iframe preserved',async()=>{
 await page.locator('#oracle-tab').click();
 await page.waitForTimeout(250);
 assert.ok((await page.locator('#mock-tool-frame').getAttribute('src')).includes('oracle'));
 await page.locator('#sherpa-tab').click();
 assert.ok((await page.locator('#mock-tool-frame').getAttribute('src')).includes('sherpa'));
});
await check('Removed fields button and drawer functionality stay absent',async()=>{
 assert.equal(await page.locator('#zenx-fields-toggle,#zenx-fields-backdrop,#zenx-fields-drawer-label').count(),0);
 const popup=await (await page.request.get(base+'/popup.html')).text();
 assert.ok(!popup.includes('id="toggle-fields-drawer"'),'removed popup control remains');
 const answer=await command(page,'SET_FIELDS_DRAWER',{open:true});
 assert.equal(answer.success,false,'removed drawer command should not execute');
 assert.ok(!(await page.locator('html').getAttribute('class')).includes('zenx-drawer-open'));
 assert.equal(await page.locator('#native-assignee').inputValue(),'Different Agent');
});
await check('Focus mode occupies freed columns',async()=>{
 const before=await geometry(page);
 await command(page,'SET_FOCUS_MODE',{enabled:true});
 await page.waitForTimeout(500);
 const during=await geometry(page);
 assert.ok(during.main.width>before.main.width+200,`focus width before=${before.main.width}, after=${during.main.width}`);
 assert.ok(during.main.width>=during.layout.width-50,`focus retains ghost columns: main ${during.main.width}, workspace ${during.layout.width}`);
 await command(page,'SET_FOCUS_MODE',{enabled:false});
 await page.waitForTimeout(400);
 assert.ok((await geometry(page)).fields.width>150,'fields failed to return');
 return {before:before.main.width,focus:during.main.width};
});
await check('Timer duration cycling, mute, pin, drag retained',async()=>{
 await command(page,'SET_MANUAL_DURATION',{durationSec:120});
 const timer=page.locator('#zd-floating-sla-timer');
 await timer.hover();
 await page.waitForTimeout(450);
 await page.locator('#zd-timer-sla-btn').click();
 assert.equal((await page.locator('#zd-timer-sla-btn').innerText()).trim(),'5m');
 const mute=page.locator('#zd-timer-btn-mute');
 const oldTitle=await mute.getAttribute('title');
 await mute.click();
 assert.notEqual(await mute.getAttribute('title'),oldTitle,'mute button unchanged');
 await page.locator('#zd-timer-clock-btn').click();
 await page.waitForTimeout(500);
 const pin=await page.evaluate(()=>localStorage.getItem('zd_timer_pinned'));
 assert.ok(['true','false'].includes(pin));
 const before=await timer.boundingBox();
 const h=await page.locator('#zd-timer-drag-handle').boundingBox();
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);
 await page.mouse.down();await page.mouse.move(h.x+h.width/2-70,h.y+h.height/2+40,{steps:10});await page.mouse.up();
 const after=await timer.boundingBox();
 assert.ok(Math.abs(after.x-before.x)>10||Math.abs(after.y-before.y)>10,'timer drag unchanged');
 return {pin,moved:[Math.round(after.x-before.x),Math.round(after.y-before.y)]};
});
await check('Light mode keeps native editor and pane sizes',async()=>{
 await command(page,'SET_THEME',{darkMode:false});
 await page.waitForTimeout(500);
 assert.ok((await page.locator('html').getAttribute('class')).includes('zskin-light'));
 const g=await geometry(page);assert.ok(g.log.height>100&&g.composer.bottom<=g.main.bottom+1);
 await page.locator('[contenteditable="true"]').fill('Light draft');
 assert.equal(await page.locator('[contenteditable="true"]').innerText(),'Light draft');
});
await check('Closed ticket, short log, no composer retains readable chat',async()=>{
 await page.locator('#toggle-closed').click();
 await page.locator('.composer-wrap').evaluate(el=>el.style.display='none');
 await page.waitForTimeout(500);
 const g=await geometry(page);
 assert.ok(g.log.bottom>=g.main.bottom-3,`short log leaves ${g.main.bottom-g.log.bottom}px void`);
 assert.ok(g.log.height>100,'closed log collapsed');
});
await check('Macro inserts a draft without sending',async()=>{
 // Macro insertion is intentionally unavailable on a closed ticket. Reopen
 // through the native fixture control before checking the draft behavior.
 await page.locator('#toggle-closed').click();
 await page.locator('.composer-wrap').evaluate(el=>el.style.removeProperty('display'));
 await page.waitForTimeout(200);
 const count=await page.locator('#mock-messages article').count();
 const answer=await command(page,'INSERT_MACRO',{text:'Please allow me 3-5 minutes to review this.'});
 assert.equal(answer.success,true);
 assert.ok((await page.locator('[contenteditable="true"]').innerText()).includes('3-5 minutes'));
 assert.equal(await page.locator('#mock-messages article').count(),count);
});
await check('Disabling and re-enabling restores native fields',async()=>{
 await command(page,'TOGGLE_ENABLED',{enabled:false});await page.waitForTimeout(500);
 assert.equal(await page.locator('#zd-floating-sla-timer').count(),0);
 assert.ok(!(await page.locator('html').getAttribute('class')).includes('zenx-premium'));
 assert.equal(await page.locator('#native-assignee').inputValue(),'Different Agent');
 await command(page,'TOGGLE_ENABLED',{enabled:true});await page.waitForTimeout(500);
 assert.equal(await page.locator('#zd-floating-sla-timer').count(),1);
 assert.equal(await page.locator('#native-assignee').inputValue(),'Different Agent');
});
await page.close();
async function extraReady(path,viewport={width:1672,height:941},clock=false){
 const p=await browser.newPage({viewport});
 p.on('pageerror',e=>errors.push({fixture:path,message:e.message}));
 if(clock)await p.clock.install();
 await ready(p,path);await p.waitForSelector('[data-zenx-workspace]');return p;
}
for(const width of [1917,800]){
 const p=await extraReady('/tests/fixtures/aliases.html',{width,height:941});
 await check('Alternate native pane selectors '+width,async()=>{
  const values=await p.evaluate(()=>{
   const rect=x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
   const workspace=document.querySelector('[data-zenx-workspace]');
   const fields=document.querySelector('[data-test-id="ticket-fields"]'),main=document.querySelector('[data-test-id="ticket-conversation"]'),apps=document.querySelector('[data-test-id="ticket-apps-pane"]');
   return {fields:rect(fields),main:rect(main),apps:rect(apps),workspace:rect(workspace),surfaces:[fields,main,apps].map(x=>x.dataset.zenxSurface)};
  });
  assert.deepEqual(values.surfaces,['fields','conversation','apps']);
  assert.ok(values.main.width>=200,'conversation too narrow');
  assert.ok(Math.abs(values.main.height-values.fields.height)<3,`fields card not full-height: main ${values.main.height}, fields ${values.fields.height}`);
  assert.ok(Math.abs(values.main.height-values.apps.height)<3,`apps card not full-height: main ${values.main.height}, apps ${values.apps.height}`);
  assert.ok(values.main.top-values.workspace.top>=8,'no outer padding');
  assert.ok(values.main.left-values.fields.right>=8,'no field gap');
  assert.ok(values.apps.left-values.main.right>=8,'no apps gap');
  return values;
 });
 await p.close();
}
const p=await extraReady('/tests/fixtures/grid.html');
await check('Native profile and navigation clicks preserved',async()=>{
 await p.evaluate(()=>{window.nativeClickCounts={nav:0,profile:0};document.querySelector('nav button').addEventListener('click',()=>window.nativeClickCounts.nav++);document.querySelector('[data-test-id="user-menu"]').addEventListener('click',()=>window.nativeClickCounts.profile++);});
 await p.locator('nav button').first().click();
 await p.locator('[data-test-id="user-menu"]').click();
 assert.deepEqual(await p.evaluate(()=>window.nativeClickCounts),{nav:1,profile:1});
});
await check('All themes retain editable native controls and glass markers',async()=>{
 const themes=await p.evaluate(()=>ZenXThemes.presets.map(t=>({id:t.id,mode:t.mode})));
 for(const {id,mode} of themes.filter(t=>t.id!=='classic')){
  await p.evaluate(id=>chrome.storage.local.set({zenx_active_theme:ZenXThemes.presets.find(t=>t.id===id)}),id);
  await p.waitForTimeout(140);
  assert.equal(await p.locator('html').getAttribute('data-zenx-theme'),id);
  await p.locator('#native-assignee').fill('Agent '+id);
  assert.equal(await p.locator('#native-assignee').inputValue(),'Agent '+id);
  assert.ok(await p.locator('[data-zenx-surface="conversation"]').count(),id+' missing conversation surface');
  assert.ok((await p.locator('html').getAttribute('class')).includes(mode==='dark'?'zskin-dark':'zskin-light'),id+' incorrect light/dark mode');
 }
 return {themeCount:themes.length-1};
});
await p.close();
for(const [width,height] of [[1672,941],[800,700]]){
 const p=await extraReady('/tests/fixtures/grid.html',{width,height},true);
 await check('Docked macro popup fits viewport '+width,async()=>{
  await p.evaluate(()=>{
   window.popupMutationCount=0;
   const observer=new MutationObserver(changes=>window.popupMutationCount+=changes.length);
   observer.observe(document.querySelector('#zd-floating-sla-timer'),{attributes:true,attributeFilter:['style'],subtree:true});
   window.popupTestObserver=observer;
  });
  await command(p,'SET_MUTE',{isMuted:true});
  await command(p,'SET_MANUAL_DURATION',{durationSec:120});
  await p.clock.fastForward(115000);
  await p.waitForTimeout(650);
  const popup=p.locator('#zd-timer-macro-popup');
  assert.equal(await popup.isVisible(),true,'macro popup failed to appear');
  const r=await popup.boundingBox();
  assert.ok(r.x>=0&&r.y>=0,`popup negative top/left ${JSON.stringify(r)}`);
  assert.ok(r.x+r.width<=width+1,`popup clips right ${JSON.stringify(r)}`);
  assert.ok(r.y+r.height<=height+1,`popup clips bottom ${JSON.stringify(r)}`);
  const mutations=await p.evaluate(()=>window.popupMutationCount);
  assert.ok(mutations<100,`popup position mutation loop: ${mutations} writes`);
  await p.screenshot({path:join(artifacts,`macro-docked-${width}.png`)});
  return {...r,styleMutations:mutations};
 });
 await check('Dragged macro and sections dropdown fit viewport '+width,async()=>{
  const timer=p.locator('#zd-floating-sla-timer');
  await timer.hover();await p.waitForTimeout(450);
  const handle=await p.locator('#zd-timer-drag-handle').boundingBox();
  await p.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await p.mouse.down();
  await p.mouse.move(handle.x+handle.width/2-50,Math.min(height-80,handle.y+handle.height/2+350),{steps:10});
  await p.mouse.up();await p.waitForTimeout(300);
  const macro=await p.locator('#zd-timer-macro-popup').boundingBox();
  assert.ok(macro.x>=0&&macro.y>=0&&macro.x+macro.width<=width+1&&macro.y+macro.height<=height+1,`dragged macro clips ${JSON.stringify(macro)}`);
  await p.locator('#zd-sections-toggle-btn').click();await p.waitForTimeout(300);
  const sections=await p.locator('#zd-sections-dropdown').boundingBox();
  assert.ok(sections&&sections.x>=0&&sections.y>=0&&sections.x+sections.width<=width+1&&sections.y+sections.height<=height+1,`sections dropdown clips ${JSON.stringify(sections)}`);
  return {macro,sections};
 });
 await p.close();
}
}
// V8.4 regressions run before closing the shared browser/server.
await import('./ui-regressions.mjs').then(module=>module.run({browser,base,check,command,ready,artifacts,errors}));
await browser.close();
await new Promise(resolve=>server.close(resolve));
writeFileSync(join(artifacts,'results.json'),JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,pageErrors:errors,artifacts},null,2));
process.exitCode=results.some(x=>!x.pass)||errors.length?1:0;
