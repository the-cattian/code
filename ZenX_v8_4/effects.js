/* Safe, local visual effects. This script does not read ticket content or send data. */
(() => {
  if (window.top !== window && !window.ZenXTestMode) return; // one renderer on live pages; test lab is a deliberate iframe
  const root=document.documentElement;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let aura=null,x=-200,y=-200,scheduled=false;
  const shapes={
    ripple:'◆',slashes:'╱',sunbursts:'✦',orbits:'◌',digital:'▪',petals:'❀',embers:'✧',bubbles:'○',leaves:'❧',hearts:'♥',paws:'🐾',sparkles:'✶',droplets:'◕','paw-stars':'✦'
  };
  function auraEnsure() {
    if(aura&&aura.isConnected)return aura;
    aura=document.createElement('div');aura.id='zenx-cursor-aura';aura.setAttribute('aria-hidden','true');(document.body||document.documentElement).appendChild(aura);
    return aura;
  }
  document.addEventListener('pointermove',event=>{
    if(reduced.matches||!root.classList.contains('zskin-active'))return;
    x=event.clientX;y=event.clientY;
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;const el=auraEnsure();el.style.transform=`translate(${x-27}px,${y-27}px)`;});
  },{passive:true});
  document.addEventListener('pointerleave',()=>{if(aura)aura.style.opacity='0';},{passive:true});
  document.addEventListener('pointerenter',()=>{if(aura)aura.style.opacity='';},{passive:true});
  document.addEventListener('click',event=>{
    if(reduced.matches||!root.classList.contains('zskin-active'))return;
    const effect=root.dataset.zenxEffect||'ripple';
    const mark=shapes[effect]||'✦';
    const ring=document.createElement('span');ring.className='zenx-click-ring';ring.setAttribute('aria-hidden','true');ring.style.left=event.clientX+'px';ring.style.top=event.clientY+'px';document.body.appendChild(ring);setTimeout(()=>ring.remove(),720);
    const count=effect==='paws'||effect==='paw-stars'?5:effect==='digital'?10:7;
    for(let i=0;i<count;i++){
      const node=document.createElement('span');node.className='zenx-click-particle';node.setAttribute('aria-hidden','true');node.textContent=mark;
      const angle=(i/count)*Math.PI*2;const radius=effect==='paws'?45:effect==='orbits'?65:48;
      node.style.setProperty('--dx',Math.round(Math.cos(angle)*radius)+'px');
      node.style.setProperty('--dy',Math.round(Math.sin(angle)*radius)+'px');
      node.style.setProperty('--rot',Math.round(angle*180/Math.PI)+'deg');
      node.style.left=event.clientX+'px';node.style.top=event.clientY+'px';
      node.style.color='var(--zenx-accent)';node.style.fontSize=(effect==='paws'?17:effect==='digital'?10:20)+'px';
      document.body.appendChild(node);setTimeout(()=>node.remove(),880);
    }
  },{capture:true,passive:true});
})();
