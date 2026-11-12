/* Display metadata only: keep native timer handlers and calculations intact. */
(() => {
  const root=document.documentElement;
  let current=null,observer=null,dragOrigin=null,autoDock=false,moving=false;
  const popupStyles=new Map();
  function own(el,name,value){
    let props=popupStyles.get(el);if(!props){props=new Map();popupStyles.set(el,props);}
    if(!props.has(name))props.set(name,{value:el.style.getPropertyValue(name),priority:el.style.getPropertyPriority(name),owned:value});
    props.get(name).owned=value;
    if(el.style.getPropertyValue(name)!==value||el.style.getPropertyPriority(name)!=='important')el.style.setProperty(name,value,'important');
  }
  function restorePopups(){
    for(const [el,props] of popupStyles)for(const [name,p] of props){
      if(el.style.getPropertyValue(name)!==p.owned)continue;
      if(p.value)el.style.setProperty(name,p.value,p.priority);else el.style.removeProperty(name);
    }
    popupStyles.clear();
  }
  function placePopups(active){
    if(!active){restorePopups();return;}
    for(const el of current.querySelectorAll('#zd-timer-macro-popup,#zd-sections-dropdown')){
      if(getComputedStyle(el).display==='none')continue;
      own(el,'max-width','calc(100vw - 28px)');
      own(el,'max-height','calc(100dvh - 28px)');
      const host=el.offsetParent||current,anchor=host.getBoundingClientRect();
      const widget=current.getBoundingClientRect(),width=el.getBoundingClientRect().width,height=el.getBoundingClientRect().height;
      const left=Math.max(14,Math.min(widget.right-width,innerWidth-width-14));
      const below=widget.bottom+10;
      const top=below+height<=innerHeight-14?below:Math.max(14,widget.top-height-10);
      own(el,'left',Math.round(left-anchor.left)+'px');own(el,'right','auto');
      own(el,'top',Math.round(top-anchor.top)+'px');own(el,'bottom','auto');
    }
  }
  function alignIdleLogo(active){
    const collapsed=current.classList.contains('zd-collapsed');
    if(!active||!collapsed||current.classList.contains('zd-countdown-active')||autoDock||moving){
      current.removeAttribute('data-zenx-timer-in-rail');return;
    }
    const rect=current.getBoundingClientRect();
    const rail=[...document.querySelectorAll('[data-zenx-surface="nav"],[data-test-id="support_nav"],[data-garden-id="navigation.nav"]')].find(el=>{
      const r=el.getBoundingClientRect();
      return r.width>20&&r.width<110&&r.height>100&&rect.left<r.right&&rect.right>r.left&&rect.top<r.bottom&&rect.bottom>r.top;
    });
    if(!rail){current.removeAttribute('data-zenx-timer-in-rail');return;}
    const r=rail.getBoundingClientRect();
    const left=Math.round(r.left+(r.width-38)/2)+'px';
    if(current.style.getPropertyValue('--zenx-timer-rail-left')!==left)current.style.setProperty('--zenx-timer-rail-left',left);
    if(current.dataset.zenxTimerInRail!=='1')current.dataset.zenxTimerInRail='1';
  }
  function update(){
    if(!current)return;
    const display=current.querySelector('#zd-timer-collapsed-display');
    const label=current.querySelector('#zd-timer-badge')?.textContent||'';
    if(display&&display.dataset.zenxLabel!==label)display.dataset.zenxLabel=label;
    const active=root.classList.contains('zskin-active')&&root.classList.contains('zenx-premium');
    if(active&&autoDock)current.setAttribute('data-zenx-timer-docked','1');
    else current.removeAttribute('data-zenx-timer-docked');
    const above=current.getBoundingClientRect().top>innerHeight/2;
    if(current.dataset.zenxPopupAbove!==String(above?1:0))current.dataset.zenxPopupAbove=String(above?1:0);
    alignIdleLogo(active);
    placePopups(active);
  }
  function attach(){
    const timer=document.getElementById('zd-floating-sla-timer');
    if(timer===current){update();return;}
    observer?.disconnect();restorePopups();current=timer;
    if(!timer)return;
    let saved=false;
    try{const p=JSON.parse(localStorage.getItem('zd_timer_pos')||sessionStorage.getItem('zd_timer_pos')||'null');saved=!!p&&Number.isFinite(p.x??p.left)&&Number.isFinite(p.y??p.top);}catch(_){}
    autoDock=!saved;
    observer=new MutationObserver(update);
    observer.observe(timer,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
    update();
  }
  // The original widget still owns dragging. Release docking on the first real
  // drag so its existing coordinates and saved position continue to work.
  document.addEventListener('mousedown',e=>{
    if(e.button!==0||!current?.contains(e.target))return;
    if(!e.target.closest('#zd-timer-drag-handle,#zd-timer-info'))return;
    dragOrigin={x:e.clientX,y:e.clientY};
  },true);
  window.addEventListener('mousemove',e=>{
    if(!dragOrigin||!current||Math.hypot(e.clientX-dragOrigin.x,e.clientY-dragOrigin.y)<=4)return;
    autoDock=false;moving=true;current.removeAttribute('data-zenx-timer-docked');current.removeAttribute('data-zenx-timer-in-rail');dragOrigin=null;update();
  });
  window.addEventListener('mouseup',()=>{dragOrigin=null;moving=false;update();});
  const roots=new MutationObserver(attach);roots.observe(root,{attributes:true,attributeFilter:['class']});
  const interval=setInterval(attach,1200);
  window.addEventListener('resize',update);
  window.addEventListener('pagehide',()=>{observer?.disconnect();roots.disconnect();clearInterval(interval);},{once:true});
  attach();
})();
