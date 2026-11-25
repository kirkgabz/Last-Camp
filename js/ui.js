/* Last Camp — DOM interface */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, A = LC.Audio;
  const UI = (LC.UI = {});
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;

  const ICON = {
    wood: '<svg viewBox="0 0 24 24"><rect x="2" y="8.5" width="17" height="7.5" rx="3.7" fill="#7d5230"/><path d="M5 10.5h9M6 13.5h8" stroke="#5a3a20" stroke-width="1"/><ellipse cx="19" cy="12.25" rx="3" ry="3.75" fill="#d9a066"/><ellipse cx="19" cy="12.25" rx="1.6" ry="2" fill="none" stroke="#a8743f" stroke-width="0.9"/></svg>',
    food: '<svg viewBox="0 0 24 24"><path d="M15.5 3.5a5.5 5.5 0 0 1 1.3 10.8c-1.5.4-2.6 1.2-3.6 2.2l-2.1 2.1-3.2-3.2 2.1-2.1c1-1 1.8-2.1 2.2-3.6a5.5 5.5 0 0 1 3.3-6.2z" fill="#c8743a"/><path d="M15 6c1.5.3 2.6 1.4 2.9 2.9" stroke="#e8a060" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M8.6 15.4l-3.7 3.7" stroke="#eee3cf" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.3" cy="18.2" r="1.6" fill="#eee3cf"/><circle cx="5.8" cy="19.7" r="1.6" fill="#eee3cf"/></svg>',
    scrap: '<svg viewBox="0 0 24 24"><g fill="#8d939a"><rect x="10.5" y="2" width="3" height="5" rx="1"/><rect x="10.5" y="17" width="3" height="5" rx="1"/><rect x="2" y="10.5" width="5" height="3" rx="1"/><rect x="17" y="10.5" width="5" height="3" rx="1"/><rect x="10.5" y="2" width="3" height="5" rx="1" transform="rotate(45 12 12)"/><rect x="10.5" y="17" width="3" height="5" rx="1" transform="rotate(45 12 12)"/><rect x="2" y="10.5" width="5" height="3" rx="1" transform="rotate(45 12 12)"/><rect x="17" y="10.5" width="5" height="3" rx="1" transform="rotate(45 12 12)"/><circle cx="12" cy="12" r="6.5"/></g><circle cx="12" cy="12" r="2.6" fill="#1d1a17"/></svg>',
    meds: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#efe9de"/><rect x="10" y="6" width="4" height="12" rx="1" fill="#c9332d"/><rect x="6" y="10" width="12" height="4" rx="1" fill="#c9332d"/></svg>',
    ammo: '<svg viewBox="0 0 24 24"><path d="M4 20L18.5 5.5" stroke="#c9a978" stroke-width="1.8" stroke-linecap="round"/><path d="M20.5 3.5l-1 4.4-3.4-3.4z" fill="#b8bec4"/><path d="M4 20l-.6-3.4M4 20l3.4.6M6 18l-.6-3.2M6 18l3.2.6" stroke="#e8e0d0" stroke-width="1.3" stroke-linecap="round"/></svg>',
    ember: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.6 1.3-4 2.4-5.4.3 1.8 1 2.8 2 3.3C11 8 11 5 12 2z" fill="#ff8a2a"/><path d="M12 11c.6 2 2.6 2.6 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.6 1.3-2.4 2.6-5z" fill="#ffd27a"/></svg>',
    skull: '<svg viewBox="0 0 24 24"><path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.4 3 5.5V20h10v-3.5c1.8-1.1 3-2.9 3-5.5a8 8 0 0 0-8-8z" fill="#d8cfbf"/><circle cx="8.8" cy="11.5" r="2" fill="#1d1a17"/><circle cx="15.2" cy="11.5" r="2" fill="#1d1a17"/><path d="M10 20v-2.5M14 20v-2.5M12 20v-2.5" stroke="#1d1a17" stroke-width="1"/></svg>',
  };
  UI.ICON = ICON;
  const RES_KEYS = ['wood', 'food', 'scrap', 'meds', 'ammo'];
  const S = () => LC.state;
  const run = () => S().run;

  function costHtml(cost, r) {
    return Object.keys(cost).map((k) => '<span class="cost ' + (r[k] >= cost[k] ? '' : 'short') + '">' + ICON[k] + cost[k] + '</span>').join('');
  }

  // ---------- skeleton ----------
  UI.init = function () {
    const ui = $('ui');
    ui.innerHTML = `
      <div id="hud" class="hidden">
        <div id="hud-left" class="panel">
          <div class="kicker">LAST CAMP · ENDLESS</div>
          <div id="hud-title" class="hud-title">Day 1</div>
          <div id="hud-sub" class="sub"></div>
          <div id="hud-cloud" class="cloud-line"></div>
        </div>
        <div id="hud-banner" class="banner"></div>
        <div id="hud-res" class="panel">
          ${RES_KEYS.map((k) => `<div class="res" title="${LC.RES[k]}">${ICON[k]}<div><b id="r-${k}">0</b><small>${LC.RES[k]}</small></div></div>`).join('')}
        </div>
      </div>
      <div id="side" class="panel hidden"></div>
      <div id="roster" class="panel hidden"></div>
      <div id="firebar" class="panel hidden">
        <div class="fb-top"><span class="fb-label">🔥 CAMPFIRE</span><span id="fb-text"></span></div>
        <div class="fb-row">
          <div class="meter"><i id="fb-fill"></i></div>
          <button class="btn small" data-act="stoke" title="Add 1 wood to the fire (F)">${ICON.wood} Add wood <kbd>F</kbd></button>
        </div>
      </div>
      <div id="speed" class="panel hidden">
        <button class="btn icon" data-act="pause" title="Pause (Space)">❚❚</button>
        <button class="btn icon" data-act="speed" data-v="1" title="Normal speed (1)">1×</button>
        <button class="btn icon" data-act="speed" data-v="2" title="Fast (2)">2×</button>
        <button class="btn icon" data-act="speed" data-v="3" title="Faster (3)">3×</button>
        <button class="btn icon" data-act="quit" title="Menu">☰</button>
      </div>
      <div id="clock" class="panel hidden">
        <div class="kicker">🌙 DAWN IN</div>
        <div class="clock-row"><b id="clock-time">1:20</b><span id="clock-left"></span></div>
      </div>
      <div id="hint" class="hidden"></div>
      <div id="paused" class="hidden"><div>PAUSED</div><small>Press Space to continue</small></div>
      <div id="toasts"></div>
      <div id="menu" class="hidden"></div>
      <div id="modal" class="hidden"><div id="modal-card" class="card"></div></div>
      <button id="mute" class="btn icon" data-act="mute" title="Sound (M)">🔊</button>
    `;
    ui.addEventListener('click', onClick);
    ui.addEventListener('change', onChange);
    UI.syncMute();
  };

  UI.syncCloud = function () {
    const el = $('hud-cloud');
    if (!el) return;
    const Cl = LC.Cloud;
    el.className = 'cloud-line ' + Cl.status;
    el.textContent = Cl.user ? '☁ ' + Cl.statusText() : 'Guest. Saved on this device only.';
  };

  // ---------- sign in / create account ----------
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
      <div class="modal-foot"><button class="btn" data-act="close">Play as guest</button></div>
    `);
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
        const res = up ? await LC.Cloud.signUp(em, pw) : await LC.Cloud.signIn(em, pw);
        if (res === 'confirm-email') {
          say('Almost done! We sent a confirmation link to ' + em + '. Open it, then come back and sign in.', 'good');
          go.textContent = 'Check your email';
          return;
        }
        S().meta = G.loadMeta();
        closeModal();
        UI.showMenu();
        const save = G.load();
        UI.toast(save ? 'Welcome back! Your camp on ' + (save.phase === 'dusk' ? 'Dusk ' : 'Day ') + save.night + ' is ready.' : 'Signed in. Your progress now saves online.', 'good');
      } catch (err) {
        say(LC.Cloud.friendlyError(err));
        go.disabled = false;
        go.textContent = up ? 'Create account' : 'Sign in';
      }
    };
  };

  UI.syncMute = () => { const b = $('mute'); if (b) b.textContent = A.muted ? '🔇' : '🔊'; };

  function hideAll() {
    for (const id of ['hud', 'side', 'roster', 'firebar', 'speed', 'clock', 'hint', 'menu', 'paused']) $(id).classList.add('hidden');
  }

  // ---------- click handling ----------
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
        A.play('click');
        el.disabled = true;
        LC.Cloud.signOut().then(() => { S().meta = G.loadMeta(); UI.showMenu(); UI.toast('Signed out. Your camp is safe online.', 'neutral'); });
        break;
      case 'close': A.play('click'); closeModal(); break;
      case 'buy': {
        const u = LC.META_UPG.find((x) => x.id === el.dataset.id);
        const m = S().meta;
        const lvl = m.upg[u.id] || 0;
        if (lvl < u.max && m.embers >= u.cost(lvl)) {
          m.embers -= u.cost(lvl); m.upg[u.id] = lvl + 1; G.saveMeta(m); A.play('build'); UI.showShop(); UI.showMenu(true);
        } else A.play('deny');
        break;
      }
      case 'sendout': A.play('click'); LC.Flow.sendOut(); break;
      case 'heal': {
        const s = r && r.survivors.find((x) => x.id === +el.dataset.sid);
        if (s && r.res.meds > 0 && s.hp < G.maxHp(r, s)) {
          r.res.meds--; s.hp = Math.min(G.maxHp(r, s), s.hp + 50);
          LC.FX.burst(s.x, s.y - 30, 'heal', 6); A.play('level');
          if (r.phase === 'day') UI.renderDay(); else if (r.phase === 'dusk') UI.renderDusk();
        } else A.play('deny');
        break;
      }
      case 'build':
        if (r && LC.Build.apply(r, el.dataset.id)) {
          A.play(el.dataset.id === 'stoke' ? 'stoke' : 'build');
          if (el.dataset.id === 'stoke') LC.FX.burst(C.CX, C.CY - 14, 'spark', 16);
          G.save(r);
          UI.renderDusk();
        } else A.play('deny');
        break;
      case 'night': A.play('click'); LC.Flow.beginNight(); break;
      case 'stoke': if (r && r.phase === 'night') LC.Night.stoke(r); break;
      case 'pause': LC.Flow.togglePause(); break;
      case 'speed': S().speed = +el.dataset.v; S().paused = false; A.play('click'); UI.syncSpeed(); break;
      case 'sel': {
        const id = +el.dataset.sid;
        S().sel = S().sel === id ? null : id;
        A.play('click');
        break;
      }
      case 'quit':
        A.play('click');
        if (r && r.phase === 'night') confirmBox('Leave the night?', 'Night progress is not saved. You will return to the dusk before this night.', 'Quit to menu', () => LC.Flow.toMenu());
        else LC.Flow.toMenu();
        break;
      case 'menu': A.play('click'); closeModal(); LC.Flow.toMenu(); break;
      case 'again': A.play('click'); closeModal(); LC.Flow.newRun(); break;
      case 'mute': A.setMuted(!A.muted); UI.syncMute(); break;
      default: break;
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.dataset && el.dataset.task !== undefined) {
      const r = run();
      const s = r && r.survivors.find((x) => x.id === +el.dataset.task);
      if (s) { s.task = el.value; G.save(r); UI.renderDay(); }
    }
  }

  // ---------- portraits ----------
  function paintPortraits(root, people) {
    root.querySelectorAll('canvas.portrait').forEach((cv) => {
      const id = +cv.dataset.pid;
      const s = people.find((p) => p.id === id);
      if (s) LC.Draw.portrait(cv, s, { dead: !s.alive });
    });
  }
  const portrait = (s, size) => '<canvas class="portrait" width="' + (size || 96) + '" height="' + (size || 96) + '" data-pid="' + s.id + '"></canvas>';

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
            ? `<div class="acc-who"><span class="acc-dot syncing"></span>Connecting…</div>`
            : `<div class="acc-who"><span class="acc-dot off"></span><b>Playing as guest</b></div>
               <div class="acc-status">${Cl.available() ? 'Sign in to keep your camp safe online and continue on any device.' : 'Offline. Progress is saved on this device only.'}</div>
               ${Cl.available() ? '<button class="btn small primary" data-act="signin">Sign in / Create account</button>' : ''}`}
      </div>
      <div class="menu-box">
        <div class="logo">LAST<br>CAMP</div>
        <div class="tag">How many nights can the fire burn?</div>
        <div class="menu-btns">
          ${busy ? '<div class="syncing-note">☁ Loading your save…</div>' : ''}
          ${save ? `<button class="btn primary big" data-act="continue" ${busy ? 'disabled' : ''}>Continue <small>${save.phase === 'dusk' ? 'Dusk' : 'Day'} ${save.night} · ${G.alive(save).length} survivors</small></button>` : ''}
          <button class="btn ${save ? '' : 'primary'} big" data-act="new" ${busy ? 'disabled' : ''}>New Run</button>
          <button class="btn big" data-act="shop">${ICON.ember} Embers <small>${m.embers} to spend</small></button>
          <button class="btn big" data-act="how">How to Play</button>
        </div>
        <div class="menu-stats">
          <div><b>${m.best}</b><small>best nights</small></div>
          <div><b>${m.runs}</b><small>runs</small></div>
          <div><b>${m.totalKills}</b><small>total kills</small></div>
        </div>
      </div>
      <div class="menu-foot">Mouse to command · <kbd>F</kbd> feed the fire · <kbd>Space</kbd> pause · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> speed · <kbd>M</kbd> sound</div>
    `;
  };

  UI.showShop = function () {
    const m = S().meta;
    openModal(`
      <h2>${ICON.ember} Embers</h2>
      <p class="muted">Embers carry over between runs. You earn them for every night survived and for kills. Upgrades are permanent and apply to every new run.</p>
      <div class="ember-count">${ICON.ember}<b>${m.embers}</b> embers</div>
      <div class="shop">
        ${LC.META_UPG.map((u) => {
          const lvl = m.upg[u.id] || 0;
          const max = lvl >= u.max;
          const cost = max ? 0 : u.cost(lvl);
          return `<div class="shop-item">
            <div><b>${esc(u.name)}</b> <span class="pips">${'●'.repeat(lvl)}${'○'.repeat(u.max - lvl)}</span><small>${esc(u.desc)}</small></div>
            <button class="btn small ${!max && m.embers >= cost ? 'primary' : ''}" data-act="buy" data-id="${u.id}" ${max || m.embers < cost ? 'disabled' : ''}>${max ? 'Maxed' : ICON.ember + cost}</button>
          </div>`;
        }).join('')}
      </div>
      <div class="modal-foot"><button class="btn" data-act="close">Close</button></div>
    `);
  };

  UI.showHow = function () {
    openModal(`
      <h2>How to Play</h2>
      <div class="how">
        <p><b>Goal.</b> Survive as many nights as you can. The game never ends. Every night is harder than the last.</p>
        <p><b>☀ Day.</b> Give each survivor a job: chop wood, hunt for food, make arrows, scavenge ruins, or rest to heal. Trips outside can hurt or kill. Everyone eats 1 food per day.</p>
        <p><b>🌆 Dusk.</b> Spend what you gathered: stoke the fire, repair and upgrade the palisade, build watchtowers, spike traps, tents and an armory.</p>
        <p><b>🌙 Night.</b> The dead come out of the forest and attack the wall. Your survivors fight on their own.
        <br>• <b>Click a survivor</b> (or their card), then <b>click the ground</b> to move them, or <b>click a watchtower</b> to send them up to shoot arrows.
        <br>• <b>Click the fire or press F</b> to add wood. <b>If the fire goes out, you lose.</b>
        <br>• Builders repair the wall. Medics heal. Hunters and tower archers use arrows.</p>
        <p><b>Hold the wall.</b> While the palisade stands, the dead can only claw at it, and your people can strike them through the gaps. Once a section breaks, they pour in.</p>
        <p><b>Every 3 nights</b> you choose a perk. <b>Every 10th night</b> a boss comes. Seasons change every 7 days. Winter burns more wood and has less food.</p>
        <p><b>Dying</b> ends the run, but you keep <b>embers</b> to buy permanent upgrades.</p>
      </div>
      <div class="modal-foot"><button class="btn primary" data-act="close">Got it</button></div>
    `);
  };

  // ---------- HUD ----------
  function setHud(title, banner, cls) {
    const r = run();
    $('hud').classList.remove('hidden');
    $('hud-title').textContent = title;
    const se = G.season(r);
    $('hud-sub').textContent = se.name + ' ' + U.roman(se.year) + ' · day ' + se.dayOf + '/7 · best ' + S().meta.best;
    const b = $('hud-banner');
    b.innerHTML = banner;
    b.className = 'banner ' + (cls || '');
    UI.syncCloud();
    UI.tickRes(true);
  }

  UI.tickRes = function (force) {
    const r = run();
    if (!r) return;
    for (const k of RES_KEYS) {
      const el = $('r-' + k);
      const v = Math.max(0, Math.floor(r.res[k]));
      if (force || el.textContent !== String(v)) {
        if (!force && el.textContent !== '') { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
        el.textContent = v;
        el.classList.toggle('low', (k === 'food' && v < G.foodNeed(r)) || (k === 'ammo' && v < 10) || (k === 'wood' && v < 3));
      }
    }
  };

  // ---------- day ----------
  UI.showDay = function () {
    hideAll(); closeModal();
    const r = run();
    setHud('Day ' + r.night, '☀ <b>Morning.</b> Assign today\'s work, then send the crew out.', 'day');
    $('side').classList.remove('hidden');
    UI.renderDay();
  };

  UI.renderDay = function () {
    const r = run();
    const side = $('side');
    const tasks = LC.Day.tasks(r);
    const alive = G.alive(r);
    const need = G.foodNeed(r);
    for (const s of alive) if (!tasks.some((t) => t.id === s.task)) s.task = 'rest';
    const scroll = side.querySelector('.side-body') ? side.querySelector('.side-body').scrollTop : 0;
    side.innerHTML = `
      <div class="side-head"><h2>Day ${r.night}<span>Morning</span></h2>
      <p class="muted">${alive.length} survivor${alive.length === 1 ? '' : 's'} · ${G.beds(r)} beds. Trips outside are risky, and the risk grows every day.</p></div>
      <div class="side-body">
        ${alive.map((s) => {
          const max = G.maxHp(r, s);
          const role = LC.ROLES[s.role];
          return `<div class="scard">
            ${portrait(s)}
            <div class="sinfo">
              <div class="sname">${esc(s.name)} <span class="role" style="color:${role.color}">${role.name} · Lv ${s.lvl}</span></div>
              <div class="hp"><i style="width:${Math.round(s.hp / max * 100)}%" class="${s.hp / max < 0.35 ? 'low' : ''}"></i></div>
              <div class="hptext">${Math.round(s.hp)}/${max} HP ${s.lvl < C.MAX_LVL ? '· XP ' + Math.floor(s.xp) + '/' + G.xpNeed(s.lvl) : '· max level'}
                ${s.hp < max && r.res.meds > 0 ? `<button class="link" data-act="heal" data-sid="${s.id}">${ICON.meds} use medicine (+50)</button>` : ''}</div>
              <select data-task="${s.id}">
                ${tasks.map((t) => `<option value="${t.id}" ${t.id === s.task ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
              </select>
              <div class="tasknote">${esc(LC.Day.hint(r, s))}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="side-foot">
        <div class="upkeep ${r.res.food < need ? 'bad' : ''}">${ICON.food} The camp eats <b>${need}</b> food today. You have <b>${r.res.food}</b>.${r.res.food < need ? ' Someone will go hungry!' : ''}</div>
        <button class="btn primary wide" data-act="sendout">Send out the crew →</button>
      </div>`;
    const body = side.querySelector('.side-body');
    if (body) body.scrollTop = scroll;
    paintPortraits(side, r.survivors);
  };

  // ---------- report & events ----------
  UI.showReport = function (rep, cb) {
    const r = run();
    const gainStr = RES_KEYS.filter((k) => rep.gains[k] > 0).map((k) => `<span class="gain">${ICON[k]}+${rep.gains[k]}</span>`).join('') || '<span class="muted">nothing</span>';
    openModal(`
      <h2>Evening Report</h2>
      <p class="muted">Day ${r.night}. The crew returns as the light fades.</p>
      <ul class="report">
        ${rep.lines.map((l) => `<li class="${l.kind}"><b>${esc(l.who)}</b> ${esc(l.text)}</li>`).join('')}
      </ul>
      <div class="gains"><span class="muted">Brought home:</span> ${gainStr}</div>
      <div class="upkeep ${rep.short > 0 ? 'bad' : ''}">${ICON.food} The camp ate ${rep.eaten} food.${rep.short > 0 ? ' There was not enough. ' + (rep.starving.length ? esc(rep.starving.join(', ')) + ' went hungry (-25% health).' : '') : ''}</div>
      ${rep.deaths.length ? `<div class="memorial">✝ Lost today: ${esc(rep.deaths.join(', '))}</div>` : ''}
      <div class="modal-foot"><button class="btn primary" id="rep-ok">Continue</button></div>
    `);
    $('rep-ok').onclick = () => { A.play('click'); closeModal(); cb(); };
    UI.tickRes(true);
  };

  UI.showEvent = function (ev, cb) {
    openModal(`
      <div class="event">
        ${ev.person ? portrait(ev.person, 128) : ''}
        <div><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p></div>
      </div>
      <div class="options">
        ${ev.options.map((o, i) => `<button class="btn option" data-opt="${i}" ${o.enabled ? '' : 'disabled'}><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</button>`).join('')}
      </div>
    `);
    const card = $('modal-card');
    if (ev.person) paintPortraits(card, [ev.person]);
    card.querySelectorAll('[data-opt]').forEach((b) => {
      b.onclick = () => {
        const o = ev.options[+b.dataset.opt];
        if (!o || !o.enabled) return;
        A.play('click');
        const msg = o.act();
        closeModal();
        if (msg) UI.toast(msg, 'neutral');
        UI.tickRes(true);
        cb();
      };
    });
  };

  // ---------- dusk ----------
  UI.showDusk = function () {
    hideAll(); closeModal();
    const r = run();
    setHud('Dusk ' + r.night, '🌆 <b>Dusk.</b> Build and prepare. Night ' + r.night + ' is coming.', 'dusk');
    $('side').classList.remove('hidden');
    UI.renderDusk();
  };

  UI.renderDusk = function () {
    const r = run();
    const side = $('side');
    const items = LC.Build.list(r);
    const fc = LC.Night.forecast(r);
    const alive = G.alive(r);
    const scroll = side.querySelector('.side-body') ? side.querySelector('.side-body').scrollTop : 0;
    side.innerHTML = `
      <div class="side-head"><h2>Dusk<span>Before night ${r.night}</span></h2>
        <div class="forecast ${fc.boss ? 'boss' : ''}">
          ${fc.boss ? '<b>☠ BOSS NIGHT: an Ash Colossus will come.</b><br>' : ''}
          Expect about <b>${fc.approx}</b> attackers: ${esc(fc.types.join(', '))}.
          ${fc.raiders ? '<br><b>The raiders rang the bells:</b> more of them tonight.' : ''}
          ${fc.wolves ? '<br><b>Wolves</b> are circling the camp.' : ''}
        </div>
      </div>
      <div class="side-body">
        <div class="section-title">Build & prepare</div>
        ${items.map((it) => `<div class="bitem ${it.done ? 'done' : ''}">
            <div class="bdesc"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></div>
            <div class="bact">
              ${it.done ? `<span class="tag-done">${it.doneLabel}</span>` : `<div class="costs">${costHtml(it.cost, r.res)}</div>
              <button class="btn small ${it.afford ? 'primary' : ''}" data-act="build" data-id="${it.id}" ${it.afford ? '' : 'disabled'}>${it.id === 'stoke' ? 'Stoke' : it.id === 'repair' ? 'Repair' : 'Build'}</button>`}
            </div>
          </div>`).join('')}
        <div class="section-title">Survivors</div>
        ${alive.map((s) => {
          const max = G.maxHp(r, s);
          return `<div class="mini">
            ${portrait(s, 64)}
            <div class="mini-info"><b>${esc(s.name)}</b> <span class="role" style="color:${LC.ROLES[s.role].color}">${LC.ROLES[s.role].name} ${s.lvl}</span>
              <div class="hp"><i style="width:${Math.round(s.hp / max * 100)}%" class="${s.hp / max < 0.35 ? 'low' : ''}"></i></div></div>
            ${s.hp < max && r.res.meds > 0 ? `<button class="btn small" data-act="heal" data-sid="${s.id}" title="Use 1 medicine: +50 health">${ICON.meds}</button>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="side-foot">
        <button class="btn primary danger wide" data-act="night">🔥 Begin Night ${r.night}</button>
      </div>`;
    const body = side.querySelector('.side-body');
    if (body) body.scrollTop = scroll;
    paintPortraits(side, r.survivors);
    UI.tickRes(true);
  };

  // ---------- night ----------
  UI.showNight = function () {
    hideAll(); closeModal();
    const r = run();
    const st = S().night;
    setHud('Night ' + r.night, '', 'night');
    for (const id of ['roster', 'firebar', 'speed', 'clock']) $(id).classList.remove('hidden');
    UI.rosterSig = '';
    UI.syncSpeed();
    if (r.night <= 2) {
      const h = $('hint');
      h.classList.remove('hidden');
      h.innerHTML = '<b>Tip:</b> click a survivor, then click the ground to move them or a watchtower to man it. Click the fire or press <kbd>F</kbd> to add wood.';
    }
    UI.nightBanner(st);
    UI.tickNight(true);
  };

  UI.nightBanner = function (st) {
    const r = run();
    const b = $('hud-banner');
    const left = LC.Night.remaining(st);
    b.innerHTML = st.dawn
      ? '🌅 <b>Dawn breaks.</b> The dead are retreating.'
      : (st.boss ? '☠ <b>BOSS NIGHT ' + r.night + '</b>' : '⚠ <b>Night ' + r.night + '</b>') + ' · ' + left + ' left · heaviest from the <b>' + st.dir + '</b>';
  };

  UI.syncSpeed = function () {
    const st = S();
    document.querySelectorAll('#speed [data-act="speed"]').forEach((b) => b.classList.toggle('on', !st.paused && +b.dataset.v === st.speed));
    const p = document.querySelector('#speed [data-act="pause"]');
    if (p) p.classList.toggle('on', st.paused);
    $('paused').classList.toggle('hidden', !(st.paused && st.run && st.run.phase === 'night'));
  };

  let tAcc = 0;
  UI.tick = function (dt) {
    const st = S();
    if (st.screen !== 'run' || !st.run) return;
    tAcc += dt;
    if (tAcc < 0.1) return;
    tAcc = 0;
    UI.tickRes(false);
    if (st.run.phase === 'night' && st.night) UI.tickNight(false);
  };

  UI.tickNight = function () {
    const r = run();
    const st = S().night;
    if (!r || !st) return;
    const fmax = G.fireMax(r);
    const frac = U.clamp(r.fireFuel / fmax, 0, 1);
    const fill = $('fb-fill');
    fill.style.width = (frac * 100).toFixed(1) + '%';
    $('firebar').classList.toggle('low', frac < 0.2);
    const secsLeft = r.fireFuel / G.burnRate(r);
    $('fb-text').textContent = Math.round(frac * 100) + '% · burns out in ' + U.fmtTime(secsLeft);
    $('clock-time').textContent = st.dawn ? 'Dawn' : U.fmtTime(st.len - st.t);
    $('clock-left').innerHTML = ICON.skull + LC.Night.remaining(st) + ' left';
    UI.nightBanner(st);
    // roster
    const sig = r.survivors.map((s) => s.id + (s.alive ? 'a' : 'd')).join(',') + '|' + S().sel;
    const ro = $('roster');
    if (sig !== UI.rosterSig) {
      UI.rosterSig = sig;
      ro.innerHTML = '<div class="kicker">SURVIVORS</div>' + r.survivors.map((s) => `
        <div class="rrow ${s.alive ? '' : 'dead'} ${S().sel === s.id ? 'sel' : ''}" ${s.alive ? `data-act="sel" data-sid="${s.id}"` : ''}>
          ${portrait(s, 64)}
          <div class="rinfo"><b>${esc(s.name)}</b><small style="color:${LC.ROLES[s.role].color}">${LC.ROLES[s.role].name} · Lv ${s.lvl}</small>
            <div class="hp"><i data-hp="${s.id}"></i></div><small class="status" data-st="${s.id}"></small></div>
        </div>`).join('');
      paintPortraits(ro, r.survivors);
    }
    for (const s of r.survivors) {
      const bar = ro.querySelector('[data-hp="' + s.id + '"]');
      if (bar) {
        const f = s.alive ? s.hp / G.maxHp(r, s) : 0;
        bar.style.width = Math.round(f * 100) + '%';
        bar.classList.toggle('low', f < 0.35);
      }
      const stEl = ro.querySelector('[data-st="' + s.id + '"]');
      if (stEl) stEl.textContent = LC.Night.status(r, s);
    }
  };

  // ---------- dawn, perks, game over ----------
  UI.showDawn = function (r, sum, info, cb) {
    for (const id of ['roster', 'firebar', 'speed', 'clock', 'hint', 'paused']) $(id).classList.add('hidden');
    openModal(`
      <div class="dawn-head">🌅</div>
      <h2 class="center">Night ${r.night - 1} survived</h2>
      <div class="stats3">
        <div>${ICON.skull}<b>${sum.kills}</b><small>killed tonight</small></div>
        <div>${ICON.wood}<b>${Math.floor(r.fireFuel)}</b><small>fuel left</small></div>
        <div><span class="big-num">${G.alive(r).length}</span><small>survivors</small></div>
      </div>
      ${info.fallen.length ? `<div class="memorial">✝ Fallen tonight: ${esc(info.fallen.join(', '))}</div>` : '<p class="center muted">Everyone made it through the night.</p>'}
      ${info.newSeason ? `<p class="center season">${seasonLine(G.season(r))}</p>` : ''}
      ${info.perkDue ? '<p class="center gold">Your camp has grown more experienced. Choose a perk.</p>' : ''}
      <div class="modal-foot"><button class="btn primary" id="dawn-ok">Greet the morning</button></div>
    `);
    $('dawn-ok').onclick = () => { A.play('click'); closeModal(); cb(); };
  };

  function seasonLine(se) {
    const lines = [
      '🍂 Autumn returns. The forest grows quiet.',
      '❄ Winter has come. The fire burns hungrier and food is scarce.',
      '🌱 Spring. The snow melts and rain comes.',
      '☀ Summer. Long days and plenty of game to hunt.',
    ];
    return lines[se.idx] + (se.year > 1 ? ' (Year ' + U.roman(se.year) + ': the dead grow stronger.)' : '');
  }

  UI.showPerks = function (choices, cb) {
    openModal(`
      <h2 class="center">Choose a Perk</h2>
      <p class="center muted">Perks last for the rest of this run.</p>
      <div class="perks">
        ${choices.map((p) => `<button class="perk" data-perk="${p.id}"><span class="picon">${p.icon}</span><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></button>`).join('')}
      </div>
    `);
    $('modal-card').querySelectorAll('[data-perk]').forEach((b) => {
      b.onclick = () => { A.play('level'); closeModal(); cb(b.dataset.perk); };
    });
  };

  UI.showGameOver = function (r, info) {
    for (const id of ['side', 'roster', 'firebar', 'speed', 'clock', 'hint', 'paused']) $(id).classList.add('hidden');
    $('hud-banner').innerHTML = '☠ <b>The camp has fallen.</b>';
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
      <div class="modal-foot">
        <button class="btn" data-act="menu">Main menu</button>
        <button class="btn primary" data-act="again">Try again</button>
      </div>
    `);
  };

  // ---------- modal helpers ----------
  function openModal(html) {
    $('modal-card').innerHTML = html;
    $('modal').classList.remove('hidden');
    $('modal-card').scrollTop = 0;
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modal-card').innerHTML = ''; }
  UI.closeModal = closeModal;
  UI.modalOpen = () => !$('modal').classList.contains('hidden');

  function confirmBox(title, text, okLabel, ok) {
    openModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="modal-foot"><button class="btn" data-act="close">Cancel</button><button class="btn primary danger" id="cf-ok">${esc(okLabel)}</button></div>`);
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
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3800);
  };
  UI.clearToasts = () => { const b = $('toasts'); if (b) b.innerHTML = ''; };
})(window.LC);
