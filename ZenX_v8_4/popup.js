/* ZenX popup: a control surface for the original bookmarklet engine, not a timer. */
(() => {
  const $ = id => document.getElementById(id);
  const { presets, normalize } = globalThis.ZenXThemes;
  const model = { tabId: null, state: null, themes: [], selected: null, active: presets[0], statusBusy: false };
  const fields = {
    name: $('custom-name'), agent: $('agent-color'), customer: $('customer-color'), va:$('va-color'), accent: $('accent-color'),
    mode:$('theme-preferred-mode'), sound:$('theme-sound'), cursorColor:$('cursor-color'), effect:$('theme-effect'),
    radius: $('bubble-radius'), scale: $('ui-scale'), dim: $('wallpaper-dim'), popup: $('popup-radius'),
    shape: $('pill-shape'), motion: $('wallpaper-motion'), wallpaper: $('wallpaper-file')
  };
  let editorWallpaper = '';
  const tell = (message) => { $('message').textContent = message; };
  const isZendesk = url => /^https:\/\/[^/]+\.zendesk\.com\//i.test(url || '');
  const send = message => new Promise(resolve => {
    if (model.tabId === null) return resolve({ success:false, error:'Open a Zendesk tab.' });
    chrome.tabs.sendMessage(model.tabId, message, response => {
      const error = chrome.runtime.lastError;
      resolve(error ? { success:false, error:error.message } : (response || { success:false }));
    });
  });
  const save = obj => new Promise(resolve => chrome.storage.local.set(obj, () => {
    const err = chrome.runtime.lastError;
    resolve(err ? { success:false, error:err.message } : { success:true });
  }));
  const byId = id => presets.concat(model.themes).find(t => t.id === id);
  const wallpaperUrl = value => !value ? '' : value.startsWith('data:image/') ? value : chrome.runtime.getURL(value);

  function showPage(page) {
    const themes = page === 'themes';
    $('dashboard').classList.toggle('hidden', themes);
    $('themes').classList.toggle('hidden', !themes);
    $('nav-dashboard').classList.toggle('selected', !themes);
    $('nav-themes').classList.toggle('selected', themes);
  }
  $('nav-dashboard').addEventListener('click', () => showPage('dashboard'));
  $('nav-themes').addEventListener('click', () => showPage('themes'));

  function renderStatus() {
    const r = model.state;
    const ok = !!r && r.connected;
    $('connection').textContent = !model.tabId ? 'No Zendesk tab' : (ok ? (r.enabled ? 'Connected' : 'Disabled') : 'Not responding');
    $('connection').className = 'connection ' + (ok && r.enabled ? 'online' : 'offline');
    if (!ok) {
      $('countdown').textContent = '--:--';
      $('countdown').className = 'countdown';
      $('sla-rule').textContent = 'Idle';
      $('ticket-number').textContent = '—';
      $('sla-native').textContent = 'Zendesk SLA: —';
      return;
    }
    $('enabled').checked = !!r.enabled;
    $('theme-mode').textContent = r.darkMode ? 'Dark mode' : 'Light mode';
    $('mute-mode').textContent = r.isMuted ? 'Sound muted' : 'Sound on';
    $('macro-mode').textContent = r.isMacrosEnabled ? 'Macros on' : 'Macros off';
    $('focus-mode').textContent = r.focusMode ? 'Focus on' : 'Focus off';
    $('toggle-mute').classList.toggle('is-off', r.isMuted);
    $('toggle-macros').classList.toggle('is-off', !r.isMacrosEnabled);
    $('toggle-focus').classList.toggle('is-off', !r.focusMode);
    const sla = r.slaState;
    $('ticket-number').textContent = r.activeTicket || '—';
    $('sla-native').textContent = 'Zendesk SLA: ' + (r.nativeSla || 'Not shown');
    if (!r.enabled || !sla || !sla.isOpen) {
      $('countdown').textContent = '--:--';
      $('countdown').className = 'countdown';
      $('sla-rule').textContent = r.enabled ? 'Idle' : 'Disabled';
      $('sla-rule').className = 'rule';
    } else {
      // Display ONLY the seconds returned by the bookmarklet engine.
      const remaining = Math.max(0, Math.floor(sla.remainingSec));
      $('countdown').textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
      const cls = remaining <= 0 ? 'overdue' : remaining <= 10 ? 'critical' : remaining <= 60 ? 'warning' : '';
      $('countdown').className = 'countdown ' + cls;
      $('sla-rule').textContent = sla.label || 'Response';
      $('sla-rule').className = 'rule ' + (sla.rule || '');
    }
    const manual = sla && sla.label && sla.label.includes('Manual') ? sla.durationSec : null;
    document.querySelectorAll('[data-duration]').forEach(b => {
      b.classList.toggle('active', manual === Number(b.dataset.duration));
    });
    renderSections(r.sections || [], r.hiddenSections || []);
  }

  function renderSections(sections, hidden) {
    const list = $('section-list');
    const names = Array.from(new Set(['Tags', 'Also here', ...sections, ...hidden]));
    const selected = new Set(hidden.map(x => x.toLowerCase()));
    const existing = Array.from(list.querySelectorAll('input[data-section]'));
    const signature = names.join('|');
    if (list.dataset.signature === signature && existing.length === names.length) {
      existing.forEach(input => { input.checked = selected.has(input.dataset.section.toLowerCase()); });
      return;
    }
    list.dataset.signature = signature;
    list.replaceChildren();
    for (const name of names) {
      const label = document.createElement('label');
      label.className = 'section-option';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.section = name;
      cb.checked = selected.has(name.toLowerCase());
      cb.addEventListener('change', async () => {
        const result = await send({type:'SET_SECTION_VISIBILITY', name, hidden:cb.checked});
        if (!result.success) tell(result.error || 'Could not update section');
        await refresh();
      });
      const text = document.createElement('span'); text.textContent = name; text.title = name;
      label.append(cb,text); list.append(label);
    }
  }

  async function refresh() {
    if (model.statusBusy || model.tabId === null) return;
    model.statusBusy = true;
    const result = await send({ type:'GET_STATUS' });
    model.statusBusy = false;
    if (result.connected) model.state = result;
    else model.state = null;
    renderStatus();
  }
  async function command(type, payload = {}) {
    const result = await send({ type, ...payload });
    if (result.success === false) tell(result.error || 'Command failed');
    else tell('Applied');
    await refresh();
    return result;
  }
  $('enabled').addEventListener('change', e => command('TOGGLE_ENABLED', {enabled:e.target.checked}));
  $('toggle-theme').addEventListener('click', () => command('SET_THEME', {darkMode:!(model.state && model.state.darkMode)}));
  $('toggle-mute').addEventListener('click', () => command('SET_MUTE', {isMuted:!(model.state && model.state.isMuted)}));
  $('toggle-macros').addEventListener('click', () => command('SET_MACROS', {isMacrosEnabled:!(model.state && model.state.isMacrosEnabled)}));
  $('toggle-focus').addEventListener('click', () => command('SET_FOCUS_MODE', {enabled:!(model.state && model.state.focusMode)}));
  $('sections-default').addEventListener('click', () => command('SET_DEFAULT_SECTIONS'));
  $('sections-all').addEventListener('click', () => command('SHOW_ALL_SECTIONS'));
  $('rescan').addEventListener('click', () => command('REFRESH'));
  $('reload').addEventListener('click', () => { if (model.tabId !== null) chrome.tabs.reload(model.tabId, () => window.close()); });
  document.querySelectorAll('[data-duration]').forEach(b => b.addEventListener('click', () => command('SET_MANUAL_DURATION', {durationSec:Number(b.dataset.duration)})));

  function getEditor() {
    return normalize({
      id:model.selected || 'custom-preview', name:fields.name.value.trim() || 'My theme',
      agent:fields.agent.value,customer:fields.customer.value,va:fields.va.value,accent:fields.accent.value,
      mode:fields.mode.value,sound:fields.sound.value,cursorColor:fields.cursorColor.value,cursor:'arrow',effect:fields.effect.value,
      bubbleRadius:Number(fields.radius.value),uiScale:Number(fields.scale.value),
      dim:Number(fields.dim.value),popupRadius:Number(fields.popup.value),
      pillShape:fields.shape.value,motion:fields.motion.checked,wallpaper:editorWallpaper
    });
  }
  function updatePreview() {
    const t = getEditor(), p = $('theme-preview');
    const background = wallpaperUrl(t.wallpaper);
    p.style.backgroundImage = background ? (t.mode==='light'?`linear-gradient(#ffffff30,#ffffff30),url("${background}")`:`linear-gradient(#07121d70,#07121d70),url("${background}")`) : 'none';
    p.classList.toggle('light',t.mode==='light');
    p.querySelector('.agent').style.backgroundColor = t.agent;
    p.querySelector('.customer').style.backgroundColor = t.customer;
    p.querySelector('.va').style.backgroundColor = t.va;
    p.querySelectorAll('.preview-bubble').forEach(el => { el.style.borderRadius = t.bubbleRadius + 'px'; });
    for (const [name, el, unit] of [['radius',fields.radius,'px'],['scale',fields.scale,'%'],['dim',fields.dim,'%'],['popup',fields.popup,'px']]) {
      $(el.id+'-value').textContent = el.value+unit;
    }
  }
  function selectTheme(theme) {
    const t = normalize(theme);
    model.selected = t.id;
    fields.name.value = t.name;
    fields.agent.value = t.agent; fields.customer.value = t.customer; fields.va.value=t.va; fields.accent.value = t.accent;
    fields.mode.value=t.mode; fields.sound.value=t.sound;fields.cursorColor.value=t.cursorColor || t.accent;fields.effect.value=t.effect;
    fields.radius.value = t.bubbleRadius; fields.scale.value = t.uiScale;
    fields.dim.value = t.dim; fields.popup.value = t.popupRadius;
    fields.shape.value = t.pillShape; fields.motion.checked = t.motion;
    editorWallpaper = t.wallpaper;
    fields.wallpaper.value = '';
    $('delete-theme').disabled = !model.themes.some(x => x.id === t.id);
    renderThemeLibrary(); updatePreview();
  }
  function renderThemeLibrary() {
    $('theme-count').textContent = presets.length + model.themes.length + ' themes';
    const holder = $('theme-library'); holder.replaceChildren();
    for (const theme of presets.concat(model.themes)) {
      const el = document.createElement('button'); el.className = 'theme-card';
      if (theme.id === model.selected) el.classList.add('selected');
      el.type = 'button';
      const thumb = document.createElement('span'); thumb.className = 'thumb';
      const url = wallpaperUrl(theme.wallpaper);
      if (url) thumb.style.backgroundImage = `linear-gradient(0deg,#0002,#0001),url("${url}")`;
      else thumb.style.background = `linear-gradient(115deg, ${theme.agent}, ${theme.customer})`;
      const label = document.createElement('span'); label.className = 'theme-name'; label.textContent = theme.name + (theme.mode==='light'?' ☀':' ☾');
      el.append(thumb,label); el.addEventListener('click', () => selectTheme(theme)); holder.append(el);
    }
  }
  for (const field of [...Object.values(fields)]) {
    if (field === fields.wallpaper) continue;
    field.addEventListener('input', updatePreview);
    field.addEventListener('change', updatePreview);
  }
  function readWallpaper(file) {
    return new Promise((resolve,reject) => {
      if (!file || !['image/png','image/jpeg','image/webp'].includes(file.type)) return reject(new Error('Choose a JPG, PNG or WebP image.'));
      if (file.size > 12*1024*1024) return reject(new Error('Maximum source image size: 12 MB.'));
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1,1400 / Math.max(img.width,img.height));
          canvas.width=Math.max(1,Math.round(img.width*scale));
          canvas.height=Math.max(1,Math.round(img.height*scale));
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          const data=canvas.toDataURL('image/jpeg',.77);
          URL.revokeObjectURL(blobUrl);
          if(data.length>5*1024*1024) return reject(new Error('Wallpaper is too large to save.'));
          resolve(data);
        } catch(e) { URL.revokeObjectURL(blobUrl); reject(e); }
      };
      img.onerror=() => { URL.revokeObjectURL(blobUrl);reject(new Error('Could not decode image.')); };
      img.src=blobUrl;
    });
  }
  fields.wallpaper.addEventListener('change', async () => {
    const file=fields.wallpaper.files && fields.wallpaper.files[0]; if(!file) return;
    try { editorWallpaper=await readWallpaper(file);updatePreview();tell('Wallpaper loaded into editor'); }
    catch(e){tell(e.message);}
  });
  $('remove-wallpaper').addEventListener('click', () => { editorWallpaper='';fields.wallpaper.value='';updatePreview();tell('Wallpaper removed from preview'); });
  $('apply-theme').addEventListener('click', async () => {
    const theme=getEditor();
    const result=await save({zenx_active_theme:theme});
    if (result.success) { model.active=theme; tell('Theme applied across your Zendesk tabs'); }
    else tell(result.error);
  });
  $('save-theme').addEventListener('click', async () => {
    const theme=getEditor();
    const same=model.themes.find(t=>t.id===model.selected);
    theme.id=same?same.id:'custom-'+Date.now().toString(36);
    const index=model.themes.findIndex(t=>t.id===theme.id);
    if(index<0)model.themes.push(theme); else model.themes[index]=theme;
    const result=await save({zenx_custom_themes:model.themes});
    if(!result.success){tell(result.error);return;}
    selectTheme(theme);tell('Custom theme saved');
  });
  $('delete-theme').addEventListener('click', async () => {
    if(!model.themes.some(t=>t.id===model.selected))return;
    model.themes=model.themes.filter(t=>t.id!==model.selected);
    const isActive=model.active.id===model.selected;
    const changes={zenx_custom_themes:model.themes};
    if(isActive)changes.zenx_active_theme=presets[0];
    const result=await save(changes);
    if(!result.success){tell(result.error);return;}
    if(isActive)model.active=presets[0];selectTheme(presets[0]);tell('Custom theme deleted');
  });
  $('export-theme').addEventListener('click', async () => {
    const value=JSON.stringify(getEditor(),null,2);
    try { await navigator.clipboard.writeText(value);tell('Theme JSON copied to clipboard'); }
    catch(e){ window.prompt('Copy this theme JSON:',value);tell('Theme JSON ready to copy'); }
  });
  $('import-theme').addEventListener('click', async () => {
    const input=window.prompt('Paste ZenX theme JSON:');
    if(!input)return;
    try {
      const theme=normalize(JSON.parse(input));
      theme.id='custom-'+Date.now().toString(36);
      model.themes.push(theme);
      const res=await save({zenx_custom_themes:model.themes});
      if(!res.success){tell(res.error);return;}
      selectTheme(theme);tell('Theme imported');
    } catch(e){tell('Invalid theme JSON');}
  });

  $('open-tester').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('tester/index.html')}));
  $('preview-sound').addEventListener('click',async()=>{
    // Set sound only when applying theme. Preview here plays a local synthesis without saving settings.
    try {const A=window.AudioContext||window.webkitAudioContext;if(!A)throw new Error('Audio unsupported');const context=new A();await context.resume();const t=getEditor();const osc=context.createOscillator(),gain=context.createGain();
    const ratios={original:1,bamboo:.81,bounce:1.28,cosmic:.62,neon:1.20,bell:1.52,wind:.58,tea:.94,glass:1.38,sunrise:1.12,wave:.91,latte:.77,purr:.68,meow:.84};
    osc.type=({neon:'square',bounce:'triangle',wind:'triangle',wave:'triangle',meow:'sawtooth'}[t.sound]||'sine');osc.frequency.setValueAtTime(880*(ratios[t.sound]||1),context.currentTime);
    if(t.sound==='meow'||t.sound==='purr')osc.frequency.exponentialRampToValueAtTime(500,context.currentTime+.26);
    gain.gain.setValueAtTime(.06,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.26);osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+.27);setTimeout(()=>context.close().catch(()=>{}),600);tell('Theme sound preview');}
    catch(e){tell('Sound preview unavailable: '+e.message);}
  });
  chrome.storage.local.get({zenx_active_theme:presets[0],zenx_custom_themes:[]}, values => {
    model.active=normalize(values.zenx_active_theme);
    model.themes=(Array.isArray(values.zenx_custom_themes)?values.zenx_custom_themes:[]).slice(0,60).map(normalize);
    selectTheme(byId(model.active.id)||model.active);
  });
  chrome.tabs.query({active:true,currentWindow:true}, tabs => {
    const tab=tabs && tabs[0];
    if (!tab || !isZendesk(tab.url)) {
      tell('Open a Zendesk ticket in this browser window.');renderStatus();return;
    }
    model.tabId=tab.id;
    refresh();
    setInterval(refresh,1000);
  });
})();
