/* ZenX visual skin. No ticket or SLA calculations take place here. */
(() => {
  const {presets, normalize} = globalThis.ZenXThemes;
  let active = normalize(presets[0]);
  let enabled = true;
  const styledDocuments = new Set();

  function documents() {
    const results=[], seen=new Set();
    function descend(doc) {
      if(!doc || seen.has(doc) || !doc.documentElement) return;
      seen.add(doc); results.push(doc);
      try { doc.querySelectorAll('iframe').forEach(f=>{try {if(f.contentDocument) descend(f.contentDocument);}catch(_) {}}); } catch(_) {}
    }
    descend(document);return results;
  }
  function asWallpaper(value) { return !value?'':value.startsWith('data:image/')?value:chrome.runtime.getURL(value); }
  function hexToRgb(hex) {const m=String(hex||'').match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:0,g:0,b:0};}
  function rgbToHex(r,g,b) {return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
  function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0,l=(max+min)/2;if(max!==min){const d=max-min;s=l>.5?d/(2-max-min):d/(max+min);if(max===r)h=(g-b)/d+(g<b?6:0);else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;}return {h,s,l};}
  function hslToRgb(h,s,l){let r,g,b;if(s===0)r=g=b=l;else{const hue=(p,q,t)=>{if(t<0)t++;if(t>1)t--;if(t<1/6)return p+(q-p)*6*t;if(t<.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;r=hue(p,q,h+1/3);g=hue(p,q,h);b=hue(p,q,h-1/3);}return {r:r*255,g:g*255,b:b*255};}
  function tone(hex, kind, light) {
    const {r,g,b}=hexToRgb(hex);const hsl=rgbToHsl(r,g,b);
    let s=Math.max(hsl.s,kind==='accent'?.50:.35),l;
    if(light) l=kind==='customer'?.93:kind==='va'?.89:kind==='accent'?.55:.75;
    else l=kind==='customer'?.14:kind==='va'?.19:kind==='accent'?.55:.30;
    // Only brighten/darken; preserve the original hue and editable color.
    l=light?Math.max(hsl.l,l):Math.min(hsl.l,l);
    const o=hslToRgb(hsl.h,Math.min(1,s),l);return rgbToHex(o.r,o.g,o.b);
  }
  function setPalette(root,a) {
    const role=(key)=> {
      const input=a[key];
      root.style.setProperty('--zenx-'+key+'-dark',a.mode==='dark'?input:tone(input,key,false));
      root.style.setProperty('--zenx-'+key+'-light',a.mode==='light'?input:tone(input,key,true));
    };
    ['agent','customer','va','accent'].forEach(role);
    const luminance=hex=>{const {r,g,b}=hexToRgb(hex);const linear=c=>{c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);};return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);};
    for(const key of ['agent','customer','va']){
      for(const mode of ['light','dark']){
        const background=mode===a.mode?a[key]:tone(a[key],key,mode==='light');
        const lum=luminance(background);
        const contrastWhite=1.05/(lum+.05),contrastDark=(lum+.05)/.055;
        root.style.setProperty('--zenx-'+key+'-text-'+mode,contrastWhite>contrastDark?'#ffffff':'#111827');
      }
    }
  }
  function tagVirtualAssistant(doc) {
    try {
      doc.querySelectorAll('article[data-test-id="omni-log-comment-item"]').forEach(article=>{
        const sender=article.querySelector('[data-test-id="omni-log-item-sender"]');
        const msg=article.querySelector('[data-test-id="omni-log-item-message"]');
        const name=(sender?.textContent||'').trim();
        const isVA=/\b(?:virtual assistant|support bot|chatbot|ai assistant)\b/i.test(name) || msg?.getAttribute('type')==='bot';
        if(isVA)article.setAttribute('data-zenx-va','1');
        else article.removeAttribute('data-zenx-va');
      });
    } catch(_) {}
  }
  function apply(doc){
    if(doc!==document && !doc.getElementById('zenx-visual-frame-css')){
      const link=doc.createElement('link');link.id='zenx-visual-frame-css';link.rel='stylesheet';link.href=chrome.runtime.getURL('styles.css');(doc.head||doc.documentElement).appendChild(link);
    }
    const root=doc.documentElement,a=active;
    root.dataset.zenxTheme=a.id;
    setPalette(root,a);
    root.style.setProperty('--zenx-bubble-radius',a.bubbleRadius+'px');
    root.style.setProperty('--zenx-scale',String(a.uiScale/100));
    root.style.setProperty('--zenx-pill-radius',a.pillShape==='square'?'6px':a.pillShape==='soft'?'14px':'999px');
    root.style.setProperty('--zenx-popup-radius',a.popupRadius+'px');
    root.style.setProperty('--zenx-wallpaper-dim',String(Math.max(0,Math.min(1,a.dim/100))));
    // Light wallpaper has a translucent white veil rather than the dark black veil.
    root.style.setProperty('--zenx-light-veil',String(Math.min(.30,Math.max(.05,a.dim/100*.20))));
    const wallpaper=asWallpaper(a.wallpaper),clean=wallpaper?wallpaper.replace(/["\\\n\r]/g,''):'';
    root.style.setProperty('--zenx-wallpaper',clean?`url("${clean}")`:'none');
    root.style.setProperty('--zenx-theme-accent',a.accent);
    // Native cursor plus animated effects; input fields retain their text caret.
    const cursorSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="32" viewBox="0 0 28 32"><path d="M3 2 V27 L9.5 20 L14.5 30 L19 27.8 L13.9 18 H23 Z" fill="${a.cursorColor || a.accent}" stroke="#111318" stroke-width="2" stroke-linejoin="round"/><path d="M5.2 5.2 V21 L9.4 16.8 L18.1 16.4 Z" fill="#fff" opacity=".62"/></svg>`;
    const cursorURL = 'data:image/svg+xml,' + encodeURIComponent(cursorSVG);
    root.style.setProperty('--zenx-cursor', `url("${cursorURL}") 3 2, auto`);
    // Same hand-pointer geometry on every theme; only the fill color changes.
    const pointerSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="0 0 32 36"><path d="M12 2 C9 2 9 5 9 8 V19 L5 15 C2 13 0 17 3 21 L11 33 H26 C29 27 30 23 29 18 C28 15 25 15 23 16 C22 13 19 12 17 14 V8 C17 4 15 2 12 2 Z" fill="${a.cursorColor || a.accent}" stroke="#101217" stroke-width="2" stroke-linejoin="round"/><path d="M12 8V23M17 15V23M22 18V23" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="1.2"/></svg>`;
    root.style.setProperty('--zenx-cursor-pointer', `url("${'data:image/svg+xml,'+encodeURIComponent(pointerSVG)}") 11 4, pointer`);
    root.dataset.zenxEffect=a.effect;
    root.classList.toggle('zenx-wallpaper-on',enabled&&!!wallpaper);
    root.classList.toggle('zenx-wallpaper-motion',enabled&&!!wallpaper&&a.motion);
    root.classList.toggle('zenx-custom-skin',enabled&&a.id!=='classic');
    root.classList.toggle('zenx-premium',enabled&&a.id!=='classic');
    root.classList.toggle('zenx-cursor-enabled',enabled);
    tagVirtualAssistant(doc);
    styledDocuments.add(doc);
    if(doc===document){
      globalThis.__zenxSoundProfile={type:a.sound,mutedByTheme:false};
    }
  }
  function applyAll(){documents().forEach(apply);}
  function clearAll(){for(const doc of styledDocuments){try{doc.documentElement.classList.remove('zenx-wallpaper-on','zenx-wallpaper-motion','zenx-custom-skin','zenx-premium','zenx-cursor-enabled');}catch(_){}}}
  function use(a){active=normalize(a);applyAll();}
  // Select the requested Warm Noir design on first v7 startup; preserve the old theme.
  chrome.storage.local.get({zenx_active_theme:presets[0],zenx_enabled:true,zenx_v7_selected:false},values=>{
    enabled=values.zenx_enabled!==false;
    if(!values.zenx_v7_selected){
      active=normalize(presets[0]);
      chrome.storage.local.set({zenx_v7_selected:true,zenx_v6_previous_theme:values.zenx_active_theme,zenx_active_theme:presets[0]},applyAll);
    }else { active=normalize(values.zenx_active_theme);applyAll(); }
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.zenx_enabled)enabled=changes.zenx_enabled.newValue!==false;
    if(changes.zenx_active_theme)active=normalize(changes.zenx_active_theme.newValue);
    if(changes.zenx_enabled||changes.zenx_active_theme){if(!enabled)clearAll();applyAll();}
  });
  chrome.runtime.onMessage.addListener((request,_sender,sendResponse)=>{
    if(!request||request.type!=='SET_DESIGN_THEME')return false;
    active=normalize(request.theme);
    chrome.storage.local.set({zenx_active_theme:active},()=>{
      if(chrome.runtime.lastError){sendResponse({success:false,error:chrome.runtime.lastError.message});return;}
      applyAll();sendResponse({success:true,theme:active});
    });return true;
  });
  // Zendesk replaces panels when switching tabs/apps; reapply to the new DOM.
  let applying=false;
  function schedule(){if(applying)return;applying=true;setTimeout(()=>{applying=false;applyAll();},180);}
  const observer=new MutationObserver(muts=>{if(muts.some(m=>m.type==='childList'&&m.addedNodes.length))schedule();});
  if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
  const scan=setInterval(applyAll,1800);
  window.addEventListener('pagehide',()=>{clearInterval(scan);observer.disconnect();},{once:true});
})();
