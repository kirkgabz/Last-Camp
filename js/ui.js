/* Last Camp — DOM interface: HUD, toolbar, panels, inspector, modals, menu */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, B = LC.Bld, A = LC.Audio;
  const UI = (LC.UI = {});
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;

  const ICON = {
    wood: '<svg viewBox="0 0 24 24"><rect x="2" y="8.5" width="17" height="7.5" rx="3.7" fill="#7d5230"/><path d="M5 10.5h9M6 13.5h8" stroke="#5a3a20" stroke-width="1"/><ellipse cx="19" cy="12.25" rx="3" ry="3.75" fill="#d9a066"/><ellipse cx="19" cy="12.25" rx="1.6" ry="2" fill="none" stroke="#a8743f" stroke-width="0.9"/></svg>',
    stone: '<svg viewBox="0 0 24 24"><path d="M3 17l3-7 5-3 6 2 4 6-2 4H5z" fill="#8a857e"/><path d="M6 10l5-3 6 2-4 3z" fill="#a7a39b"/><path d="M11 12l2 7" stroke="#5e5a55" stroke-width="1"/></svg>',
    food: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5a5.5 5.5 0 0 1 1.3 10.8c-1.5.4-2.6 1.2-3.6 2.2l-2.1 2.1-3.2-3.2 2.1-2.1c1-1 1.8-2.1 2.2-3.6a5.5 5.5 0 0 1 3.3-6.2z" fill="#c8743a"/><path d="M8.6 15.4l-3.7 3.7" stroke="#eee3cf" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.3" cy="18.2" r="1.6" fill="#eee3cf"/><circle cx="5.8" cy="19.7" r="1.6" fill="#eee3cf"/></svg>',
    scrap: '<svg viewBox="0 0 24 24"><g fill="#8d939a"><rect x="10.5" y="2" width="3" height="5" rx="1"/><rect x="10.5" y="17" width="3" height="5" rx="1"/><rect x="2" y="10.5" width="5" height="3" rx="1"/><rect x="17" y="10.5" width="5" height="3" rx="1"/><circle cx="12" cy="12" r="6.5"/></g><circle cx="12" cy="12" r="2.6" fill="#1d1a17"/></svg>',
    meds: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#efe9de"/><rect x="10" y="6" width="4" height="12" rx="1" fill="#c9332d"/><rect x="6" y="10" width="12" height="4" rx="1" fill="#c9332d"/></svg>',
    ammo: '<svg viewBox="0 0 24 24"><path d="M4 20L18.5 5.5" stroke="#c9a978" stroke-width="1.8" stroke-linecap="round"/><path d="M20.5 3.5l-1 4.4-3.4-3.4z" fill="#b8bec4"/><path d="M4 20l-.6-3.4M4 20l3.4.6M6 18l-.6-3.2M6 18l3.2.6" stroke="#e8e0d0" stroke-width="1.3" stroke-linecap="round"/></svg>',
    ember: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.6 1.3-4 2.4-5.4.3 1.8 1 2.8 2 3.3C11 8 11 5 12 2z" fill="#ff8a2a"/><path d="M12 11c.6 2 2.6 2.6 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.6 1.3-2.4 2.6-5z" fill="#ffd27a"/></svg>',
    skull: '<svg viewBox="0 0 24 24"><path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.4 3 5.5V20h10v-3.5c1.8-1.1 3-2.9 3-5.5a8 8 0 0 0-8-8z" fill="#d8cfbf"/><circle cx="8.8" cy="11.5" r="2" fill="#1d1a17"/><circle cx="15.2" cy="11.5" r="2" fill="#1d1a17"/></svg>',
  };
  UI.ICON = ICON;
  const S = () => LC.state;
  const run = () => S().run;

  const costHtml = (cost, r) => Object.keys(cost).map((k) => '<span class="cost ' + ((r.res[k] || 0) >= cost[k] ? '' : 'short') + '">' + ICON[k] + cost[k] + '</span>').join('') || '<span class="muted">free</span>';
  const portrait = (s, size) => '<canvas class="portrait" width="' + (size || 96) + '" height="' + (size || 96) + '" data-pid="' + s.id + '"></canvas>';
  function paintPortraits(root, people) {
    root.querySelectorAll('canvas.portrait').forEach((cv) => {
      const s = people.find((p) => p.id === +cv.dataset.pid);
      if (s) LC.Draw.portrait(cv, Object.assign({}, s, { look: Object.assign({ coat: LC.ROLES[s.role].coat }, s.look) }), { dead: !s.alive });
    });
  }
  const fmtH = (h) => String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');

  // ---------- skeleton ----------
  UI.init = function () {
    const ui = $('ui');
    ui.innerHTML = `
      <div id="hud" class="hidden">
        <div id="clock" class="panel">
          <div class="kicker">LAST CAMP · <span id="c-day">DAY 1</span></div>
          <div class="clock-main"><span id="c-icon">☀</span><b id="c-time">07:00</b><span id="c-phase">Day</span></div>
          <div class="timeline" title="06:00 day · 18:00 dusk · 20:00 night · 05:00 dawn"><i id="c-mark"></i></div>
          <div id="hud-sub" class="sub"></div>
          <div id="hud-cloud" class="cloud-line"></div>
        </div>
        <div id="hud-banner" class="banner"></div>
        <div id="hud-res" class="panel">
          ${LC.RES_KEYS.map((k) => `<div class="res" title="${LC.RES[k]}">${ICON[k]}<div><b id="r-${k}">0</b><small id="rc-${k}">${LC.RES[k]}</small></div></div>`).join('')}
        </div>
      </div>
      <div id="toolbar" class="panel hidden">
        <button class="btn tool" data-act="pause" title="Pause (Space)"><span class="pz">❚❚</span><small>Pause</small></button>
        <button class="btn tool" data-act="settings" title="Settings">⚙️<small>Settings</small></button>
        <span class="sep"></span>
        <button class="btn tool" data-act="drawer" data-v="tasks" title="Assign people to buildings (T)">👥<small>Tasks</small></button>
        <button class="btn tool" data-act="drawer" data-v="roles" title="Change people's roles (R)">🎭<small>Roles</small></button>
        <button class="btn tool" data-act="drawer" data-v="build" title="Construct buildings (B)">🔨<small>Build</small></button>
        <button class="btn tool" data-act="drawer" data-v="log" title="Camp log (L)">📜<small>Log</small></button>
      </div>
      <div id="firebar" class="panel hidden">
        <div class="fb-top"><span class="fb-label">🔥 CAMPFIRE</span><span id="fb-text"></span></div>
        <div class="fb-row">
          <div class="meter"><i id="fb-fill"></i></div>
          <button class="btn small" data-act="stoke" title="Add 1 wood to the fire (F)">${ICON.wood} Add wood <kbd>F</kbd></button>
        </div>
        <label class="autofeed" title="A fire keeper tops up the fire from the woodpile at dusk and whenever it burns low at night"><input type="checkbox" id="autofire" data-autofire="1" checked> Auto-feed from the woodpile</label>
      </div>
      <div id="drawer" class="panel hidden">
        <div class="drawer-head"><h3 id="drawer-title"></h3><button class="x" data-act="closeDrawer" title="Close (Esc)">✕</button></div>
        <div id="drawer-body" class="drawer-body"></div>
      </div>
      <div id="inspector" class="panel hidden"></div>
      <div id="roster" class="panel hidden"></div>
      <div id="hint" class="hidden"></div>
      <div id="paused" class="hidden"><div>PAUSED</div><small>Press Space to continue</small></div>
      <div id="toasts"></div>
      <div id="menu" class="hidden"></div>
      <div id="modal" class="hidden"><div id="modal-card" class="card"></div></div>
      <button id="menuSettings" class="btn icon" data-act="settings" title="Settings">⚙️</button>
    `;
    ui.addEventListener('click', onClick);
    ui.addEventListener('change', onChange);
    ui.addEventListener('focusout', (e) => { if (e.target && e.target.tagName === 'SELECT') setTimeout(() => UI.refreshPanels(true), 0); });
    UI.syncMute();
  };

  UI.syncMute = () => { const b = $('set-sound'); if (b) { b.textContent = A.muted ? '🔇 Off' : '🔊 On'; b.classList.toggle('on', !A.muted); } };
  UI.syncCloud = function () {
    const el = $('hud-cloud');
    if (!el) return;
    const Cl = LC.Cloud;
    el.className = 'cloud-line ' + Cl.status;
    el.textContent = Cl.user ? '☁ ' + Cl.statusText() : 'Guest. Saved on this device only.';
  };
  function hideAll() {
    for (const id of ['hud', 'toolbar', 'firebar', 'drawer', 'inspector', 'roster', 'hint', 'menu', 'paused']) $(id).classList.add('hidden');
  }

  // ---------- clicks ----------
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    A.init();
    const act = el.dataset.act;
    const r = run();
    switch (act) {
      case 'new':
        A.play('click');
        if (G.hasSave()) confirmBox('Start a new run?', 'Your current saved camp will be abandoned.', 'Start fresh', () => LC.Flow.newRun());
        else LC.Flow.newRun();
        break;
      case 'continue': A.play('click'); LC.Flow.continueRun(); break;
      case 'shop': A.play('click'); UI.showShop(); break;
      case 'how': A.play('click'); UI.showHow(); break;
      case 'signin': A.play('click'); UI.showSignIn('in'); break;
      case 'signout':
        A.play('click'); el.disabled = true;
        LC.Cloud.signOut().then(() => { S().meta = G.loadMeta(); UI.showMenu(); UI.toast('Signed out. Your camp is safe online.', 'neutral'); });
        break;
      case 'close': A.play('click'); closeModal(); break;
      case 'prefFire': if (r) { r.autoFire = r.autoFire === false; G.save(r); A.play('click'); UI.showSettings(); } break;
      case 'buy': {
        const u = LC.META_UPG.find((x) => x.id === el.dataset.id);
        const m = S().meta, lvl = m.upg[u.id] || 0;
        if (lvl < u.max && m.embers >= u.cost(lvl)) { m.embers -= u.cost(lvl); m.upg[u.id] = lvl + 1; G.saveMeta(m); A.play('build'); UI.showShop(); UI.showMenu(true); }
        else A.play('deny');
        break;
      }
      case 'pause': LC.Flow.togglePause(); break;
      case 'speed': S().speed = +el.dataset.v; A.play('click'); UI.syncSpeed(); break;
      case 'settings': A.play('click'); UI.showSettings(); break;
      case 'pref': {
        const k = el.dataset.k;
        UI.prefs[k] = !UI.prefs[k];
        U.store.set('lastcamp.prefs', UI.prefs);
        A.play('click');
        UI.showSettings();
        break;
      }
      case 'fullscreen': {
        const d = document.documentElement;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(() => { if (screen.orientation && screen.orientation.lock && LC.App && LC.App.isTouch) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => UI.toast('Fullscreen is not available here.', 'neutral'));
        setTimeout(() => { if (UI.modalOpen()) UI.showSettings(); }, 400);
        break;
      }
      case 'recenter': A.play('click'); LC.Render.resetCamera(); closeModal(); break;
      case 'drawer': A.play('click'); UI.toggleDrawer(el.dataset.v); break;
      case 'closeDrawer': A.play('click'); UI.closeDrawer(); break;
      case 'stoke': if (r) LC.Night.stoke(r); break;
      case 'place': {
        const type = el.dataset.type;
        const why = B.canPlace(r, type);
        if (why) { UI.toast(why, 'bad'); A.play('deny'); break; }
        A.play('click');
        UI.closeDrawer();
        LC.Flow.startPlacing(type);
        break;
      }
      case 'upgrade': {
        const b = B.byId(r, +el.dataset.bid);
        if (b && B.upgrade(r, b)) { A.play('build'); UI.toast(B.def(b.type).name + ': upgrade to level ' + b.target + ' started. Builders will work on it.', 'good'); G.save(r); UI.refreshPanels(true); }
        else A.play('deny');
        break;
      }
      case 'demolish': {
        const b = B.byId(r, +el.dataset.bid);
        if (!b || !B.canDemolish(b)) break;
        A.play('click');
        const d = B.def(b.type);
        const refund = B.demolishRefund(b);
        const staff = B.staff(r, b).length;
        let warn = '';
        if (b.type === 'house') {
          const bedsAfter = G.beds(r) - B.stat('house', 'beds', b.lvl);
          if (bedsAfter < G.alive(r).length) warn = ' Your camp will have fewer beds than people, and no strangers can join until you build more.';
        }
        confirmBox('Demolish the ' + d.name + '?', 'You get back ' + (LC.fmtRes(refund) || 'nothing') + '.' + (staff ? ' ' + staff + ' worker(s) will become idle.' : '') + warn, 'Demolish', () => {
          const got = B.demolish(r, b);
          if (!got) return;
          S().selB = null;
          A.play('break');
          const p = LC.Bld.pos(b);
          LC.FX.burst(p.x, p.y - 20, 'splinter', 24); LC.FX.burst(p.x, p.y - 10, 'smoke', 10);
          UI.toast(d.name + ' demolished.' + (Object.keys(got).length ? ' Refunded ' + LC.fmtRes(got) + '.' : ''), 'neutral');
          G.save(r);
          UI.refreshPanels(true);
        });
        break;
      }
      case 'install': {
        A.play('click');
        LC.App.install().then((res) => { if (res === 'ios') UI.showIOSInstall(); else if (res === 'unavailable') UI.toast('Use your browser menu to install or "Add to Home Screen".', 'neutral'); UI.showMenu(true); });
        break;
      }
      case 'cancelBuild': {
        const b = B.byId(r, +el.dataset.bid);
        if (b && B.cancel(r, b)) { A.play('click'); UI.toast('Construction cancelled. Half the cost was refunded.', 'neutral'); if (b.lvl === 0) S().selB = null; G.save(r); UI.refreshPanels(true); }
        break;
      }
      case 'unassign': {
        const s = r.survivors.find((x) => x.id === +el.dataset.sid);
        if (s) { s.task = 'idle'; s.job = null; A.play('click'); G.save(r); UI.refreshPanels(true); }
        break;
      }
      case 'quickRepair': {
        const res = LC.Flow.quickRepair(el.dataset.kind);
        if (!res) A.play('deny');
        UI.refreshPanels(true);
        break;
      }
      case 'heal': {
        const s = r && r.survivors.find((x) => x.id === +el.dataset.sid);
        if (s && r.res.meds >= 1 && s.hp < G.maxHp(r, s)) { r.res.meds -= 1; s.hp = Math.min(G.maxHp(r, s), s.hp + 50); LC.FX.burst(s.x, s.y - 30, 'heal', 6); A.play('level'); UI.refreshPanels(true); }
        else A.play('deny');
        break;
      }
      case 'selS': {
        const id = +el.dataset.sid;
        S().sel = S().sel === id ? null : id; S().selB = null;
        A.play('click'); UI.refreshPanels(true);
        break;
      }
      case 'focus': {
        const s = r.survivors.find((x) => x.id === +el.dataset.sid);
        if (s && !s.hidden) { const R = LC.Render; R.cam.x = s.x - C.W / 2 / R.cam.z; R.cam.y = s.y - C.H / 2 / R.cam.z; R.clampCam(); }
        S().sel = +el.dataset.sid; S().selB = null; UI.refreshPanels(true);
        break;
      }
      case 'closeInspector': S().sel = null; S().selB = null; UI.refreshPanels(true); break;
      case 'hideHint': $('hint').classList.add('hidden'); if (r) r.flags.hintSeen = true; break;
      case 'quit':
        A.play('click');
        closeModal();
        if (S().night) confirmBox('Leave the night?', 'Night progress is not saved. You will return to the last save (dusk at the latest).', 'Quit to menu', () => LC.Flow.toMenu());
        else { G.save(r); LC.Flow.toMenu(); }
        break;
      case 'menu': A.play('click'); closeModal(); LC.Flow.toMenu(); break;
      case 'again': A.play('click'); closeModal(); LC.Flow.newRun(); break;
      case 'mute': A.setMuted(!A.muted); A.init(); if (!A.muted) A.play('click'); UI.syncMute(); break;
      default: break;
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.tagName === 'SELECT') setTimeout(() => { if (document.activeElement === el) el.blur(); UI.refreshPanels(true); }, 0);
    const r = run();
    if (!r || !el.dataset) return;
    if (el.dataset.assign !== undefined) {
      const s = r.survivors.find((x) => x.id === +el.dataset.assign);
      if (!s) return;
      const v = el.value;
      s.task = /^\d+$/.test(v) ? +v : v;
      s.job = null;
      if (S().night) UI.toast(s.name + ' will start this job in the morning.', 'neutral');
      G.save(r); A.play('click'); UI.refreshPanels(true);
    } else if (el.dataset.addworker !== undefined) {
      const s = r.survivors.find((x) => x.id === +el.value);
      if (s) { s.task = +el.dataset.addworker; s.job = null; G.save(r); A.play('click'); }
      UI.refreshPanels(true);
    } else if (el.dataset.role !== undefined) {
      const s = r.survivors.find((x) => x.id === +el.dataset.role);
      if (s && LC.ROLES[el.value]) {
        const ratio = s.hp / G.maxHp(r, s);
        s.role = el.value;
        s.hp = Math.max(1, Math.round(G.maxHp(r, s) * ratio));
        G.save(r); A.play('click');
        UI.toast(s.name + ' is now a ' + LC.ROLES[s.role].name + '.', 'neutral');
        UI.refreshPanels(true);
      }
    } else if (el.dataset.guard !== undefined) {
      const t = B.byId(r, +el.dataset.guard);
      if (t) { t.guard = el.value ? +el.value : null; for (const o of r.buildings) if (o !== t && o.type === 'tower' && o.guard === t.guard && t.guard) o.guard = null; G.save(r); A.play('click'); UI.refreshPanels(true); }
    } else if (el.dataset.autofire !== undefined) {
      r.autoFire = el.checked; G.save(r);
      UI.toast(el.checked ? 'The fire keeper will feed the fire from the woodpile.' : 'Auto-feed is off. Remember to add wood yourself (F)!', 'neutral');
    } else if (el.dataset.exped !== undefined) {
      r.expedition = el.value; G.save(r); A.play('click'); UI.refreshPanels(true);
    }
  }

  // ---------- menu ----------
  UI.showMenu = function (keepModal) {
    hideAll();
    if (!keepModal) closeModal();
    const m = S().meta;
    const save = G.load();
    const el = $('menu');
    const Cl = LC.Cloud;
    const busy = Cl.status === 'syncing' || !Cl.ready;
    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="account panel">
        ${Cl.user
          ? `<div class="acc-who"><span class="acc-dot ${Cl.status}"></span>Signed in as <b>${esc(Cl.user.email)}</b></div>
             <div class="acc-status">${esc(Cl.statusText())}</div>
             <button class="btn small" data-act="signout">Sign out</button>`
          : !Cl.ready
            ? '<div class="acc-who"><span class="acc-dot syncing"></span>Connecting…</div>'
            : `<div class="acc-who"><span class="acc-dot off"></span><b>Playing as guest</b></div>
               <div class="acc-status">${Cl.available() ? 'Sign in to keep your camp safe online and continue on any device.' : 'Offline. Progress is saved on this device only.'}</div>
               ${Cl.available() ? '<button class="btn small primary" data-act="signin">Sign in / Create account</button>' : ''}`}
      </div>
      <div class="menu-box">
        <div class="logo-row"><img class="emblem" src="icons/icon-192.png" alt=""><div class="logo">LAST<br>CAMP</div></div>
        <div class="tag">Build the town. Keep the fire burning.</div>
        <div class="menu-btns">
          ${busy ? '<div class="syncing-note">☁ Loading your save…</div>' : ''}
          ${save ? `<button class="btn primary big" data-act="continue" ${busy ? 'disabled' : ''}>Continue <small>Day ${save.night} · ${fmtH(G.hour(save))} · ${G.alive(save).length} people</small></button>` : ''}
          <button class="btn ${save ? '' : 'primary'} big" data-act="new" ${busy ? 'disabled' : ''}>New Run</button>
          <button class="btn big" data-act="shop">${ICON.ember} Embers <small>${m.embers} to spend</small></button>
          <button class="btn big" data-act="how">How to Play</button>
          ${LC.App && LC.App.installable() ? '<button class="btn big install" data-act="install"><span>📲 Install App</span><small>' + (LC.App.isIOS ? 'Add to Home Screen' : 'Play full screen, offline') + '</small></button>' : ''}
        </div>
        <div class="menu-stats">
          <div><b>${m.best}</b><small>best nights</small></div>
          <div><b>${m.runs}</b><small>runs</small></div>
          <div><b>${m.totalKills}</b><small>total kills</small></div>
        </div>
      </div>
      <div class="menu-foot">${LC.App && LC.App.isTouch ? 'Drag to look around · pinch to zoom · tap people and buildings to select them' : 'Drag to look around · scroll to zoom · <kbd>Space</kbd> pause · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> speed · <kbd>T</kbd> tasks · <kbd>R</kbd> roles · <kbd>B</kbd> build · <kbd>F</kbd> fire · <kbd>M</kbd> sound'}</div>
    `;
  };

  // ---------- settings ----------
  UI.prefs = Object.assign({ labels: true }, U.store.get('lastcamp.prefs', {}) || {});
  UI.showSettings = function () {
    const st = S(), r = run(), inGame = st.screen === 'run' && r && r.phase === 'play';
    const row = (label, desc, ctrl) => `<div class="set-row"><div><b>${label}</b><small>${desc}</small></div><div class="set-ctrl">${ctrl}</div></div>`;
    const toggle = (on, act, extra) => `<button class="btn small toggle ${on ? 'on' : ''}" data-act="${act}" ${extra || ''}>${on ? 'On' : 'Off'}</button>`;
    let html = '<h2>⚙️ Settings</h2><div class="settings">';
    html += row('Sound', 'Sound effects for the fire, fights and building. (M)', `<button id="set-sound" class="btn small toggle ${A.muted ? '' : 'on'}" data-act="mute">${A.muted ? '🔇 Off' : '🔊 On'}</button>`);
    if (inGame) {
      html += row('Game speed', 'How fast time passes. (keys 1, 2, 3)', [1, 2, 3].map((v) => `<button class="btn small seg ${st.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}">${['Normal', 'Fast', 'Faster'][v - 1]}</button>`).join(''));
      html += row('Auto-feed the fire', 'A fire keeper tops up the fire from the woodpile at dusk and at night.', toggle(r.autoFire !== false, 'prefFire'));
    }
    html += row('Building labels', 'Show level badges, beds and workers above buildings.', toggle(UI.prefs.labels, 'pref', 'data-k="labels"'));
    if (document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen) html += row('Fullscreen', 'Fill the whole screen.', toggle(!!document.fullscreenElement, 'fullscreen'));
    if (inGame) html += row('Camera', 'Jump back to the middle of the camp. (C)', '<button class="btn small" data-act="recenter">Re-center</button>');
    html += '</div><div class="modal-foot">';
    html += '<button class="btn" data-act="how">How to Play</button>';
    if (inGame) html += '<button class="btn danger" data-act="quit">Save & quit to menu</button>';
    html += '<button class="btn primary" data-act="close">Done</button></div>';
    openModal(html);
  };

  UI.showShop = function () {
    const m = S().meta;
    openModal(`
      <h2>${ICON.ember} Embers</h2>
      <p class="muted">Embers carry over between runs. You earn them for every night survived and for kills. Upgrades are permanent.</p>
      <div class="ember-count">${ICON.ember}<b>${m.embers}</b> embers</div>
      <div class="shop">
        ${LC.META_UPG.map((u) => {
          const lvl = m.upg[u.id] || 0, max = lvl >= u.max, cost = max ? 0 : u.cost(lvl);
          return `<div class="shop-item"><div><b>${esc(u.name)}</b> <span class="pips">${'●'.repeat(lvl)}${'○'.repeat(u.max - lvl)}</span><small>${esc(u.desc)}</small></div>
            <button class="btn small ${!max && m.embers >= cost ? 'primary' : ''}" data-act="buy" data-id="${u.id}" ${max || m.embers < cost ? 'disabled' : ''}>${max ? 'Maxed' : ICON.ember + cost}</button></div>`;
        }).join('')}
      </div>
      <div class="modal-foot"><button class="btn" data-act="close">Close</button></div>`);
  };

  UI.showHow = function () {
    openModal(`
      <h2>How to Play</h2>
      <div class="how">
        <p><b>Goal.</b> Survive as many nights as you can. The game never ends, and the dead grow stronger every night.</p>
        <p><b>🕒 Time flows on its own.</b> Day 06:00–18:00 · dusk 18:00–20:00 · <b>night 20:00–05:00</b> · dawn. For the first 50 days the days run longer and the nights pass quicker. Pause with ❚❚; change the game speed and sound in ⚙️ Settings.</p>
        <p><b>👥 Tasks.</b> Every working building needs people to run it: Farms grow food, the Lumber Mill sends woodcutters to the forest, the Quarry mines stone, the Workshop makes arrows, the Armory sharpens weapons, the Infirmary heals and the Scout Post goes on expeditions. Put people on <b>Construction</b> to build and upgrade, and to repair the wall.</p>
        <p><b>🎭 Roles.</b> Each role is 50% better at one job (a Farmer on a Farm, a Lumberjack at the Mill…). Fighters and Archers are best at night.</p>
        <p><b>🔨 Build.</b> Choose a building, then click a highlighted spot. Click any building to see its stats, staff it and <b>upgrade</b> it (levels 1–5). Big upgrades need stone and a Storehouse.</p>
        <p><b>🏠 Houses</b> set how many people can live in camp. Strangers can only join if there is a free bed.</p>
        <p><b>🌙 Night.</b> The dead come at random from every direction. While the palisade stands they can only claw at it. <b>Click a survivor</b>, then the ground to move them or an archer tower to man it. Keep the fire fed (<kbd>F</kbd>): <b>if it goes out at night, you lose.</b></p>
        <p>Every 3 nights you choose a perk. Dying gives embers for permanent upgrades.</p>
        <p><b>🧨 Demolish.</b> Select any building except the palisade, gate or campfire and tap Demolish to get 40% of its cost back.</p>
        <p><b>📱 Phones.</b> Play in landscape: drag to look around, pinch to zoom, tap to select. Install the app from the main menu for full screen.</p>
      </div>
      <div class="modal-foot"><button class="btn primary" data-act="close">Got it</button></div>`);
  };

  UI.showIOSInstall = function () {
    openModal(`
      <div class="event"><img class="emblem big" src="icons/icon-192.png" alt=""><div><h2>Install Last Camp</h2>
      <p>Play full screen in landscape, right from your home screen:</p>
      <ol class="steps"><li>Tap the <b>Share</b> button <span class="kbdish">⬆︎</span> at the bottom of Safari.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>, then open Last Camp from your home screen.</li></ol></div></div>
      <div class="modal-foot"><button class="btn primary" data-act="close">Got it</button></div>`);
  };

  // ---------- sign in ----------
  UI.showSignIn = function (mode) {
    const up = mode === 'up';
    openModal(`
      <h2>${up ? 'Create an Account' : 'Sign In'}</h2>
      <p class="muted">${up ? 'Your camp, embers and records will be saved online. Sign in on any device to continue where you left off.' : 'Welcome back. Your most recent camp will be waiting for you.'}</p>
      <form id="auth-form" class="auth" autocomplete="on" novalidate>
        <label>Email<input id="auth-email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label>
        <label>Password<input id="auth-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required minlength="6" maxlength="72" placeholder="${up ? 'At least 6 characters' : 'Your password'}"></label>
        ${up ? '<label>Confirm password<input id="auth-pass2" type="password" autocomplete="new-password" required minlength="6" maxlength="72"></label>' : ''}
        <div id="auth-msg" class="auth-msg" role="alert"></div>
        <button class="btn primary wide" id="auth-go" type="submit">${up ? 'Create account' : 'Sign in'}</button>
      </form>
      <div class="auth-switch">${up ? 'Already have an account?' : 'New here?'} <button class="link" id="auth-switch">${up ? 'Sign in' : 'Create an account'}</button></div>
      <div class="modal-foot"><button class="btn" data-act="close">Play as guest</button></div>`);
    const email = $('auth-email'), pass = $('auth-pass'), msg = $('auth-msg'), go = $('auth-go');
    setTimeout(() => email.focus(), 50);
    $('auth-switch').onclick = (e) => { e.preventDefault(); A.play('click'); UI.showSignIn(up ? 'in' : 'up'); };
    const say = (t, kind) => { msg.textContent = t; msg.className = 'auth-msg ' + (kind || 'bad'); };
    $('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const em = email.value.trim(), pw = pass.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return say('Please enter a valid email address.');
      if (pw.length < 6) return say('Password must be at least 6 characters.');
      if (up && pw !== $('auth-pass2').value) return say('The passwords do not match.');
      go.disabled = true;
      go.textContent = up ? 'Creating account…' : 'Signing in…';
      say('', 'info');
      try {
        if (up) await LC.Cloud.signUp(em, pw); else await LC.Cloud.signIn(em, pw);
        S().meta = G.loadMeta();
        closeModal();
        UI.showMenu();
        const save = G.load();
        UI.toast(save ? 'Welcome back! Your camp on day ' + save.night + ' is ready.' : 'Signed in. Your progress now saves online.', 'good');
      } catch (err) {
        say(LC.Cloud.friendlyError(err));
        go.disabled = false;
        go.textContent = up ? 'Create account' : 'Sign in';
      }
    };
  };

  // ---------- in-game HUD ----------
  UI.showGame = function () {
    hideAll(); closeModal();
    for (const id of ['hud', 'toolbar', 'firebar']) $(id).classList.remove('hidden');
    UI.syncCloud();
    UI.syncSpeed();
    UI.rosterSig = '';
    const r = run();
    if (r && !r.flags.hintSeen && r.night <= 1) {
      const h = $('hint');
      h.classList.remove('hidden');
      h.innerHTML = '<b>Welcome!</b> Drag to look around, scroll to zoom. Open <b>👥 Tasks</b> to put people to work and <b>🔨 Build</b> to grow the camp. Click any building to upgrade it. Night falls at 20:00. <button class="link" data-act="hideHint">Got it ✕</button>';
    }
    UI.tick(1, true);
  };

  UI.syncSpeed = function () {
    const st = S();
    const p = document.querySelector('#toolbar [data-act="pause"]');
    if (p) { p.classList.toggle('on', st.paused); p.querySelector('.pz').textContent = st.paused ? '▶' : '❚❚'; p.querySelector('small').textContent = st.paused ? 'Resume' : 'Pause'; }
    document.querySelectorAll('[data-act="speed"]').forEach((b) => b.classList.toggle('on', +b.dataset.v === st.speed));
    const pz = $('paused');
    pz.classList.toggle('hidden', !(st.paused && st.screen === 'run'));
    const hint = LC.App && LC.App.isTouch ? 'Tap ▶ Resume to continue' : 'Press Space to continue';
    if (pz.lastChild.textContent !== hint) pz.lastChild.textContent = hint;
  };

  let tAcc = 0, pAcc = 0;
  UI.tick = function (dt, force) {
    const st = S();
    if (st.screen !== 'run' || !st.run) return;
    tAcc += dt; pAcc += dt;
    if (!force && tAcc < 0.1) return;
    tAcc = 0;
    const r = st.run;
    // clock
    const h = G.hour(r), phase = G.phase(r);
    $('c-day').textContent = 'DAY ' + r.night;
    $('c-time').textContent = fmtH(h);
    $('c-icon').textContent = { day: '☀', dusk: '🌆', night: '🌙', dawn: '🌅' }[phase];
    $('c-phase').textContent = { day: 'Day', dusk: 'Dusk', night: 'Night', dawn: 'Dawn' }[phase];
    $('c-mark').style.left = (h / 24 * 100).toFixed(2) + '%';
    const se = G.season(r);
    $('hud-sub').textContent = se.name + ' ' + U.roman(se.year) + ' · day ' + se.dayOf + '/7 · ' + G.alive(r).length + ' people · beds ' + G.beds(r);
    // banner
    const b = $('hud-banner');
    let html, cls;
    if (st.night) {
      html = st.night.dawn ? '🌅 <b>Dawn.</b> The dead are retreating.' : '🌙 <b>Night ' + r.night + '</b> · threat: <b>' + st.night.threat.label + '</b>' + (st.night.boss ? ' · ☠ a giant is out there' : '') + ' · dawn at 05:00';
      cls = 'night';
    } else if (phase === 'dusk') {
      const fc = LC.Night.forecast(r);
      html = '🌆 <b>Dusk.</b> Night falls at 20:00 · expected threat: <b>' + fc.label + '</b>'; cls = 'dusk';
    } else {
      const fc = LC.Night.forecast(r);
      html = '☀ <b>Day ' + r.night + '.</b> Work until dusk · tonight\'s threat: <b>' + fc.label + '</b>'; cls = 'day';
    }
    if (st.place) { html = '🔨 ' + (LC.input && LC.input.touch ? 'Tap' : 'Click') + ' a highlighted spot to build a <b>' + B.def(st.place.type).name + '</b>. ' + (LC.input && LC.input.touch ? 'Tap Build again' : 'Right-click or Esc') + ' to cancel.'; cls = 'place'; }
    if (b.innerHTML !== html) b.innerHTML = html;
    b.className = 'banner ' + cls;
    // resources
    const caps = G.caps(r);
    for (const k of LC.RES_KEYS) {
      const el = $('r-' + k);
      const v = Math.max(0, Math.floor(r.res[k]));
      if (el.textContent !== String(v)) { if (el.textContent !== '' && !force) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } el.textContent = v; }
      const c = $('rc-' + k);
      const capTxt = '/' + caps[k];
      if (c.textContent !== capTxt) c.textContent = capTxt;
      el.classList.toggle('low', (k === 'food' && v < G.foodNeed(r)) || (k === 'ammo' && v < 10) || (k === 'wood' && v < 5));
      el.classList.toggle('full', v >= caps[k]);
    }
    // fire
    const fmax = G.fireMax(r), frac = U.clamp(r.fireFuel / fmax, 0, 1);
    $('fb-fill').style.width = (frac * 100).toFixed(1) + '%';
    $('firebar').classList.toggle('low', !!st.night && frac < 0.2);
    const af = $('autofire'); if (af && document.activeElement !== af) af.checked = r.autoFire !== false;
    $('fb-text').textContent = Math.floor(r.fireFuel) + ' / ' + fmax + (st.night ? ' · burns out in ' + U.fmtTime(r.fireFuel / G.burnRate(r)) : ' · burns ~' + Math.round(G.burnRate(r) * G.nightLen(r)) + ' per night');
    // night roster
    $('roster').classList.toggle('hidden', !st.night);
    if (st.night) tickRoster(r);
    // panels refresh twice a second
    if (pAcc >= 0.5 || force) { pAcc = 0; UI.refreshPanels(); }
  };

  function tickRoster(r) {
    const ro = $('roster');
    const sig = r.survivors.map((s) => s.id + (s.alive ? 'a' : 'd') + s.role + s.lvl).join(',') + '|' + S().sel;
    if (sig !== UI.rosterSig) {
      UI.rosterSig = sig;
      ro.innerHTML = '<div class="kicker">DEFENDERS</div>' + r.survivors.map((s) => `
        <div class="rrow ${s.alive ? '' : 'dead'} ${S().sel === s.id ? 'sel' : ''}" ${s.alive ? `data-act="selS" data-sid="${s.id}"` : ''}>
          ${portrait(s, 64)}
          <div class="rinfo"><b>${esc(s.name)}</b><small style="color:${LC.ROLES[s.role].color}">${LC.ROLES[s.role].name} · Lv ${s.lvl}</small>
            <div class="hp"><i data-hp="${s.id}"></i></div><small class="status" data-st="${s.id}"></small></div>
        </div>`).join('');
      paintPortraits(ro, r.survivors);
    }
    for (const s of r.survivors) {
      const bar = ro.querySelector('[data-hp="' + s.id + '"]');
      if (bar) { const f = s.alive ? s.hp / G.maxHp(r, s) : 0; bar.style.width = Math.round(f * 100) + '%'; bar.classList.toggle('low', f < 0.35); }
      const stEl = ro.querySelector('[data-st="' + s.id + '"]');
      if (stEl) stEl.textContent = LC.Night.status(r, s);
    }
  }

  // ---------- drawers ----------
  UI.drawer = null;
  UI.toggleDrawer = function (kind) { if (kind === 'build' && S().place) { S().place = null; UI.toast('Placement cancelled.', 'neutral'); return; } if (UI.drawer === kind) UI.closeDrawer(); else { UI.drawer = kind; $('drawer').classList.remove('hidden'); UI.renderDrawer(true); } };
  UI.closeDrawer = function () { UI.drawer = null; $('drawer').classList.add('hidden'); document.querySelectorAll('#toolbar [data-act="drawer"]').forEach((b) => b.classList.remove('on')); };

  const focusedSelect = (el) => { const a = document.activeElement; return a && a.tagName === 'SELECT' && el.contains(a) ? a : null; };
  // Updates a panel with fresh HTML. If the player is using a dropdown inside it, that one dropdown is kept
  // as it is (so it does not snap shut), while every other row, number and label is refreshed.
  UI.patch = function (container, html) {
    const focus = focusedSelect(container);
    if (!focus) { if (container.__html !== html) { container.innerHTML = html; container.__html = html; } return; }
    if (container.__html === html) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const oldKids = Array.from(container.children), newKids = Array.from(tmp.children);
    const row = oldKids.find((k) => k.contains(focus));
    const match = row && (row.dataset.row ? newKids.find((k) => k.dataset.row === row.dataset.row) : newKids[oldKids.indexOf(row)]);
    if (!row || !match) { container.innerHTML = html; container.__html = html; return; }
    // refresh the live parts of the row the player is using
    match.querySelectorAll('[data-live]').forEach((n) => {
      const o = row.querySelector('[data-live="' + n.dataset.live + '"]');
      if (!o || o.contains(focus)) return;
      if (o.innerHTML !== n.innerHTML) o.innerHTML = n.innerHTML;
      if (o.className !== n.className) o.className = n.className;
      const st = n.getAttribute('style') || '';
      if ((o.getAttribute('style') || '') !== st) o.setAttribute('style', st);
    });
    const sameSelect = (a, b) => ['data-assign', 'data-role', 'data-addworker', 'data-guard', 'data-exped'].every((k) => a.getAttribute(k) === b.getAttribute(k));
    match.querySelectorAll('select').forEach((n) => {
      const o = Array.from(row.querySelectorAll('select')).find((x) => sameSelect(x, n));
      if (!o) return;
      if (o !== focus) { o.replaceWith(n); return; }
      // the dropdown in use: refresh its option labels, availability and value in place
      const fresh = Array.from(n.options), cur = Array.from(o.options);
      if (fresh.length === cur.length && fresh.every((f, i) => f.value === cur[i].value)) {
        fresh.forEach((f, i) => { if (cur[i].textContent !== f.textContent) cur[i].textContent = f.textContent; if (cur[i].disabled !== f.disabled) cur[i].disabled = f.disabled; });
        const want = fresh.find((f) => f.selected);
        if (want && o.value !== want.value) o.value = want.value;
      }
    });
    // replace every other row around it
    for (const k of oldKids) if (k !== row) k.remove();
    const idx = newKids.indexOf(match);
    newKids.slice(0, idx).forEach((n) => container.insertBefore(n, row));
    newKids.slice(idx + 1).forEach((n) => container.appendChild(n));
    container.__html = null; // something was left untouched; rebuild fully once the dropdown is closed
  };

  UI.refreshPanels = function (force) {
    if (S().screen !== 'run') return;
    if (UI.drawer) UI.renderDrawer(force);
    UI.renderInspector(force);
  };

  function jobOptions(r, s) {
    const opts = [['idle', 'Idle'], ['rest', 'Rest at home'], ['build', 'Construction crew (build & repair)']];
    const jobs = r.buildings.filter((b) => B.def(b.type).workers && b.lvl > 0);
    const counts = {};
    for (const b of jobs) {
      counts[b.type] = (counts[b.type] || 0) + 1;
      const n = B.staff(r, b).length, m = B.slots(b);
      const same = r.buildings.filter((x) => x.type === b.type).length > 1;
      const full = n >= m && s.task !== b.id;
      opts.push([String(b.id), B.def(b.type).icon + ' ' + B.def(b.type).name + (same ? ' #' + counts[b.type] : '') + ' (' + n + '/' + m + ')' + (full ? ' · full' : ''), full]);
    }
    return opts.map((o) => `<option value="${o[0]}" ${String(s.task) === o[0] ? 'selected' : ''} ${o[2] ? 'disabled' : ''}>${esc(o[1])}</option>`).join('');
  }
  UI.jobName = function (r, s) {
    if (s.task === 'idle') return 'Idle';
    if (s.task === 'rest') return 'Resting';
    if (s.task === 'build') return 'Construction crew';
    const b = B.byId(r, s.task);
    return b ? B.def(b.type).name : 'Idle';
  };

  UI.renderDrawer = function (force) {
    const body = $('drawer-body');
    const r = run();
    const kind = UI.drawer;
    document.querySelectorAll('#toolbar [data-act="drawer"]').forEach((b) => b.classList.toggle('on', b.dataset.v === kind));
    const scroll = body.scrollTop;
    const alive = G.alive(r);
    let html = '';
    if (kind === 'tasks') {
      $('drawer-title').textContent = '👥 Tasks: who works where';
      const idle = alive.filter((s) => s.task === 'idle').length;
      html += `<p class="muted small">Buildings only work while people are assigned. ${idle ? '<b class="warn">' + idle + ' idle</b> · ' : ''}${G.freeBeds(r)} free bed(s).</p>`;
      html += alive.map((s) => {
        const max = G.maxHp(r, s), role = LC.ROLES[s.role];
        return `<div class="scard" data-row="t${s.id}">
          ${portrait(s)}
          <div class="sinfo">
            <div class="sname"><button class="link name" data-act="focus" data-sid="${s.id}">${esc(s.name)}</button> <span class="role" data-live="role" style="color:${role.color}">${role.name} · Lv ${s.lvl}</span></div>
            <div class="hp"><i data-live="hp" style="width:${Math.round(s.hp / max * 100)}%" class="${s.hp / max < 0.35 ? 'low' : ''}"></i></div>
            <select data-assign="${s.id}">${jobOptions(r, s)}</select>
            <div class="tasknote" data-live="note">${esc(S().night ? LC.Night.status(r, s) : LC.Town.status(r, s))}</div>
          </div></div>`;
      }).join('');
    } else if (kind === 'roles') {
      $('drawer-title').textContent = '🎭 Roles: what people are good at';
      html += '<p class="muted small">A role makes someone 50% better at one job and changes how they fight. Level and health carry over.</p>';
      html += alive.map((s) => {
        const role = LC.ROLES[s.role];
        return `<div class="scard" data-row="r${s.id}">
          ${portrait(s)}
          <div class="sinfo">
            <div class="sname">${esc(s.name)} <span class="role" data-live="role" style="color:${role.color}">${role.name} · Lv ${s.lvl}</span></div>
            <select data-role="${s.id}">${Object.keys(LC.ROLES).map((k) => `<option value="${k}" ${k === s.role ? 'selected' : ''}>${LC.ROLES[k].name}</option>`).join('')}</select>
            <div class="tasknote" data-live="note">${esc(role.desc)}<br><span class="muted">HP ${G.maxHp(r, s)} · melee ${G.meleeDmg(r, s).toFixed(0)} · arrows ${G.rangedDmg(r, s).toFixed(0)}</span></div>
          </div></div>`;
      }).join('');
    } else if (kind === 'build') {
      $('drawer-title').textContent = '🔨 Build';
      const sites = B.sites(r);
      const crew = alive.filter((s) => s.task === 'build').length;
      if (sites.length) {
        html += `<div class="section-title">Under construction ${crew ? '' : '<span class="warn">· no one on the construction crew!</span>'}</div>`;
        html += sites.map((b) => `<div class="bitem site"><div class="bdesc"><b>${B.def(b.type).icon} ${esc(B.def(b.type).name)} → Lv ${b.target}</b>
          <div class="meter thin"><i style="width:${Math.floor(b.progress / b.need * 100)}%"></i></div><small>${b.progress.toFixed(1)} / ${b.need} work-hours · ${crew} builder(s)</small></div></div>`).join('');
      }
      const cats = {};
      for (const t of LC.BUILD_ORDER) { const d = B.def(t); (cats[d.cat] = cats[d.cat] || []).push(t); }
      for (const cat in cats) {
        html += `<div class="section-title">${cat}</div>`;
        html += cats[cat].map((t) => {
          const d = B.def(t), n = B.count(r, t), why = B.canPlace(r, t);
          const cost = B.cost(t, 1);
          return `<div class="bitem ${n >= d.max ? 'done' : ''}">
            <div class="bicon">${d.icon}</div>
            <div class="bdesc"><b>${esc(d.name)}</b> <span class="muted small">${n}/${d.max}</span><small>${esc(d.desc)}</small>
              <div class="costs">${costHtml(cost, r)}<span class="cost muted">⏱ ${B.hours(t, 1)}h</span>${d.workers ? '<span class="cost muted">👷 ' + d.workers[0] + '</span>' : ''}</div>${why ? '' : reserveNote(r, cost)}</div>
            <div class="bact"><button class="btn small ${why ? '' : 'primary'}" data-act="place" data-type="${t}" ${n >= d.max ? 'disabled' : ''} title="${esc(why || 'Choose a spot')}">${n >= d.max ? 'Max' : 'Place'}</button></div>
          </div>`;
        }).join('');
      }
    } else if (kind === 'log') {
      $('drawer-title').textContent = '📜 Camp log';
      html += r.log.slice().reverse().map((l) => `<div class="logline ${l.kind}"><span class="muted">Day ${l.n} ${String(l.h).padStart(2, '0')}:00</span> ${esc(l.text)}</div>`).join('') || '<p class="muted">Nothing yet.</p>';
    }
    if (force && !focusedSelect(body)) body.__html = null;
    UI.patch(body, html);
    body.scrollTop = scroll;
    paintPortraits(body, r.survivors);
  };

  // ---------- inspector ----------
  UI.renderInspector = function (force) {
    const el = $('inspector');
    const st = S();
    const r = run();
    if (!r || (!st.selB && !st.sel)) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (force && !focusedSelect(el)) el.__html = null;
    if (st.selB) {
      const b = B.byId(r, st.selB);
      if (!b) { st.selB = null; el.classList.add('hidden'); return; }
      UI.patch(el, buildingCard(r, b));
      return;
    }
    const s = r.survivors.find((x) => x.id === st.sel);
    if (!s) { st.sel = null; el.classList.add('hidden'); return; }
    UI.patch(el, survivorCard(r, s));
    paintPortraits(el, r.survivors);
  };

  function reserveNote(r, cost) {
    const left = r.res.wood - (cost.wood || 0), need = G.fireReserve(r);
    return left < need ? '<small class="warn">⚠ Leaves ' + Math.max(0, Math.floor(left)) + ' wood. The fire needs about ' + need + ' for tonight.</small>' : '';
  }
  function statRows(b) {
    const d = B.def(b.type);
    const keys = Object.keys(d.stats);
    const cur = b.lvl, nxt = Math.min(C.BMAX, (b.target || b.lvl) + (b.target ? 0 : 1));
    return '<table class="stats"><tr><th></th><th>Now</th>' + (cur < C.BMAX ? '<th>Lv ' + nxt + '</th>' : '') + '</tr>' + keys.map((k) => {
      const now = cur > 0 ? d.stats[k][cur - 1] : '—';
      const next = cur < C.BMAX ? d.stats[k][nxt - 1] : null;
      return '<tr><td>' + esc(d.labels[k]) + '</td><td>' + now + '</td>' + (next !== null ? '<td class="up">' + next + '</td>' : '') + '</tr>';
    }).join('') + (d.workers ? '<tr><td>Worker slots</td><td>' + (cur > 0 ? d.workers[cur - 1] : '—') + '</td>' + (cur < C.BMAX ? '<td class="up">' + d.workers[nxt - 1] + '</td>' : '') + '</tr>' : '') + '</table>';
  }

  function buildingCard(r, b) {
    const d = B.def(b.type);
    const alive = G.alive(r);
    let html = `<div class="ins-head"><span class="ins-icon">${d.icon}</span><div><b>${esc(d.name)}</b><small>${d.cat} · ${b.lvl > 0 ? 'Level ' + b.lvl + ' / ' + C.BMAX : 'Not built yet'}</small></div><button class="x" data-act="closeInspector">✕</button></div>`;
    html += `<p class="small muted">${esc(d.desc)}</p>`;
    if (b.target) {
      const crew = alive.filter((s) => s.task === 'build').length;
      html += `<div class="ins-box"><b>⚒ ${b.lvl === 0 ? 'Being built' : 'Upgrading to level ' + b.target}</b>
        <div class="meter thin"><i style="width:${Math.floor(b.progress / b.need * 100)}%"></i></div>
        <small>${b.progress.toFixed(1)} / ${b.need} work-hours · ${crew ? crew + ' on the construction crew' : '<span class="warn">Nobody is building! Assign people to "Construction crew" in 👥 Tasks.</span>'}</small>
        <button class="btn small" data-act="cancelBuild" data-bid="${b.id}">Cancel (50% refund)</button></div>`;
    }
    html += statRows(b);
    if (b.type === 'house' && b.lvl > 0) {
      const o = LC.Render.houseOccupancy(r)[b.id] || [0, 0];
      html += `<div class="ins-box">🛏 <b>${o[0]} / ${o[1]}</b> beds used here · camp total: ${alive.length} people, ${G.beds(r)} beds (${G.freeBeds(r)} free)</div>`;
    }
    if (b.type === 'fire') html += `<div class="ins-box">Fuel <b>${Math.floor(r.fireFuel)} / ${G.fireMax(r)}</b> · 1 wood = ${C.FUEL_PER_WOOD} fuel <button class="btn small" data-act="stoke">${ICON.wood} Add wood</button></div>`;
    if (b.type === 'wall' || b.type === 'gate') {
      const segs = []; for (let i = 0; i < C.SEG; i++) if (LC.Geo.isGate(i) === (b.type === 'gate')) segs.push(i);
      let hp = 0, max = 0, broken = 0;
      for (const i of segs) { hp += r.wallHp[i]; max += G.segMax(r, i); if (r.wallBroken[i]) broken++; }
      const woodNeed = Math.ceil((max - hp) / 250);
      html += `<div class="ins-box">Condition <b>${Math.round(hp / max * 100)}%</b>${broken ? ' · <span class="warn">' + broken + ' broken section(s)</span>' : ''}
        ${max - hp > 1 ? `<button class="btn small" data-act="quickRepair" data-kind="${b.type}" ${r.res.wood >= 1 && !S().night ? '' : 'disabled'}>Repair now (${woodNeed} wood)</button>` : ''}
        <small class="muted">Your construction crew also repairs it over time when there is nothing to build (uses wood).</small></div>`;
    }
    if (d.workers && b.lvl > 0) {
      const staff = B.staff(r, b), slots = B.slots(b);
      const cands = alive.filter((s) => s.task !== b.id);
      html += `<div class="ins-box" data-row="workers"><b data-live="wcount">👷 Workers ${Math.min(staff.length, slots)} / ${slots}</b> <span data-live="wwarn">${staff.length ? '' : '<span class="warn">· inactive until someone works here</span>'}</span>
        <div class="staff" data-live="staff">${staff.map((s) => `<span class="chip">${esc(s.name)} <small style="color:${LC.ROLES[s.role].color}">${LC.ROLES[s.role].name}</small><button class="x small" data-act="unassign" data-sid="${s.id}" title="Remove">✕</button></span>`).join('')}</div>
        ${staff.length < slots && cands.length ? `<select data-addworker="${b.id}"><option value="">+ Assign someone…</option>${cands.map((s) => `<option value="${s.id}">${esc(s.name)} (${LC.ROLES[s.role].name}${LC.ROLES[s.role].job === b.type ? ' ★' : ''}) · now: ${esc(UI.jobName(r, s))}</option>`).join('')}</select>` : ''}
        <small class="muted">★ = role bonus here (+50%).</small></div>`;
    }
    if (b.type === 'tower' && b.lvl > 0) {
      html += `<div class="ins-box" data-row="guard"><b>🏹 Night guard</b><select data-guard="${b.id}"><option value="">Automatic (best available)</option>${alive.map((s) => `<option value="${s.id}" ${b.guard === s.id ? 'selected' : ''}>${esc(s.name)} (${LC.ROLES[s.role].name}${s.role === 'archer' ? ' ★' : ''})</option>`).join('')}</select>
        <small class="muted">Guards climb up at nightfall and keep their day job.</small></div>`;
    }
    if (b.type === 'expedition' && b.lvl > 0) {
      html += `<div class="ins-box" data-row="exped"><b>🧭 Destination</b><select data-exped="1">${LC.LOCS.map((l) => `<option value="${l.id}" ${r.expedition === l.id ? 'selected' : ''} ${r.night < l.unlock ? 'disabled' : ''}>${esc(l.name)} · risk ${Math.round(l.risk * 100)}%${r.night < l.unlock ? ' · from day ' + l.unlock : ''}</option>`).join('')}</select>
        <small class="muted">Leaves in the morning (before 13:00), back around 16:00.</small></div>`;
    }
    if (b.lvl > 0 && b.lvl < C.BMAX && !b.target) {
      const cost = B.cost(b.type, b.lvl + 1), why = B.upgradeBlock(r, b);
      html += `<div class="ins-up"><div><b>Upgrade to level ${b.lvl + 1}</b><div class="costs">${costHtml(cost, r)}<span class="cost muted">⏱ ${B.hours(b.type, b.lvl + 1)}h work</span></div></div>
        <button class="btn primary" data-act="upgrade" data-bid="${b.id}" ${why ? 'disabled title="' + esc(why) + '"' : ''}>Upgrade</button></div>`;
      if (!why) html += reserveNote(r, cost);
      if (why === 'Not enough resources.') {
        const caps = G.caps(r);
        const overCap = Object.keys(cost).some((k) => cost[k] > caps[k]);
        html += `<small class="warn">${overCap ? 'This costs more than you can store. Build or upgrade a Storehouse.' : 'Not enough resources yet.'}</small>`;
      }
    } else if (b.lvl >= C.BMAX) html += '<div class="ins-up"><b class="gold">★ Maximum level</b></div>';
    if (B.canDemolish(b)) html += `<div class="ins-demo"><button class="btn small danger" data-act="demolish" data-bid="${b.id}">🧨 Demolish</button><small class="muted">Refunds 40% of what it cost.</small></div>`;
    else html += '<div class="ins-demo"><small class="muted">' + (b.type === 'fire' ? 'The campfire cannot be demolished. It is the heart of the camp.' : 'The ' + (b.type === 'gate' ? 'gate is part of the palisade and' : 'palisade') + ' cannot be demolished.') + '</small></div>';
    return html;
  }

  function survivorCard(r, s) {
    const role = LC.ROLES[s.role], max = G.maxHp(r, s);
    return `<div class="ins-head">${portrait(s, 64)}<div><b>${esc(s.name)}</b><small style="color:${role.color}">${role.name} · Level ${s.lvl}</small></div><button class="x" data-act="closeInspector">✕</button></div>
      <div class="hp"><i style="width:${Math.round(s.hp / max * 100)}%" class="${s.hp / max < 0.35 ? 'low' : ''}"></i></div>
      <small class="muted">${Math.round(s.hp)}/${max} HP · ${s.lvl < C.MAX_LVL ? 'XP ' + Math.floor(s.xp) + '/' + G.xpNeed(s.lvl) : 'max level'} · ${esc(S().night ? LC.Night.status(r, s) : LC.Town.status(r, s))}</small>
      <label class="field" data-row="job">Job<select data-assign="${s.id}">${jobOptions(r, s)}</select></label>
      <label class="field" data-row="role">Role<select data-role="${s.id}">${Object.keys(LC.ROLES).map((k) => `<option value="${k}" ${k === s.role ? 'selected' : ''}>${LC.ROLES[k].name}</option>`).join('')}</select></label>
      <small class="muted">${esc(role.desc)}</small>
      ${s.hp < max && r.res.meds >= 1 ? `<button class="btn small" data-act="heal" data-sid="${s.id}">${ICON.meds} Use medicine (+50 HP)</button>` : ''}
      ${S().night ? '<small class="muted">Tip: click the ground to move them, or an archer tower to send them up.</small>' : ''}`;
  }

  // ---------- events, perks, dawn, game over ----------
  UI.showEvent = function (ev, cb) {
    openModal(`
      <div class="event">${ev.person ? portrait(ev.person, 128) : ''}<div><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p></div></div>
      <div class="options">${ev.options.map((o, i) => `<button class="btn option" data-opt="${i}" ${o.enabled ? '' : 'disabled'}><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}</div>`);
    const card = $('modal-card');
    if (ev.person) paintPortraits(card, [ev.person]);
    card.querySelectorAll('[data-opt]').forEach((b) => {
      b.onclick = () => {
        const o = ev.options[+b.dataset.opt];
        if (!o || !o.enabled) return;
        A.play('click');
        const msg = o.act();
        closeModal();
        if (msg) { UI.toast(msg, 'neutral'); G.log(run(), ev.title + ': ' + msg, 'neutral'); }
        cb();
      };
    });
  };

  UI.showPerks = function (choices, cb) {
    openModal(`
      <h2 class="center">Choose a Perk</h2>
      <p class="center muted">Your camp has grown more experienced. Perks last for the rest of this run.</p>
      <div class="perks">${choices.map((p) => `<button class="perk" data-perk="${p.id}"><span class="picon">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></button>`).join('')}</div>`);
    $('modal-card').querySelectorAll('[data-perk]').forEach((b) => { b.onclick = () => { A.play('level'); closeModal(); cb(b.dataset.perk); }; });
  };

  UI.showGameOver = function (r, info) {
    for (const id of ['drawer', 'inspector', 'roster', 'hint', 'paused', 'toolbar', 'firebar']) $(id).classList.add('hidden');
    const nights = r.stats.nightsSurvived;
    const fallen = r.fallen.slice(-8).map((f) => esc(f.name)).join(', ');
    openModal(`
      <h2 class="center over-title">The Fire Is Out</h2>
      <p class="center muted">${esc(info.reason)}</p>
      <div class="stats3">
        <div><span class="big-num">${nights}</span><small>night${nights === 1 ? '' : 's'} survived</small></div>
        <div>${ICON.skull}<b>${r.stats.kills}</b><small>total kills</small></div>
        <div>${ICON.ember}<b>+${info.embers}</b><small>embers earned</small></div>
      </div>
      ${info.newBest ? '<p class="center gold">★ New record! ★</p>' : '<p class="center muted">Best: ' + S().meta.best + ' nights</p>'}
      ${fallen ? `<div class="memorial">✝ Remembered: ${fallen}</div>` : ''}
      <div class="modal-foot"><button class="btn" data-act="menu">Main menu</button><button class="btn primary" data-act="again">Try again</button></div>`);
  };

  // ---------- modal helpers ----------
  function openModal(html) { $('modal-card').innerHTML = html; $('modal').classList.remove('hidden'); $('modal-card').scrollTop = 0; }
  function closeModal() { $('modal').classList.add('hidden'); $('modal-card').innerHTML = ''; }
  UI.closeModal = closeModal;
  UI.modalOpen = () => !$('modal').classList.contains('hidden');
  function confirmBox(title, text, okLabel, ok) {
    openModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="modal-foot"><button class="btn" data-act="close">Cancel</button><button class="btn primary danger" id="cf-ok">${esc(okLabel)}</button></div>`);
    $('cf-ok').onclick = () => { A.play('click'); closeModal(); ok(); };
  }

  // ---------- toasts ----------
  UI.toast = function (text, kind) {
    const box = $('toasts');
    if (!box) return;
    for (const c of box.children) if (c.textContent === text && !c.classList.contains('out')) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || 'neutral');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('out'), 3600);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 4200);
  };
  UI.clearToasts = () => { const b = $('toasts'); if (b) b.innerHTML = ''; };
})(window.LC);
