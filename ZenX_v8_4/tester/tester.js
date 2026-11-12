(() => {
  const $=id=>document.getElementById(id);
  const {presets,normalize}=globalThis.ZenXThemes;
  const iframe=$('stage');let ready=false,current=presets[0],focus=false,dark=true,lastStatus=null;
  const post=(type,payload={})=>{if(ready&&iframe.contentWindow)iframe.contentWindow.postMessage({zenxTest:true,type,...payload},'*');};
  const wallUrl=v=>{if(!v)return '';if(v.startsWith('data:image/'))return v;try{return new URL('../'+v,location.href).href;}catch{return '';}};
  for(const theme of presets){const opt=document.createElement('option');opt.value=theme.id;opt.textContent=theme.name;$('theme').appendChild(opt);}
  function renderTheme(theme){
    current=normalize(theme);$('theme').value=theme.id;
    $('thumb-name').textContent=theme.name;
    $('thumbnail').style.backgroundImage=theme.wallpaper?`linear-gradient(0deg,#0a102099,transparent),url("${wallUrl(theme.wallpaper)}")`:'linear-gradient(130deg,'+theme.agent+','+theme.customer+')';
    $('sound-label').textContent=theme.sound;$('cursor-label').textContent='Standard arrow · '+theme.accent;$('effect-label').textContent=theme.effect;
    dark=theme.mode!=='light';$('toggle-mode').textContent=dark?'Switch to light':'Switch to dark';
  }
  function updateStatus(data){
    lastStatus=data;focus=!!data.focusMode;dark=!!data.darkMode;
    $('toggle-focus').textContent='Focus: '+(focus?'On':'Off');
    $('toggle-mode').textContent=dark?'Switch to light':'Switch to dark';
    const state=data.slaState;
    $('rule').textContent=(state&&state.label)||'Idle';
    $('countdown').textContent=state&&state.isOpen?Math.floor(state.remainingSec/60)+':'+String(state.remainingSec%60).padStart(2,'0'):'--:--';
    $('status').textContent=data.enabled?'Connected':'Disabled';
  }
  window.addEventListener('message',ev=>{
    if(ev.source!==iframe.contentWindow||!ev.data||!ev.data.zenxTest)return;
    if(ev.data.type==='ready'){ready=true;renderTheme(current);post('theme',{theme:current});post('status');}
    if(ev.data.type==='status')updateStatus(ev.data.data);
  });
  iframe.addEventListener('load',()=>{ready=true;post('theme',{theme:current});post('status');});
  $('theme').addEventListener('change',ev=>{const theme=presets.find(t=>t.id===ev.target.value);if(theme){renderTheme(theme);post('theme',{theme});}});
  $('toggle-mode').addEventListener('click',()=>{dark=!dark;post('mode',{dark});$('toggle-mode').textContent=dark?'Switch to light':'Switch to dark';});
  $('toggle-focus').addEventListener('click',()=>post('focus',{enabled:!focus}));
  $('scenario').addEventListener('change',ev=>post('scenario',{scenario:ev.target.value}));
  $('add-agent').addEventListener('click',()=>post('add',{role:'agent'}));
  $('add-customer').addEventListener('click',()=>post('add',{role:'customer'}));
  $('add-va').addEventListener('click',()=>post('add',{role:'bot'}));
  $('switch-tool').addEventListener('click',()=>post('tool'));
  $('sound').addEventListener('click',()=>post('sound'));
  document.querySelectorAll('[data-duration]').forEach(btn=>btn.addEventListener('click',()=>post('duration',{value:Number(btn.dataset.duration)})));
  $('reset').addEventListener('click',()=>{renderTheme(presets[0]);$('scenario').value='first';post('reset');});
  renderTheme(current);
})();
