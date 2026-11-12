import {strict as assert} from 'node:assert';
import {join} from 'node:path';

export async function run({browser,base,check,command,ready,artifacts,errors}) {
 async function fresh(fn,{width=1917,height=940,init}={}) {
  const p=await browser.newPage({viewport:{width,height}});
  p.on('pageerror',e=>errors.push({fixture:'v84-ui',message:e.message}));
  try {
   if(init)await p.addInitScript(init);
   await ready(p,'/tests/fixtures/nested.html');
   return await fn(p);
  } finally {await p.close();}
 }
 for(const width of [1917,800]) {
  await check('Idle hidden composer releases the full nested chat height '+width,()=>fresh(async p=>{
   await p.locator('#toggle-closed').click();
   await p.evaluate(()=>{
    const composer=document.querySelector('.composer-wrap');
    window.retainedEditor=document.querySelector('[contenteditable="true"]');
    window.retainedSend=document.querySelector('#send-message');
    for(const el of [window.retainedEditor,window.retainedSend])el.style.visibility='hidden';
    Object.assign(composer.style,{height:'110px',minHeight:'110px',maxHeight:'110px'});
   });
   await p.waitForTimeout(700);
   const closed=await p.evaluate(()=>{
    const log=document.querySelector('[data-zenx-scroll-log="1"]'),main=document.querySelector('main'),shell=document.querySelector('.composer-wrap');
    return {gap:main.getBoundingClientRect().bottom-log.getBoundingClientRect().bottom,composerDisplay:getComputedStyle(shell).display,empty:shell.dataset.zenxEmptyComposer};
   });
   assert.ok(closed.gap<=3,'idle invisible composer leaves '+closed.gap+'px reserved');
   assert.equal(closed.composerDisplay,'none','renderless composer still takes layout space');
   await p.screenshot({path:join(artifacts,'idle-full-height-'+width+'.png')});
   await p.evaluate(()=>{window.retainedEditor.style.removeProperty('visibility');window.retainedSend.style.removeProperty('visibility');});
   await p.waitForTimeout(600);
   assert.equal(await p.evaluate(()=>window.retainedEditor===document.querySelector('[contenteditable="true"]')),true,'editor node replaced');
   assert.equal(await p.evaluate(()=>window.retainedSend===document.querySelector('#send-message')),true,'send button replaced');
   await p.locator('[contenteditable="true"]').fill('Reopened editor draft');
   assert.equal(await p.locator('[contenteditable="true"]').innerText(),'Reopened editor draft');
   assert.equal(await p.locator('#send-message').isVisible(),true,'active send button disappeared');
   return closed;
  },{width,height:940}));
 }
 await check('Composer actions stay visible when there is no editable field',()=>fresh(async p=>{
  await p.locator('#toggle-closed').click();
  await p.evaluate(()=>{
   const shell=document.querySelector('.composer-wrap');
   shell.replaceChildren(Object.assign(document.createElement('button'),{id:'native-reopen',textContent:'Reopen conversation'}));
   document.querySelector('#native-reopen').onclick=()=>window.reopenClicked=true;
  });
  await p.waitForTimeout(600);
  assert.equal(await p.locator('#native-reopen').isVisible(),true);
  await p.locator('#native-reopen').click();
  assert.equal(await p.evaluate(()=>window.reopenClicked),true);
 }));
 await check('Actual nested scrollport fills idle card and shows the final internal-note line',()=>fresh(async p=>{
  await p.locator('#toggle-closed').click();
  await p.evaluate(()=>{
   document.querySelector('.composer-wrap').replaceChildren();
   const log=document.querySelector('#chat-area'),inner=document.createElement('div');
   inner.id='inner-scrollport';
   Object.assign(inner.style,{overflowY:'auto',height:'100%',maxHeight:'calc(100% - 110px)',minHeight:'0'});
   inner.append(document.querySelector('#mock-messages'));log.append(inner);
   log.style.overflowY='hidden';
   const box=document.querySelector('#mock-messages'),first=box.firstElementChild;
   for(let i=0;i<24;i++){
    const item=first.cloneNode(true);item.dataset.eventId='nested-long-'+i;
    item.querySelector('[data-test-id="omni-log-message-content"]').textContent='Earlier message '+i+' '+('Readable context. '.repeat(15));box.append(item);
   }
   const note=first.cloneNode(true);note.dataset.eventId='last-internal-note';note.dataset.chatRole='internal';
   const tag=document.createElement('span');tag.dataset.testId='omni-log-internal-note-tag';tag.textContent='Internal note';note.prepend(tag);
   const content=note.querySelector('[data-test-id="omni-log-message-content"]');
   content.textContent='Structured internal note\n'+('Detail line retained\n'.repeat(36));
   const last=document.createElement('span');last.id='note-last-line';last.textContent='FINAL NOTE LINE MUST BE VISIBLE';content.append(last);box.append(note);
  });
  await p.waitForTimeout(800);
  await p.waitForFunction(()=>document.querySelector('#inner-scrollport').getAttribute('data-zenx-scroll-log')==='1');
  const result=await p.evaluate(()=>{
   const scroller=document.querySelector('#inner-scrollport'),main=document.querySelector('main');
   scroller.scrollTop=scroller.scrollHeight;
   return {gap:main.getBoundingClientRect().bottom-scroller.getBoundingClientRect().bottom,range:scroller.scrollHeight-scroller.clientHeight};
  });
  assert.ok(result.gap<=3,'nested scrollport leaves '+result.gap+'px blank');
  assert.ok(result.range>500,'long note should scroll');
  const sr=await p.locator('#inner-scrollport').boundingBox(),line=await p.locator('#note-last-line').boundingBox();
  assert.ok(line.y>=sr.y-1&&line.y+line.height<=sr.y+sr.height+1,'last note line is cut off at maximum scroll');
  await p.screenshot({path:join(artifacts,'nested-last-note.png')});
  return result;
 }));
 await check('Idle logo is compact and centered in the native left rail',()=>fresh(async p=>{
  await p.locator('#toggle-closed').click();
  await p.mouse.move(1000,5);
  await p.waitForFunction(()=>{const timer=document.querySelector('#zd-floating-sla-timer');return timer.classList.contains('zd-collapsed')&&!timer.classList.contains('zd-countdown-active');});
  await p.waitForTimeout(200);
  const result=await p.evaluate(()=>{
   const timer=document.querySelector('#zd-floating-sla-timer'),logo=document.querySelector('#zd-timer-logo'),button=document.querySelector('#zd-timer-clock-btn'),nav=document.querySelector('nav');
   const r=el=>{const x=el.getBoundingClientRect();return {x:x.x,y:x.y,width:x.width,height:x.height,cx:x.x+x.width/2,cy:x.y+x.height/2};};
   return {timer:r(timer),logo:r(logo),button:r(button),nav:r(nav),saved:JSON.parse(localStorage.getItem('zd_timer_pos')),collapsed:timer.classList.contains('zd-collapsed'),active:timer.classList.contains('zd-countdown-active')};
  });
  assert.equal(result.collapsed,true);assert.equal(result.active,false);
  assert.ok(result.timer.width>=36&&result.timer.width<=44,'idle timer width '+result.timer.width);
  assert.ok(result.timer.height>=36&&result.timer.height<=44,'idle timer height '+result.timer.height);
  assert.ok(result.logo.width<=22&&result.logo.height<=22,'oversized logo '+JSON.stringify(result.logo));
  assert.ok(Math.abs(result.logo.cx-result.button.cx)<1.5&&Math.abs(result.logo.cy-result.button.cy)<1.5,'logo is not centered inside native button');
  assert.ok(Math.abs(result.timer.cx-result.nav.cx)<2,'idle timer is not centered with rail icons');
  assert.equal(result.saved.x,10,'saved drag position changed');assert.equal(result.saved.y,451);
  await p.screenshot({path:join(artifacts,'idle-left-logo.png')});
  return result;
 },{init:()=>localStorage.setItem('zd_timer_pos',JSON.stringify({x:10,y:451}))}));

 await check('Removed ticket-fields overlay cannot return after DOM replacement',()=>fresh(async p=>{
  assert.equal(await p.locator('#zenx-fields-toggle,#zenx-fields-backdrop,#zenx-fields-drawer-label').count(),0);
  await p.evaluate(()=>{const fields=document.querySelector('[data-test-id="component-type-TicketFieldsPane"]');fields.replaceWith(fields.cloneNode(true));});
  await p.waitForTimeout(2500);
  assert.equal(await p.locator('#zenx-fields-toggle,#zenx-fields-backdrop,#zenx-fields-drawer-label').count(),0);
  assert.equal(await p.locator('[data-zenx-fields-drawer],[data-zenx-fields-layout],[data-zenx-fields-slot]').count(),0);
 }));

 await check('Same-origin app switches, reloads and replacements use the selected theme',()=>fresh(async p=>{
  await p.waitForSelector('#mock-tool-frame[data-zenx-frame-managed]');
  const sample=async()=>{
   const iframe=p.locator('#mock-tool-frame'),frame=await iframe.contentFrame();
   await frame.locator('#search').waitFor();
   await p.waitForTimeout(350);
   return frame.locator('body').evaluate(body=>({background:getComputedStyle(body).backgroundColor,color:getComputedStyle(body).color,theme:body.ownerDocument.documentElement.dataset.zenxTheme,managed:body.ownerDocument.documentElement.dataset.zenxAppDocument,accent:getComputedStyle(body.ownerDocument.documentElement).getPropertyValue('--zenx-app-accent').trim(),mode:body.ownerDocument.documentElement.className}));
  };
  await p.evaluate(()=>chrome.storage.local.set({zenx_active_theme:ZenXThemes.presets.find(t=>t.id==='ocean-glass')}));
  await p.waitForTimeout(500);const first=await sample();
  assert.equal(first.managed,'1');assert.ok(first.mode.includes('zskin-dark'));assert.ok(first.accent,'app palette accent missing');
  assert.equal(await p.locator('#mock-tool-frame').evaluate(el=>getComputedStyle(el).filter),'none','accessible app is double-inverted');
  await p.locator('#oracle-tab').click();await p.waitForTimeout(600);const switched=await sample();
  assert.equal(switched.managed,'1');assert.equal(switched.accent,first.accent,'app navigation lost accent');assert.equal(switched.background,first.background,'app navigation lost palette');
  let frame=await p.locator('#mock-tool-frame').contentFrame();await frame.locator('#search').fill('native search');assert.equal(await frame.locator('#search').inputValue(),'native search');
  await p.locator('#mock-tool-frame').evaluate(el=>el.contentWindow.location.reload());await p.waitForTimeout(650);
  assert.equal((await sample()).background,first.background,'app reload lost palette');
  await p.evaluate(()=>{const old=document.querySelector('#mock-tool-frame'),next=old.cloneNode(false);next.src='/tester/tool.html?app=sherpa';old.replaceWith(next);});
  await p.waitForTimeout(700);assert.equal((await sample()).background,first.background,'replacement app frame lost palette');
  await command(p,'SET_THEME',{darkMode:false});await p.waitForTimeout(650);const light=await sample();
  assert.ok(light.mode.includes('zskin-light'),'frame did not follow parent light mode');
  assert.notEqual(light.background,first.background,'light app background stayed dark');
  await command(p,'SET_THEME',{darkMode:true});await p.waitForTimeout(650);assert.equal((await sample()).background,first.background);
  frame=await p.locator('#mock-tool-frame').contentFrame();
  await frame.locator('#search').fill('Keep this native search');
  await command(p,'TOGGLE_ENABLED',{enabled:false});await p.waitForTimeout(400);
  assert.equal(await frame.locator('#search').inputValue(),'Keep this native search');
  assert.ok(!(await p.locator('#mock-tool-frame').evaluate(el=>getComputedStyle(el).filter)).includes('invert('),'legacy inversion restored on disable');
  await command(p,'TOGGLE_ENABLED',{enabled:true});await p.waitForTimeout(650);
  assert.equal((await sample()).background,first.background,'re-enabling lost app palette');
  assert.equal(await frame.locator('#search').inputValue(),'Keep this native search');
  await frame.locator('body').evaluate(body=>{
   window.styleWrites=0;
   window.watchStyles=new MutationObserver(changes=>window.styleWrites+=changes.filter(c=>c.type==='attributes').length);
   window.watchStyles.observe(body.ownerDocument.documentElement,{subtree:true,attributes:true,attributeFilter:['style']});
   const card=document.createElement('div');card.id='late-native-card';card.textContent='Asynchronously loaded card';card.style.backgroundColor='white';body.append(card);
  });
  await p.waitForTimeout(500);
  assert.notEqual(await frame.locator('#late-native-card').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','late app card missed theme');
  const writes=await frame.locator('body').evaluate(()=>window.styleWrites);
  assert.ok(writes<50,'app palette mutation loop: '+writes);
  return {first,switched,light,styleWrites:writes};
 }));
 await check('Cross-origin app switches keep one stable fallback without repeated inversion',()=>fresh(async p=>{
  const cross=base.replace('127.0.0.1','localhost')+'/tester/tool.html?app=sherpa';
  await p.locator('#mock-tool-frame').evaluate((el,url)=>{el.src=url;},cross);await p.waitForTimeout(800);
  const sample=()=>p.locator('#mock-tool-frame').evaluate(el=>({filter:getComputedStyle(el).filter,managed:el.hasAttribute('data-zenx-frame-managed'),readable:!!el.contentDocument}));
  const initial=await sample();assert.equal(initial.managed,true);assert.equal(initial.readable,false,'fixture must be a real different origin');
  for(let i=0;i<3;i++){
   await p.locator('#mock-tool-frame').evaluate((el,url)=>{el.src=url;},cross+'&reload='+i);await p.waitForTimeout(450);
   assert.equal((await sample()).filter,initial.filter,'cross-origin filter changed after navigation');
  }
  await p.waitForTimeout(2700);const final=await sample();assert.equal(final.filter,initial.filter,'legacy rescanner double-inverted the managed app');
  assert.ok((final.filter.match(/invert\(/g)||[]).length<=1,'multiple inversion passes');
  await command(p,'TOGGLE_ENABLED',{enabled:false});await p.waitForTimeout(350);
  assert.ok(!(await sample()).filter.includes('invert('),'cross-origin legacy inversion restored on disable');
  return final;
 }));
}
