/* Native workspace presentation markers. No ticket state, messages or controls are moved. */
(() => {
  'use strict';
  const root = document.documentElement;
  const owned = new Map();
  let enabled = true;
  let queued = false;
  let stopped = false;
  const selector = values => values.join(',');
  const SELECTORS = {
    conversation: selector([
      '[data-test-id="component-type-MainConversationPane"]',
      '[data-test-id="ticket-main-conversation"]',
      '[data-test-id="ticket-conversation"]',
      '[data-test-id="conversation-pane"]', '.grid-ticket-conversation'
    ]),
    fields: selector([
      '[data-test-id="component-type-TicketFieldsPane"]',
      '[data-test-id="ticket-fields-pane"]', '[data-test-id="ticket-sidebar"]',
      '[data-test-id="ticket-fields"]', '#ticket_sidebar', '.grid-ticket-fields-panel'
    ]),
    apps: selector([
      '[data-test-id="component-type-AppsPane"]', '[data-test-id="ticket-apps-pane"]',
      '[data-test-id="apps-pane"]', '#apps_sidebar', '[data-test-id="customer-context"]',
      '[data-test-id="context-panel"]', '[data-test-id="customer-details-pane"]'
    ]),
    views: selector([
      '[data-test-id="views-pane"]', '[data-test-id="views-sidebar"]',
      '[data-test-id="component-type-ViewsPane"]', '[data-test-id="views-panel"]'
    ]),
    rail: selector([
      '[data-test-id="apps-tray"]', '[data-test-id="component-type-AppsSidebar"]',
      '[data-test-id="ticket-apps-dock"]', '[data-test-id="apps-sidebar"]'
    ]),
    nav: selector([
      '[data-test-id="support_nav"]', '[data-test-id="global-navigation"]',
      '[data-test-id="global-nav"]', '[data-garden-id="navigation.nav"]',
      '[aria-label="Main navigation"]', '[aria-label="Global navigation"]'
    ]),
    header: selector([
      '[data-test-id="header-toolbar"]', '[data-test-id="global-header"]',
      '[data-test-id="top-bar"]', '[data-garden-id="navigation.header"]',
      '[data-test-id="tabs-section"]'
    ]),
    subheader: selector([
      '[data-test-id="ticket-header"]', '[data-test-id="ticket-top-bar"]',
      '[data-test-id="ticket-sub-nav"]', '[data-test-id="ticket-subheader"]'
    ]),
    footer: selector([
      '[data-test-id="ticket-footer"]', '[data-test-id="ticket-submit-container"]',
      '[data-test-id="ticket-submit-bar"]', '[data-test-id="ticket-footer-container"]'
    ]),
    log: '[data-test-id="omni-log-container"]',
    composer: selector([
      '[data-test-id="omni-composer"]', '[data-test-id="omni-composer-container"]',
      '[data-test-id="omni-composer-wrapper"]', '[data-test-id="ticket-composer"]',
      '[data-test-id="omni-log-composer-container"]',
      '[data-test-id="omni-composer-footer"]', '[data-test-id="omni-composer-placeholder"]',
      '[data-test-id="conversation-composer"]'
    ])
  };
  const EXCLUDED = 'article,[data-test-id="omni-log-item-message"],#zd-floating-sla-timer,#zenx-fields-drawer-label';
  const FORM = 'input,textarea,select,[contenteditable="true"],[role="textbox"]';
  const MARKERS = ['data-zenx-workspace', 'data-zenx-columns', 'data-zenx-column',
    'data-zenx-native-tracks', 'data-zenx-surface', 'data-zenx-clear-surface',
    'data-zenx-chat-path', 'data-zenx-scroll-log', 'data-zenx-composer',
    'data-zenx-empty-composer'];
  const all = (scope, query) => [...scope.querySelectorAll(query)];
  let hiddenCache = new WeakMap();
  function nativeHidden(el) {
    if (!el || el === root) return false;
    if (hiddenCache.has(el)) return hiddenCache.get(el);
    const explicit = el.hasAttribute('hidden') || el.hasAttribute('inert') ||
      el.getAttribute('aria-hidden') === 'true' || el.style.display === 'none' ||
      el.style.visibility === 'hidden' || el.style.visibility === 'collapse';
    // Focus uses extension-owned CSS rather than native hidden state. Keep its
    // pane markers so removing focus can restore the original columns.
    const focusHidden = root.classList.contains('zskin-focus-mode') && el.closest('[data-zenx-focus-hidden="1"]');
    const nativeCssHidden = !focusHidden && !owned.has(el) && getComputedStyle(el).display === 'none';
    const result = explicit || nativeCssHidden || nativeHidden(el.parentElement);
    hiddenCache.set(el, result);
    return result;
  }
  const safe = el => el && !el.closest(EXCLUDED) && !nativeHidden(el);
  const topmost = list => list.filter(el => !list.some(other => other !== el && other.contains(el)));
  // Find the existing scroll viewport rather than giving a second scrollbar
  // to its outer omni-log shell. Never inspect or size individual message bodies.
  function nativeScrollport(log) {
    const articles = all(log, 'article[data-test-id="omni-log-comment-item"]');
    if (!articles.length) return log;
    const first = articles[0], last = articles[articles.length - 1];
    let common = first.parentElement;
    while (common && common !== log && !common.contains(last)) common = common.parentElement;
    for (let node = common, depth = 0; node && log.contains(node) && depth < 20; node = node.parentElement, depth++) {
      if (!node.closest('article,[data-test-id="omni-log-item-message"]') && safe(node)) {
        const overflow = getComputedStyle(node).overflowY;
        if (/^(auto|scroll|overlay)$/.test(overflow)) return node;
      }
      if (node === log) break;
    }
    return log;
  }
  function visibleContent(el, boundary) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (!rect.width || !rect.height || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    for (let node = el; node; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (node.hidden || css.display === 'none' || css.contentVisibility === 'hidden' || Number(css.opacity) === 0) return false;
      if (node === boundary) break;
    }
    return true;
  }
  function composerHasContent(shell) {
    const controls = '[contenteditable]:not([contenteditable="false"]),[role="textbox"],textarea,input:not([type="hidden"]),select,button,[role="button"],a[href],iframe,[role="status"],[role="progressbar"]';
    if (all(shell, controls).some(el => visibleContent(el, shell))) return true;
    // Keep explanatory text and native closed-ticket actions when they are
    // actually visible; only an empty/invisible composer reservation is removed.
    const walker = document.createTreeWalker(shell, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent.trim() || text.parentElement.closest('script,style,template')) continue;
      if (visibleContent(text.parentElement, shell)) return true;
    }
    return false;
  }
  function active() {
    return enabled && root.classList.contains('zskin-active') && root.classList.contains('zenx-premium');
  }
  function record(el) {
    let entry = owned.get(el);
    if (!entry) { entry = {attrs: new Map(), styles: new Map()}; owned.set(el, entry); }
    return entry;
  }
  function attribute(el, name, value) {
    const entry = record(el);
    if (!entry.attrs.has(name)) entry.attrs.set(name, {original: el.getAttribute(name), applied: value});
    else entry.attrs.get(name).applied = value;
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function property(el, name, value) {
    const entry = record(el);
    if (!entry.styles.has(name)) entry.styles.set(name, {
      original: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name), applied: value
    });
    else entry.styles.get(name).applied = value;
    if (el.style.getPropertyValue(name) !== value || el.style.getPropertyPriority(name) !== 'important') {
      el.style.setProperty(name, value, 'important');
    }
  }
  function restore(el, entry) {
    for (const [name, value] of entry.attrs) {
      if (el.getAttribute(name) !== value.applied) continue;
      if (value.original === null) el.removeAttribute(name);
      else el.setAttribute(name, value.original);
    }
    for (const [name, value] of entry.styles) {
      // A native update or the base extension's teardown owns any changed value.
      if (el.style.getPropertyValue(name) !== value.applied) continue;
      if (value.original) el.style.setProperty(name, value.original, value.priority);
      else el.style.removeProperty(name);
    }
  }
  function cleanup() {
    for (const [el, entry] of owned) restore(el, entry);
    owned.clear();
  }
  function scan() {
    if (stopped) return;
    if (!active()) { cleanup(); return; }
    // Measure a previously empty shell in its native state. The marker is
    // reapplied below only if it is still empty, so revealing the same editor
    // restores its layout without replacing the editor or losing draft text.
    for (const [el, entry] of owned) {
      if (entry.attrs.has('data-zenx-empty-composer') && el.getAttribute('data-zenx-empty-composer') === '1') el.removeAttribute('data-zenx-empty-composer');
    }
    hiddenCache = new WeakMap();
    const plan = new Map();
    const desire = (el, name, value = '1', allowHidden = false) => {
      if (!el || el.closest(EXCLUDED) || (!allowHidden && !safe(el))) return;
      let values = plan.get(el);
      if (!values) { values = {}; plan.set(el, values); }
      values[name] = value;
    };
    const surface = (el, role) => desire(el, 'data-zenx-surface', role);
    const clear = el => desire(el, 'data-zenx-clear-surface');
    const panes = {};
    for (const role of ['conversation', 'fields', 'apps', 'views', 'rail']) {
      const list = all(document, SELECTORS[role]).filter(safe);
      panes[role] = topmost(list).slice(0, 12);
      for (const el of panes[role]) surface(el, role);
      // Some Zendesk releases nest their named pane inside a named shell.
      for (const el of list) if (!panes[role].includes(el)) clear(el);
    }
    // Stable log attributes also support releases with an unnamed conversation shell.
    const logs = all(document, SELECTORS.log).filter(safe).slice(0, 12);
    const scrollports = new Map(logs.map(log => [log, nativeScrollport(log)]));
    for (const [log, viewport] of scrollports) {
      desire(viewport, 'data-zenx-scroll-log'); clear(viewport);
      if (viewport !== log) { desire(log, 'data-zenx-chat-path'); clear(log); }
    }
    if (!panes.conversation.length) {
      for (const log of logs) {
        let ancestor = log.parentElement;
        let found = null;
        for (let depth = 0; ancestor && depth < 6 && ancestor !== document.body; depth++, ancestor = ancestor.parentElement) {
          if (ancestor.querySelector(SELECTORS.fields + ',' + SELECTORS.apps)) break;
          const parent = ancestor.parentElement;
          const parentStyle = parent && getComputedStyle(parent);
          const horizontal = parentStyle && (parentStyle.display.includes('grid') || (parentStyle.display.includes('flex') && !parentStyle.flexDirection.startsWith('column')));
          if (horizontal && [...parent.children].some(peer => peer !== ancestor && (peer.matches(SELECTORS.fields + ',' + SELECTORS.apps) || peer.querySelector(SELECTORS.fields + ',' + SELECTORS.apps)))) { found = ancestor; break; }
          if (ancestor.querySelector(SELECTORS.composer)) { found = ancestor; break; }
          if (ancestor.matches('main,[role="main"],section')) found = ancestor;
        }
        if (found && !panes.conversation.includes(found)) {
          panes.conversation.push(found); surface(found, 'conversation');
        }
      }
    }
    const containsPane = (branch, role) => panes[role].some(el => branch === el || branch.contains(el));
    for (const main of panes.conversation) {
      let workspace = null;
      let conversationBranch = main;
      // Identify the real horizontal grid/flex parent through native wrappers.
      for (let depth = 0, branch = main; branch?.parentElement && depth < 10; depth++, branch = branch.parentElement) {
        const parent = branch.parentElement;
        if (parent === document.body || parent === root) break;
        const computed = getComputedStyle(parent);
        const mode = computed.display.includes('grid') ? 'grid' : computed.display.includes('flex') ? 'flex' : '';
        if (!mode || (mode === 'flex' && computed.flexDirection.startsWith('column'))) continue;
        const peers = [...parent.children].filter(el => el !== branch && safe(el));
        const recognized = peers.filter(el => ['fields', 'apps', 'views', 'rail'].some(role => containsPane(el, role)));
        // Semantic fallback stays restricted to horizontal native sidebar siblings.
        const semantic = peers.filter(el => el.matches('aside,[role="complementary"]') || /(?:sidebar|side-pane|app-pane|views-pane)/i.test(el.getAttribute('data-test-id') || ''));
        if (!recognized.length && !semantic.length) continue;
        if (['fields', 'apps', 'views'].some(role => containsPane(branch, role))) break;
        workspace = parent; conversationBranch = branch;
        desire(parent, 'data-zenx-workspace', mode);
        const columns = new Map([[branch, 'conversation']]);
        for (const peer of peers) {
          const role = ['fields', 'views', 'apps', 'rail'].find(value => containsPane(peer, value));
          if (role) columns.set(peer, role);
          else if (semantic.includes(peer)) {
            const before = !!(peer.compareDocumentPosition(branch) & Node.DOCUMENT_POSITION_FOLLOWING);
            const fallbackRole = before ? (/view/i.test(peer.getAttribute('data-test-id') || '') ? 'views' : 'fields') : 'apps';
            columns.set(peer, fallbackRole);
            surface(peer, fallbackRole);
          }
        }
        desire(parent, 'data-zenx-columns', String(columns.size));
        {
          const participating = [...parent.children].filter(el => {
            if (el.matches('script,style,template')) return false;
            const style = getComputedStyle(el);
            const hiddenByFocus = root.classList.contains('zskin-focus-mode') && el.matches('[data-zenx-focus-hidden="1"],[data-zenx-column]');
            return (style.display !== 'none' || hiddenByFocus) && style.position !== 'absolute' && style.position !== 'fixed';
          });
          const order = participating.map(el => columns.get(el) || 'native').join(',');
          const standard = /^(?:fields|views),conversation(?:,apps(?:,rail)?)?$/.test(order);
          // Native splitter tracks and other column arrangements keep their
          // native track sizes. CSS may still provide gutters and glass.
          if (participating.length !== columns.size || !standard) desire(parent, 'data-zenx-native-tracks');
        }
        for (const [column, role] of columns) {
          desire(column, 'data-zenx-column', role);
          if (!plan.get(column)?.['data-zenx-surface']) clear(column);
        }
        break;
      }
      // Clear only the wrapper chain, preserving native field/editor backgrounds.
      if (workspace) {
        for (let node = workspace.parentElement, depth = 0; node && node !== root && depth < 12; node = node.parentElement, depth++) clear(node);
        for (let node = main.parentElement; node && node !== workspace; node = node.parentElement) {
          if (node === conversationBranch || conversationBranch.contains(node)) clear(node);
        }
      }
      for (const log of logs.filter(el => main.contains(el))) {
        const viewport = scrollports.get(log) || log;
        desire(viewport, 'data-zenx-scroll-log'); clear(viewport);
        for (let node = viewport.parentElement, depth = 0; node && node !== main && depth < 20; node = node.parentElement, depth++) {
          desire(node, 'data-zenx-chat-path'); clear(node);
        }
      }
      // Some releases call a combined log+composer layout a composer container.
      // That shared parent must remain a log path, never an empty composer.
      const composers = topmost(all(main, SELECTORS.composer).filter(el =>
        !el.closest(EXCLUDED) && !logs.some(log => el.contains(log))
      ));
      for (const input of all(main, '[data-test-id="omni-composer-text-input"],[contenteditable]:not([contenteditable="false"])[role="textbox"]')) {
        if (!input.parentElement || input.parentElement === main || input.closest(SELECTORS.log) || composers.some(shell => shell.contains(input))) continue;
        composers.push(input.parentElement);
      }
      for (const shell of composers) {
        if (composerHasContent(shell)) {
          desire(shell, 'data-zenx-composer');
          continue;
        }
        // A hidden editor can leave a 100px native slot or transparent overlay.
        // Collapse only its dedicated empty branch, stopping before any log,
        // visible toolbar, notice, or other native content.
        for (let node = shell, depth = 0; node && node !== main && depth < 8; node = node.parentElement, depth++) {
          if (logs.some(log => node.contains(log)) || composerHasContent(node)) break;
          desire(node, 'data-zenx-empty-composer', '1', true);
        }
      }
      for (const el of all(main, '[data-test-id="conversation-header"],[data-test-id="omni-log-header"],[data-test-id="conversation-pane-header"]')) surface(el, 'subheader');
    }
    for (const role of ['nav', 'header', 'subheader', 'footer']) {
      for (const el of topmost(all(document, SELECTORS[role]).filter(safe))) {
        surface(el, role);
        // Native chrome wrappers commonly retain an opaque background from the base skin.
        for (const child of el.children) {
          if (child.matches('div,section,nav') && !child.matches('[role="button"]') && !child.querySelector(FORM) && !child.matches(SELECTORS.conversation)) clear(child);
        }
        if (role === 'nav' || role === 'header') {
          for (const button of all(el, 'button,[role="button"],a[data-garden-id="navigation.nav-button"]')) {
            if (safe(button) && !button.querySelector(FORM)) surface(button, 'control');
          }
        }
      }
    }
    for (const el of all(document, '#root,#app,#zendesk_app,[data-test-id="ticket-workspace"],[data-test-id="ticket-interface"],[data-test-id="component-type-TicketEditor"],[data-test-id="component-type-TicketEditorLayout"]')) {
      if (!plan.get(el)?.['data-zenx-surface']) clear(el);
    }
    const ticket = '[data-test-id="ticket-id"],[data-test-id="ticket-number"],[data-test-id="ticket-sub-nav-item"],[data-test-id="ticket-id-badge"]';
    for (const el of all(document, ticket).filter(safe)) surface(el, 'ticket');
    for (const el of all(document, '[data-test-id^="status-badge-"],[data-test-id="ticket-status-badge"],[data-test-id="ticket-status"]').filter(safe)) {
      if (!el.matches(FORM)) surface(el, 'status');
    }
    const avatar = '[data-test-id="user-menu"],[data-test-id="agent-avatar"],[data-test-id="profile-menu"],[data-test-id="header-user-menu"],[data-test-id="user-menu-button"],button[aria-label*="profile" i],button[aria-label*="user menu" i]';
    for (const el of topmost(all(document, avatar).filter(safe))) surface(el, 'avatar');
    for (const header of all(document, SELECTORS.header)) {
      for (const el of topmost(all(header, '[data-test-id="avatar"],[data-garden-id="avatars.avatar"]').filter(safe))) {
        if (!el.closest(avatar)) surface(el, 'avatar');
      }
    }
    // Restyle the original controls, keeping value, focus and events intact.
    for (const pane of [...panes.fields, ...panes.views, ...panes.apps, ...panes.conversation]) {
      for (const el of all(pane, 'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),select,textarea,[contenteditable="true"][role="textbox"]')) {
        if (safe(el)) surface(el, 'input');
      }
    }
    function visualStyles(desired) {
      const role = desired['data-zenx-surface'];
      if (!role) return desired['data-zenx-clear-surface'] ? {'background-color': 'transparent'} : {};
      const background = ['fields', 'apps', 'views'].includes(role) ? 'var(--zx-side-panel,var(--zx-panel))' :
        role === 'conversation' ? 'var(--zx-panel-strong)' :
        role === 'control' ? 'transparent' :
        ['ticket', 'status', 'avatar', 'input'].includes(role) ? 'var(--zx-control)' : 'var(--zx-shell)';
      return {'background-color': background, 'border-color': role === 'status' ? 'var(--zx-accent)' : 'var(--zx-border)', color: 'var(--zx-ink)'};
    }
    // A framework can clone a previously decorated node for an inactive tab.
    // Its copied presentation attributes have no local ownership record.
    for (const el of all(document, MARKERS.map(name => '[' + name + ']').join(','))) {
      if (!owned.has(el) && !plan.has(el)) for (const name of MARKERS) el.removeAttribute(name);
    }
    // Reconcile ownership so tab replacement, reparenting and theme teardown leave no stale markers.
    for (const [el, entry] of owned) {
      if (!el.isConnected || !plan.has(el)) { restore(el, entry); owned.delete(el); }
      else {
        const desired = plan.get(el);
        for (const [name, value] of entry.attrs) if (!(name in desired)) {
          if (el.getAttribute(name) === value.applied) {
            if (value.original === null) el.removeAttribute(name); else el.setAttribute(name, value.original);
          }
          entry.attrs.delete(name);
        }
        const desiredStyles = visualStyles(desired);
        for (const [name, value] of entry.styles) if (!(name in desiredStyles)) {
          if (el.style.getPropertyValue(name) === value.applied) {
            if (value.original) el.style.setProperty(name, value.original, value.priority); else el.style.removeProperty(name);
          }
          entry.styles.delete(name);
        }
      }
    }
    for (const [el, desired] of plan) {
      for (const [name, value] of Object.entries(desired)) attribute(el, name, value);
      for (const [name, value] of Object.entries(visualStyles(desired))) property(el, name, value);
    }
  }

  function schedule() {
    if (queued || stopped) return;
    queued = true;
    setTimeout(() => { queued = false; scan(); }, 120);
  }
  const visibilityProbe = document.createElement('div');
  function visibilityStyle(text) {
    visibilityProbe.style.cssText = text || '';
    return ['display', 'visibility', 'content-visibility', 'opacity'].map(name => visibilityProbe.style.getPropertyValue(name)).join('|');
  }
  const observer = new MutationObserver(mutations => {
    if (mutations.some(change => {
      if (change.type === 'childList') return [...change.addedNodes, ...change.removedNodes].some(node => node.nodeType === 1 && !node.matches?.('#zenx-cursor-aura,.zenx-click-particle,.zenx-click-ring'));
      if (change.target === root && change.attributeName === 'class') return true;
      if (change.target.closest(EXCLUDED)) return false;
      if (change.attributeName === 'style') {
        // Background/color changes belong to this script and the base skin.
        // Only native visibility changes need another structural scan.
        return visibilityStyle(change.oldValue) !== visibilityStyle(change.target.getAttribute('style'));
      }
      return ['hidden', 'aria-hidden', 'inert', 'class', 'contenteditable'].includes(change.attributeName);
    })) schedule();
  });
  observer.observe(root, {subtree: true, childList: true, attributes: true, attributeOldValue: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'inert', 'contenteditable']});
  chrome.storage.local.get({zenx_enabled: true}, values => { enabled = values.zenx_enabled !== false; schedule(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.zenx_enabled) enabled = changes.zenx_enabled.newValue !== false;
    if (changes.zenx_enabled || changes.zenx_active_theme) schedule();
  });
  window.addEventListener('resize', schedule, {passive: true});
  const interval = setInterval(schedule, 2200);
  window.addEventListener('pagehide', () => {
    stopped = true; clearInterval(interval); observer.disconnect(); cleanup();
  }, {once: true});
  schedule();
})();
