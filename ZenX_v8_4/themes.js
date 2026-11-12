/* Visual-theme metadata. SLA rules and countdowns remain in the supplied bookmarklet engine. */
(() => {
  const presets = [
    { id:'amber-cat-reference',name:'Amber Cat · Reference',mode:'dark',agent:'#744817',customer:'#644015',va:'#3a2c3f',accent:'#ffbd4b',wallpaper:'wallpapers/amber-cat-reference.png',motion:false,dim:42,bubbleRadius:20,uiScale:105,pillShape:'pill',popupRadius:18,cursor:'arrow',effect:'embers',sound:'bell' },
    { id:'warm-noir',name:'Warm Noir · Signature',mode:'dark',agent:'#744017',customer:'#38231c',va:'#382231',accent:'#ffb549',wallpaper:'wallpapers/warm-noir.jpg',motion:true,dim:63,bubbleRadius:17,uiScale:105,pillShape:'pill',popupRadius:16,cursor:'arrow',effect:'embers',sound:'bell' },
    { id:'ocean-glass',name:'Ocean Glass · Moonlit',mode:'dark',agent:'#006b60',customer:'#112b35',va:'#16263f',accent:'#56ead2',wallpaper:'wallpapers/moonlit-ronin.jpg',motion:true,dim:75,bubbleRadius:16,uiScale:105,pillShape:'pill',popupRadius:16,cursor:'arrow',effect:'orbits',sound:'wave' },
    { id:'mountain-sunrise',name:'Mountain Sunrise · Light',mode:'light',agent:'#f9bd57',customer:'#fff6ea',va:'#f9eefa',accent:'#c8872d',wallpaper:'wallpapers/peach-sunrise.jpg',motion:true,dim:23,bubbleRadius:20,uiScale:105,pillShape:'soft',popupRadius:20,cursor:'arrow',effect:'sparkles',sound:'sunrise' },
    { id:'split-focus-pro',name:'Split Focus · Executive',mode:'dark',agent:'#005d52',customer:'#142c33',va:'#222441',accent:'#53e6ba',wallpaper:'wallpapers/gojo-infinite-void.jpg',motion:false,dim:76,bubbleRadius:11,uiScale:100,pillShape:'soft',popupRadius:12,cursor:'arrow',effect:'ripple',sound:'neon' },
    { id:'neo-cyber',name:'Neo Cyber · Sakura',mode:'dark',agent:'#065f6b',customer:'#251d45',va:'#332044',accent:'#e976ff',wallpaper:'wallpapers/cyberpunk-neon.jpg',motion:true,dim:73,bubbleRadius:17,uiScale:105,pillShape:'soft',popupRadius:18,cursor:'arrow',effect:'petals',sound:'cosmic' },
    { id:'cat-photo',name:'Cat at Dusk · Photo Style',mode:'dark',agent:'#6c3d49',customer:'#312631',va:'#3b263b',accent:'#fa88b8',wallpaper:'wallpapers/real-tabby-cat.jpg',motion:false,dim:78,bubbleRadius:19,uiScale:105,pillShape:'pill',popupRadius:18,cursor:'arrow',effect:'paw-stars',sound:'purr' },
    { id:'onepiece-strawhat',name:'One Piece · Straw Hat Dawn',mode:'dark',agent:'#754015',customer:'#25201b',va:'#292436',accent:'#f2b544',wallpaper:'wallpapers/luffy-gear5.jpg',motion:true,dim:84,bubbleRadius:18,uiScale:100,pillShape:'pill',popupRadius:16,cursor:'arrow',effect:'sunbursts',sound:'bounce' },
    { id:'onepiece-kingofhell',name:'One Piece · King of Hell',mode:'dark',agent:'#13543a',customer:'#101d19',va:'#1c2828',accent:'#42d68b',wallpaper:'wallpapers/zoro-emerald.jpg',motion:true,dim:86,bubbleRadius:14,uiScale:100,pillShape:'soft',popupRadius:14,cursor:'arrow',effect:'slashes',sound:'bamboo' },
    { id:'onepiece-ronin',name:'One Piece · Moonlit Swordsman',mode:'dark',agent:'#225d49',customer:'#121d22',va:'#172b36',accent:'#82d9b1',wallpaper:'wallpapers/moonlit-ronin.jpg',motion:true,dim:86,bubbleRadius:16,uiScale:100,pillShape:'soft',popupRadius:16,cursor:'arrow',effect:'embers',sound:'wind' },
    { id:'classic', name:'Classic · Bookmarklet', mode:'dark', agent:'#008069',customer:'#1e293b',va:'#202b49',accent:'#38bdf8',wallpaper:'',motion:false,dim:88,bubbleRadius:12,uiScale:100,pillShape:'pill',popupRadius:12,cursor:'arrow',effect:'ripple',sound:'original' },
    { id:'zoro-emerald',name:'Zoro · Emerald Spirit',mode:'dark',agent:'#065f46',customer:'#0a1f16',va:'#182e27',accent:'#10b981',wallpaper:'wallpapers/zoro-emerald.jpg',motion:true,dim:85,bubbleRadius:16,uiScale:105,pillShape:'soft',popupRadius:16,cursor:'arrow',effect:'slashes',sound:'bamboo' },
    { id:'luffy-gear5',name:'Luffy · Gear 5',mode:'dark',agent:'#78350f',customer:'#1a1207',va:'#262032',accent:'#f59e0b',wallpaper:'wallpapers/luffy-gear5.jpg',motion:true,dim:90,bubbleRadius:18,uiScale:105,pillShape:'pill',popupRadius:16,cursor:'arrow',effect:'sunbursts',sound:'bounce' },
    { id:'gojo-infinite-void',name:'Gojo · Infinite Void',mode:'dark',agent:'#6d28d9',customer:'#0f1126',va:'#1e2144',accent:'#38bdf8',wallpaper:'wallpapers/gojo-infinite-void.jpg',motion:true,dim:80,bubbleRadius:16,uiScale:105,pillShape:'soft',popupRadius:18,cursor:'arrow',effect:'orbits',sound:'cosmic' },
    { id:'cyberpunk',name:'Cyberpunk · Neon Night',mode:'dark',agent:'#155e75',customer:'#1f0d24',va:'#1b233e',accent:'#06b6d4',wallpaper:'wallpapers/cyberpunk-neon.jpg',motion:true,dim:85,bubbleRadius:8,uiScale:100,pillShape:'square',popupRadius:8,cursor:'arrow',effect:'digital',sound:'neon' },
    { id:'sakura-drift',name:'Sakura Drift',mode:'dark',agent:'#be185d',customer:'#1c1924',va:'#35233f',accent:'#f472b6',wallpaper:'wallpapers/sakura-drift.jpg',motion:true,dim:85,bubbleRadius:20,uiScale:100,pillShape:'pill',popupRadius:20,cursor:'arrow',effect:'petals',sound:'bell' },
    { id:'moonlit-ronin',name:'Zoro · Moonlit Ronin',mode:'dark',agent:'#047857',customer:'#062319',va:'#172a38',accent:'#10b981',wallpaper:'wallpapers/moonlit-ronin.jpg',motion:true,dim:85,bubbleRadius:16,uiScale:105,pillShape:'soft',popupRadius:16,cursor:'arrow',effect:'embers',sound:'wind' },
    { id:'morning-mist',name:'Morning Mist · Light',mode:'light',agent:'#3b82f6',customer:'#dcebf9',va:'#e2eafb',accent:'#2563eb',wallpaper:'wallpapers/morning-mist.jpg',motion:true,dim:26,bubbleRadius:16,uiScale:100,pillShape:'soft',popupRadius:16,cursor:'arrow',effect:'bubbles',sound:'glass' },
    { id:'peach-sunrise',name:'Peach Sunrise · Light',mode:'light',agent:'#f59e0b',customer:'#fce4e7',va:'#f2dff3',accent:'#e87942',wallpaper:'wallpapers/peach-sunrise.jpg',motion:true,dim:24,bubbleRadius:22,uiScale:105,pillShape:'pill',popupRadius:20,cursor:'arrow',effect:'sparkles',sound:'sunrise' },
    { id:'tea-garden',name:'Tea Garden · Light',mode:'light',agent:'#4ca98b',customer:'#e1f2e8',va:'#e3f2ea',accent:'#087f5b',wallpaper:'wallpapers/tea-garden.jpg',motion:true,dim:29,bubbleRadius:18,uiScale:100,pillShape:'soft',popupRadius:18,cursor:'arrow',effect:'leaves',sound:'tea' },
    { id:'coastal-daylight',name:'Coastal Daylight · Light',mode:'light',agent:'#3badd1',customer:'#e7f7ff',va:'#e5effb',accent:'#0284c7',wallpaper:'wallpapers/coastal-daylight.jpg',motion:true,dim:25,bubbleRadius:14,uiScale:100,pillShape:'pill',popupRadius:14,cursor:'arrow',effect:'droplets',sound:'wave' },
    { id:'latte-window',name:'Latte Window · Light',mode:'light',agent:'#b87540',customer:'#f6ede1',va:'#f2e8db',accent:'#99572f',wallpaper:'wallpapers/latte-window.jpg',motion:false,dim:20,bubbleRadius:17,uiScale:100,pillShape:'soft',popupRadius:14,cursor:'arrow',effect:'hearts',sound:'latte' },
    { id:'cat-cafe',name:'Cat Café · Light',mode:'light',agent:'#df9657',customer:'#fff1dc',va:'#fae8e9',accent:'#bd713a',wallpaper:'wallpapers/cat-nap.jpg',motion:false,dim:20,bubbleRadius:22,uiScale:105,pillShape:'pill',popupRadius:22,cursor:'arrow',effect:'paws',sound:'purr' },
    { id:'midnight-cat',name:'Midnight Cat · Dark',mode:'dark',agent:'#8b7fba',customer:'#222d4b',va:'#2d2e54',accent:'#9db7f5',wallpaper:'wallpapers/midnight-cat.jpg',motion:true,dim:83,bubbleRadius:22,uiScale:100,pillShape:'pill',popupRadius:20,cursor:'arrow',effect:'paw-stars',sound:'meow' }
  ];
  const color = (v,f) => /^#[\da-fA-F]{6}$/.test(v||'') ? v : f;
  const allowed = (v,list,fallback) => list.includes(v) ? v : fallback;
  function normalize(input) {
    const p = input && typeof input === 'object' ? input : {};
    const base = presets.find(t=>t.id===p.id) || presets[0];
    const clamp=(n,lo,hi,f)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):f;
    const wallpaper=p.wallpaper===''?'':typeof p.wallpaper==='string' && (
      /^wallpapers\/[\w.-]+\.jpg$/.test(p.wallpaper) ||
      /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(p.wallpaper)
    )?p.wallpaper:base.wallpaper;
    return {
      id:String(p.id||base.id).slice(0,70),name:String(p.name||base.name).slice(0,45),
      mode:allowed(p.mode,['dark','light'],base.mode||'dark'),
      agent:color(p.agent,base.agent),customer:color(p.customer,base.customer),va:color(p.va,base.va||'#202b49'),accent:color(p.accent,base.accent),cursorColor:color(p.cursorColor, color(p.accent,base.accent)),wallpaper,
      motion:typeof p.motion==='boolean'?p.motion:base.motion,
      dim:clamp(p.dim,20,100,base.dim),bubbleRadius:clamp(p.bubbleRadius,4,28,base.bubbleRadius),uiScale:clamp(p.uiScale,85,115,base.uiScale),
      pillShape:allowed(p.pillShape,['pill','soft','square'],base.pillShape),popupRadius:clamp(p.popupRadius,4,24,base.popupRadius),
      cursor:'arrow',
      effect:allowed(p.effect,['ripple','slashes','sunbursts','orbits','digital','petals','embers','bubbles','leaves','hearts','paws','sparkles','droplets','paw-stars'],base.effect||'ripple'),
      sound:allowed(p.sound,['original','bamboo','bounce','cosmic','neon','bell','wind','glass','sunrise','wave','latte','purr','meow','tea'],base.sound||'original')
    };
  }
  globalThis.ZenXThemes=Object.freeze({presets,normalize});
})();
