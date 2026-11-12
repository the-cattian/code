/* ZenX 8.4 app-frame presentation. No app data, inputs or handlers are replaced.
   Accessible frames get the selected palette. Other origins keep their own
   luminance and receive only a mild tint, never a second dark-mode inversion. */
(() => {
  'use strict';
  if (globalThis.__zenxAppFramesLoaded) return;
  globalThis.__zenxAppFramesLoaded = true;
  const APP_SHELL = '[data-zenx-surface="apps"],[data-test-id="component-type-AppsPane"],[data-test-id="ticket-apps-pane"],#apps_sidebar,[data-test-id="apps-pane"],[data-test-id="customer-context"],[data-test-id="context-panel"]';
  const SKIP = 'script,style,link,meta,title,svg,svg *,img,picture,video,audio,canvas,iframe,object,embed,option';
  const MESSAGE = 'zenx-app-palette-v84';
  const activeRoot = document.documentElement;
  const managed = new Map();
  const normalization=new Map(),scratch=document.createElement('span').style;
  let queued = false, stopped = false;
  const equal = (style, name, value) => style.getPropertyValue(name) === value && style.getPropertyPriority(name) === 'important';
  function write(record, el, name, value) {
    const key=name+'\0'+value;
    if(normalization.has(key))value=normalization.get(key);
    else{scratch.setProperty(name,value,'important');value=scratch.getPropertyValue(name);scratch.removeProperty(name);normalization.set(key,value);}
    let props = record.styles.get(el);
    if (!props) { props = new Map(); record.styles.set(el, props); }
    let property = props.get(name);
    if (!property) {
      property = {original: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name), applied: value};
      props.set(name, property);
    } else if (el.style.getPropertyValue(name) !== property.applied) {
      // Preserve a newer native app update when the theme is later disabled.
      property.original = el.style.getPropertyValue(name);
      property.priority = el.style.getPropertyPriority(name);
    }
    property.applied = value;
    if (!equal(el.style, name, value)) el.style.setProperty(name, value, 'important');
  }
  function restore(record) {
    record.observer?.disconnect();record.observer=null;
    if(record.timer!==null)clearTimeout(record.timer);
    record.timer=null;record.queued=false;record.palette=null;
    if(record.classes)for(const [name,p] of record.classes)if(record.doc.documentElement.classList.contains(name)===p.applied)record.doc.documentElement.classList.toggle(name,p.original);
    record.classes=null;
    for (const [el, props] of record.styles) for (const [name, property] of props) {
      if (el.style.getPropertyValue(name) !== property.applied) continue;
      if (property.original) el.style.setProperty(name, property.original, property.priority);
      else el.style.removeProperty(name);
    }
    for (const el of record.marked) el.removeAttribute('data-zenx-app-surface');
    if (record.doc?.documentElement?.getAttribute('data-zenx-app-document') === '1') record.doc.documentElement.removeAttribute('data-zenx-app-document');
    record.styles.clear(); record.marked.clear();
  }
  function recordFor(doc,ownsClasses=false) { return {doc, ownsClasses, classes:null, styles:new Map(), marked:new Set(), observer:null, timer:null, queued:false, palette:null}; }
  function hue(hex) {
    const m = String(hex).match(/^#([\da-f]{6})$/i);
    if (!m) return 38;
    const [r,g,b] = [0,2,4].map(i => parseInt(m[1].slice(i,i+2),16)/255);
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    if (!delta) return 38;
    let h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
    return (h*60+360)%360;
  }
  function palette() {
    const s=getComputedStyle(activeRoot), light=activeRoot.classList.contains('zskin-light');
    const value=(name,fallback) => s.getPropertyValue(name).trim() || fallback;
    return {
      enabled:activeRoot.classList.contains('zskin-active') && activeRoot.classList.contains('zenx-premium'),
      light, accent:value('--zx-accent',value('--zenx-theme-accent','#ffb549')),
      ink:value('--zx-ink',light?'#283341':'#f7f3ed'),
      muted:value('--zx-muted',light?'#596779':'#bdb5ad'),
      panel:value('--zx-panel',light?'rgba(255,255,255,.74)':'rgba(23,23,25,.68)'),
      control:value('--zx-control',light?'rgba(255,255,255,.80)':'rgba(22,22,24,.68)'),
      border:value('--zx-border',light?'rgba(70,70,80,.24)':'rgba(255,255,255,.20)')
    };
  }
  function hasPaint(background) {
    if(!background||background==='transparent')return false;
    const alpha=background.match(/^rgba\([^)]*,\s*([\d.]+)\)$/);
    return !alpha || Number(alpha[1])>0;
  }
  function ownStyleMutation(record, element) {
    const props=record.styles.get(element);
    return props && [...props].every(([name, property]) => element.style.getPropertyValue(name) === property.applied);
  }
  function themeDocument(record, p) {
    const doc=record.doc, root=doc?.documentElement, view=doc?.defaultView;
    if (!root || !doc.body || !view || view.closed) return;
    // An iframe can navigate before a queued mutation callback runs. Its old
    // document may still have nodes while its Window has already gone away.
    try { if(view.document!==doc)return; } catch(_) { return; }
    record.palette=p;
    if (!p.enabled) { restore(record); return; }
    root.setAttribute('data-zenx-app-document','1');
    for(const [name,next] of [['zskin-dark',!p.light],['zskin-light',p.light]]){
      if(record.ownsClasses){
        if(!record.classes)record.classes=new Map();
        if(!record.classes.has(name))record.classes.set(name,{original:root.classList.contains(name),applied:next});
        else record.classes.get(name).applied=next;
      }
      if(root.classList.contains(name)!==next)root.classList.toggle(name,next);
    }
    for (const [key,value] of Object.entries({accent:p.accent,ink:p.ink,muted:p.muted,panel:p.panel,control:p.control,border:p.border})) write(record,root,'--zenx-app-'+key,value);
    const candidates=[root,doc.body,...doc.body.querySelectorAll('*')];
    for (const el of candidates.slice(0,6000)) {
      if (el.matches(SKIP) || el.closest('svg,canvas,[data-test-id="omni-log-item-message"],article')) continue;
      let cs;try { cs=view.getComputedStyle(el); } catch(_) { continue; }
      if (cs.display==='none' || cs.visibility==='hidden') continue;
      const semantic=el.closest('[role="status"],[role="alert"],[data-status],.status,.badge,.success,.error,.warning,.danger,.positive,.negative');
      const control=el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,select,button,[role="button"],[role="combobox"],[role="textbox"],[contenteditable="true"]');
      if(semantic)continue;
      const old=record.marked.has(el);
      const painted=hasPaint(cs.backgroundColor);
      if (el===root || el===doc.body || painted || control || old) {
        const role=el===root?'root':el===doc.body?'body':control?'control':'surface';
        if (el.getAttribute('data-zenx-app-surface')!==role) el.setAttribute('data-zenx-app-surface',role);
        record.marked.add(el);
        write(record,el,'background-color',role==='root'?'transparent':control?'var(--zenx-app-control)':'var(--zenx-app-panel)');
        if (cs.borderTopStyle!=='none' || cs.borderBottomStyle!=='none' || control) write(record,el,'border-color','var(--zenx-app-border)');
        if(/(?:linear|radial|conic)-gradient\(/.test(cs.backgroundImage)&&!cs.backgroundImage.includes('url('))write(record,el,'background-image','none');
      }
      if (!semantic && (control || el.children.length===0 || el===doc.body || el.matches('label,h1,h2,h3,h4,h5,h6,legend,summary,header,nav,main,section,article'))) {
        // Native status indicators retain their own semantic colors.
        const color=el.closest('a[href]')?'var(--zenx-app-accent)':'var(--zenx-app-ink)';
        write(record,el,'color',color);
        if (control) write(record,el,'-webkit-text-fill-color',color);
      }
    }
    for (const [el] of record.styles) if (!el.isConnected) { record.styles.delete(el); record.marked.delete(el); }
    if (!record.observer) {
      record.observer=new MutationObserver(changes=>{
        if (record.queued || stopped) return;
        const nativeChange=changes.some(change=>change.type==='childList' ? [...change.addedNodes].some(n=>n.nodeType===1) : change.attributeName==='class' || !ownStyleMutation(record,change.target));
        if (!nativeChange) return;
        record.queued=true;
        record.timer=setTimeout(()=>{record.timer=null;record.queued=false;if(record.palette?.enabled)themeDocument(record,record.palette);},80);
      });
      record.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
    }
  }
  function appFrame(frame) {
    if (frame.closest(APP_SHELL)) return true;
    const r=frame.getBoundingClientRect();
    return r.width>160 && r.height>180 && r.left>innerWidth*.5 && !!frame.closest('aside,[role="complementary"],[data-test-id*="app"],[data-test-id*="sidebar"]');
  }
  function restoreFrame(frame, rec) {
    frame.removeAttribute('data-zenx-frame-managed');
    frame.removeAttribute('data-zenx-frame-mode');
    if (rec.document) restore(rec.document);
    restore(rec);
  }
  function syncFrame(frame, rec, p) {
    if (!p.enabled) { restoreFrame(frame,rec); try { frame.contentWindow?.postMessage({type:MESSAGE,palette:p},'*'); } catch(_) {} return; }
    frame.setAttribute('data-zenx-frame-managed','1');
    write(rec,frame,'background-color',p.panel);
    let doc=null;
    try { doc=frame.contentDocument; if(!doc?.documentElement) doc=null; } catch(_) {}
    if (doc) {
      if(rec.document?.doc!==doc) {if(rec.document)restore(rec.document);rec.document=recordFor(doc);}
      write(rec,frame,'filter','none');
      frame.setAttribute('data-zenx-frame-mode','palette');
      themeDocument(rec.document,p);
    } else {
      if(rec.document){restore(rec.document);rec.document=null;}
      // Cross-origin documents cannot be inspected. Never invert blindly:
      // dark-native apps such as Oracle would otherwise become washed-out.
      const tint=p.light?'none':`brightness(.96) saturate(.94) sepia(.08) hue-rotate(${Math.round(hue(p.accent)-38)}deg)`;
      write(rec,frame,'filter',rec.remote?'none':tint);
      frame.setAttribute('data-zenx-frame-mode',rec.remote?'palette':'tint');
    }
    try { frame.contentWindow?.postMessage({type:MESSAGE,palette:p},'*'); } catch(_) {}
  }
  function scan() {
    queued=false;if(stopped)return;
    const p=palette(), frames=[...document.querySelectorAll('iframe')].filter(appFrame);
    for (const [frame,rec] of managed) if(!frame.isConnected || !frames.includes(frame)) {restoreFrame(frame,rec);frame.removeEventListener('load',rec.load);managed.delete(frame);}
    for (const frame of frames) {
      let rec=managed.get(frame);
      if(!rec){
        rec=recordFor(null);rec.remote=false;rec.document=null;
        if(frame.hasAttribute('data-zs-panel-dark')&&/invert\(/.test(frame.style.getPropertyValue('filter'))){
          // The old darkener wrote this inversion without preserving an
          // original. It must not return when ZenX is disabled or on reload.
          const props=new Map();
          for(const name of ['filter','background-color'])props.set(name,{original:'',priority:'',applied:frame.style.getPropertyValue(name)});
          rec.styles.set(frame,props);frame.removeAttribute('data-zs-panel-dark');
        }
        rec.load=()=>{rec.remote=false;schedule();};managed.set(frame,rec);frame.addEventListener('load',rec.load);
      }
      syncFrame(frame,rec,p);
    }
  }
  function schedule() {if(queued||stopped)return;queued=true;setTimeout(scan,50);}
  function trustedParent(event) {
    if(event.source!==parent)return false;
    try {const host=new URL(event.origin).hostname;return host==='zendesk.com'||host.endsWith('.zendesk.com');}catch(_){return false;}
  }
  if(window!==top) {
    // Optional same-permission child entry: only a parent-confirmed app frame
    // is themed. This never loads the timer/SLA content script in a child.
    const child=recordFor(document,true);
    window.addEventListener('message',event=>{
      if(event.data?.type!==MESSAGE || !trustedParent(event))return;
      const p=event.data.palette;
      if(!p || typeof p.enabled!=='boolean' || typeof p.light!=='boolean')return;
      themeDocument(child,p);
      try{parent.postMessage({type:MESSAGE+'-ready'},event.origin);}catch(_){}
    });
    try{parent.postMessage({type:MESSAGE+'-ready'},'*');}catch(_){}
    window.addEventListener('pagehide',()=>{stopped=true;restore(child);},{once:true});
    return;
  }
  window.addEventListener('message',event=>{
    if(event.data?.type!==MESSAGE+'-ready')return;
    for(const [frame,rec] of managed) {
      if(event.source!==frame.contentWindow)continue;
      let host='';try{host=new URL(event.origin).hostname;}catch(_){}
      if((host==='zendesk.com'||host.endsWith('.zendesk.com'))&&!rec.remote){rec.remote=true;schedule();}
      break;
    }
  });
  const observer=new MutationObserver(changes=>{
    if(changes.some(c=>c.type==='childList' ? [...c.addedNodes,...c.removedNodes].some(n=>n.nodeType===1) : c.target===activeRoot || (c.target.tagName==='IFRAME'&&['src','srcdoc'].includes(c.attributeName))))schedule();
  });
  observer.observe(activeRoot,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','src','srcdoc']});
  const interval=setInterval(schedule,1800);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pagehide',()=>{stopped=true;observer.disconnect();clearInterval(interval);for(const [frame,rec] of managed){restoreFrame(frame,rec);frame.removeEventListener('load',rec.load);}managed.clear();},{once:true});
  schedule();
})();
