/* Last Camp — boot, main loop with the day/night clock, input, camera, game flow */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, B = LC.Bld, A = LC.Audio, Geo = LC.Geo;
  const R = LC.Render;

  const S = (LC.state = {
    screen: 'menu', run: null, demo: null, night: null,
    speed: 1, paused: false, sel: null, selB: null, hover: null, place: null,
    amb: 1, time: 0, meta: null, crackleT: 0, errors: 0, queue: [], keys: {},
  });

  // ---------- flow ----------
  const F = (LC.Flow = {});

  function enterRun(run) {
    LC.FX.clear();
    LC.UI.clearToasts();
    S.run = run; S.screen = 'run'; S.night = null; S.sel = null; S.selB = null; S.place = null;
    S.speed = 1; S.paused = false; S.queue = [];
    LC.UI.closeDrawer();
    R.resetCamera();
    LC.UI.showGame();
  }

  F.newRun = function () {
    if (LC.App) LC.App.goLandscape();
    G.clearSave();
    const run = G.newRun(S.meta);
    enterRun(run);
    G.save(run);
    LC.UI.toast('Day 1. Assign your people in 👥 Tasks and grow the camp with 🔨 Build. Night falls at 20:00.', 'neutral');
  };

  F.continueRun = function () {
    if (LC.App) LC.App.goLandscape();
    const r = G.load();
    if (!r) { LC.UI.toast('No saved camp found.', 'bad'); LC.UI.showMenu(); return; }
    for (const s of r.survivors) G.placeIdle(s);
    enterRun(r);
    LC.UI.toast('Welcome back. Day ' + r.night + ', ' + String(Math.floor(G.hour(r))).padStart(2, '0') + ':00.', 'good');
  };

  F.toMenu = function () {
    S.screen = 'menu'; S.run = null; S.night = null; S.sel = null; S.selB = null; S.place = null; S.paused = false; S.queue = [];
    LC.FX.clear();
    LC.UI.clearToasts();
    LC.UI.closeDrawer();
    R.resetCamera();
    LC.UI.showMenu();
  };

  F.togglePause = function () {
    if (S.screen !== 'run') return;
    S.paused = !S.paused;
    LC.UI.syncSpeed();
  };

  F.startPlacing = function (type) { S.place = { type, hover: null }; S.sel = null; S.selB = null; };
  F.placeAt = function (spot) {
    const run = S.run;
    const type = S.place.type;
    const b = B.place(run, type, spot);
    S.place = null;
    if (!b) { LC.UI.toast('You cannot build that there.', 'bad'); A.play('deny'); return; }
    A.play('build');
    const crew = G.alive(run).some((s) => s.task === 'build');
    LC.UI.toast(B.def(type).name + ' placed. ' + (crew ? 'Your construction crew is on it.' : 'Assign someone to the Construction crew to build it!'), crew ? 'good' : 'bad');
    G.log(run, 'Started building a ' + B.def(type).name + '.', 'neutral');
    S.selB = b.id;
    G.save(run);
    LC.UI.refreshPanels(true);
  };

  F.quickRepair = function (kind) {
    const run = S.run;
    if (!run || S.night) return false;
    const segs = [];
    for (let i = 0; i < C.SEG; i++) if (Geo.isGate(i) === (kind === 'gate')) segs.push(i);
    segs.sort((a, b) => run.wallHp[a] / G.segMax(run, a) - run.wallHp[b] / G.segMax(run, b));
    let missing = 0;
    for (const i of segs) missing += G.segMax(run, i) - run.wallHp[i];
    const use = Math.min(Math.floor(run.res.wood), Math.ceil(missing / 250));
    if (use < 1) return false;
    run.res.wood -= use;
    let pool = use * 250;
    for (const i of segs) {
      const add = Math.min(pool, G.segMax(run, i) - run.wallHp[i]);
      if (add <= 0) continue;
      run.wallHp[i] += add; pool -= add;
      if (run.wallHp[i] >= G.segMax(run, i) * 0.3) run.wallBroken[i] = false;
      if (pool <= 0) break;
    }
    A.play('build');
    LC.UI.toast('Repaired with ' + use + ' wood.', 'good');
    G.save(run);
    return true;
  };

  function beginNight() {
    const run = S.run;
    S.night = LC.Night.start(run);
    S.place = null;
    A.play(S.night.boss ? 'boss' : 'horn');
    LC.UI.toast('Night ' + run.night + ' has fallen. Threat: ' + S.night.threat.label + '. Keep the fire burning!', S.night.threat.level >= 3 ? 'bad' : 'neutral');
    G.log(run, 'Night ' + run.night + ' fell (threat: ' + S.night.threat.label + ').', 'neutral');
  }

  function finishNight() {
    const run = S.run, st = S.night;
    S.night = null;
    const lost = st.lost.slice();
    const info = G.dawn(run);
    A.play('dawn');
    const msg = 'Night ' + (run.night - 1) + ' survived · ' + st.kills + ' killed' + (lost.length ? ' · lost: ' + lost.join(', ') : ' · everyone made it');
    LC.UI.toast(msg, lost.length ? 'bad' : 'good');
    G.log(run, msg + '.', lost.length ? 'bad' : 'good');
    if (S.sel && !run.survivors.some((s) => s.id === S.sel)) S.sel = null;
    if (info.perkDue) {
      const ch = G.perkChoices(run);
      if (ch.length) S.queue.push({ type: 'perk', choices: ch });
    }
  }

  F.gameOver = function (reason) {
    const r = S.run;
    if (!r || r.phase === 'gameover') return;
    r.phase = 'gameover';
    S.paused = false; S.place = null;
    const embers = G.embersFor(r);
    const m = S.meta;
    const nights = r.stats.nightsSurvived;
    const newBest = nights > m.best;
    if (newBest) m.best = nights;
    m.embers += embers; m.runs += 1; m.totalKills += r.stats.kills;
    G.saveMeta(m);
    G.clearSave();
    A.play('gameover');
    LC.UI.clearToasts();
    LC.UI.closeDrawer();
    S.sel = null; S.selB = null;
    LC.UI.showGameOver(r, { reason, embers, newBest });
  };

  function handleHour(h) {
    const run = S.run;
    if (h === C.DAY_START && S.night) finishNight();
    const out = LC.Town.onHour(run, S, h);
    for (const o of out) {
      if (o.type === 'toast') LC.UI.toast(o.text, o.kind);
      else if (o.type === 'save') G.save(run);
      else if (o.type === 'event') S.queue.push(o);
      else if (o.type === 'night') beginNight();
      else if (o.type === 'dawn' && S.night) LC.Night.beginDawn(S.night);
    }
    if (!G.alive(run).length) { F.gameOver('No one is left in the camp.'); return 'stop'; }
    return null;
  }

  // advance the world by sdt simulated seconds
  function advance(sdt) {
    const run = S.run;
    const before = run.clock;
    run.clock += sdt / C.HOUR;
    if (S.night) {
      const res = LC.Night.update(run, S.night, sdt);
      if (res) { F.gameOver(res.reason); return 'stop'; }
    } else {
      for (const s of run.survivors) if (s.alive) LC.Town.updateWorker(run, s, sdt);
      if (!G.alive(run).length) { F.gameOver('No one is left in the camp.'); return 'stop'; }
    }
    LC.FX.update(sdt);
    for (const tr of LC.Scene.trees) if (tr.shake > 0) tr.shake = Math.max(0, tr.shake - sdt);
    for (const rk of LC.Scene.rocks) if (rk.shake > 0) rk.shake = Math.max(0, rk.shake - sdt);
    const h0 = Math.floor(before), h1 = Math.floor(run.clock);
    for (let H = h0 + 1; H <= h1; H++) {
      if (handleHour(((H % 24) + 24) % 24) === 'stop') return 'stop';
      if (run.phase !== 'play') return 'stop';
    }
    return null;
  }

  function ambFor(h) {
    if (h >= 7 && h < 17) return 0;
    if (h >= 17 && h < 20) return (h - 17) / 3;
    if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
    return 1;
  }

  function processQueue() {
    if (LC.UI.modalOpen() || !S.queue.length || S.screen !== 'run' || !S.run || S.run.phase !== 'play') return;
    const q = S.queue.shift();
    if (q.type === 'event') LC.UI.showEvent(q.ev, () => { G.save(S.run); LC.UI.refreshPanels(true); });
    else if (q.type === 'perk') LC.UI.showPerks(q.choices, (id) => {
      S.run.perks.push(id);
      const p = LC.PERKS.find((x) => x.id === id);
      LC.UI.toast('Perk gained: ' + p.name + '.', 'good');
      G.log(S.run, 'Perk gained: ' + p.name + '.', 'good');
      G.save(S.run);
    });
  }

  // ---------- idle wandering for the menu backdrop ----------
  function demoWander(r, dt) {
    for (const s of r.survivors) {
      if (!s.job || s.job.st !== 'w') {
        const p = Geo.pt(Math.random() * U.TAU, U.rand(0.12, 0.3));
        s.job = { st: 'w', x: p.x, y: p.y, wait: U.rand(1, 4) };
      }
      const j = s.job;
      if (j.wait > 0) { j.wait -= dt; s.moving = false; continue; }
      if (LC.Town.step(s, j.x, j.y, 30, dt)) { s.job = null; s.face = C.CX >= s.x ? 1 : -1; }
    }
  }

  // ---------- main loop ----------
  function update(dt) {
    // keyboard panning
    const k = S.keys;
    const px = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0);
    const py = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
    if (px || py) R.pan(px * 600 * dt, py * 600 * dt);

    if (S.screen === 'run' && S.run) {
      const run = S.run;
      if (run.phase === 'play' && !S.paused && !LC.UI.modalOpen()) {
        let sim = dt * S.speed;
        while (sim > 1e-6) {
          const step = Math.min(0.025, sim);
          sim -= step;
          if (advance(step) === 'stop') break;
        }
      } else if (run.phase === 'gameover' && S.night) {
        for (const s of run.survivors) if (!s.alive) s.deathT = (s.deathT || 0) + dt;
      }
      S.amb = ambFor(G.hour(run));
      processQueue();
    } else {
      const d = S.demo;
      demoWander(d, dt);
      LC.FX.update(dt);
      S.amb = 0.85;
    }

    const r = S.run || S.demo;
    const night = !!S.night || S.screen === 'menu';
    const frac = U.clamp(r.fireFuel / G.fireMax(r), 0, 1);
    if (frac > 0 && !S.paused) {
      if (Math.random() < dt * (night ? 3 + 6 * frac : 1.5)) LC.FX.burst(C.CX, C.CY - 18, 'spark', 1);
      if (night && frac < 0.25 && Math.random() < dt * 3) LC.FX.burst(C.CX, C.CY - 20, 'smoke', 1);
      S.crackleT -= dt;
      if (S.crackleT <= 0 && S.amb > 0.3 && R.onScreen(C.CX, C.CY, 200)) { S.crackleT = U.rand(0.08, 0.5); A.play('crackle'); }
    }
    if (!S.paused) R.updateWeather(dt, r, S.amb);
  }

  let last = 0;
  function loop(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    S.time += dt;
    try {
      update(dt);
      R.draw(S);
      LC.UI.tick(dt);
    } catch (err) {
      S.errors++;
      if (S.errors < 5) console.error(err);
    }
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  function screenPos(e) {
    const rect = R.cv.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * C.W, y: (e.clientY - rect.top) / rect.height * C.H };
  }
  function pickSurvivor(r, p, tol) {
    const k = tol || 1;
    let best = null, bd = Infinity;
    for (const s of r.survivors) {
      if (!s.alive || s.hidden) continue;
      const by = s.onTower ? s.y - LC.Draw.TOWER_H - 5 : s.y;
      if (Math.abs(p.x - s.x) <= 16 * k && p.y <= by + 5 * k && p.y >= by - 62 - 8 * (k - 1)) {
        const d = Math.abs(p.x - s.x) + Math.abs(p.y - (by - 29));
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }
  function spotAt(p, tol) {
    if (!S.place) return null;
    const d = B.def(S.place.type);
    const rad = (d.place === 'plot' ? 55 : 30) * (tol || 1);
    let best = null, bd = rad;
    for (const sp of R.freeSpots(S.run, S.place.type)) {
      const dd = Math.hypot(p.x - sp.x, (p.y - sp.y) * 1.4);
      if (dd < bd) { bd = dd; best = sp; }
    }
    return best;
  }

  // pointer input: mouse, touch and pen. One finger taps or drags, two fingers pinch-zoom.
  const pts = new Map();
  let down = null, pinch = null;
  LC.input = { touch: false };
  function cancelOrDeselect() {
    if (S.place) { S.place = null; return; }
    S.sel = null; S.selB = null; LC.UI.refreshPanels(true);
  }
  function onPointerDown(e) {
    A.init();
    const mouse = e.pointerType === 'mouse';
    LC.input.touch = !mouse;
    if (mouse && e.button === 2) { cancelOrDeselect(); return; }
    if (mouse && e.button !== 0 && e.button !== 1) return;
    try { R.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const sp = screenPos(e);
    pts.set(e.pointerId, sp);
    if (pts.size === 1) down = { x: sp.x, y: sp.y, drag: false, btn: mouse ? e.button : 0, touch: !mouse, id: e.pointerId };
    else if (pts.size === 2) {
      down = null;
      const v = Array.from(pts.values());
      pinch = { d: Math.max(1, Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)), cx: (v[0].x + v[1].x) / 2, cy: (v[0].y + v[1].y) / 2 };
    }
  }
  function onPointerMove(e) {
    const sp = screenPos(e);
    if (pts.has(e.pointerId)) pts.set(e.pointerId, sp);
    if (pinch && pts.size >= 2) {
      const v = Array.from(pts.values());
      const d = Math.max(1, Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)), cx = (v[0].x + v[1].x) / 2, cy = (v[0].y + v[1].y) / 2;
      R.pan(pinch.cx - cx, pinch.cy - cy);
      R.zoomAt(cx, cy, d / pinch.d);
      pinch = { d, cx, cy };
      return;
    }
    if (down && e.pointerId === down.id && (down.btn === 0 || down.btn === 1)) {
      const dx = sp.x - down.x, dy = sp.y - down.y;
      if (!down.drag && Math.hypot(dx, dy) > (down.touch ? 12 : 6)) down.drag = true;
      if (down.drag) { R.pan(-dx, -dy); down.x = sp.x; down.y = sp.y; R.cv.style.cursor = 'grabbing'; return; }
    }
    if (e.pointerType !== 'mouse' || down) return; // hover is for mice only
    const r = S.screen === 'run' ? S.run : null;
    if (!r) { S.hover = null; return; }
    const p = R.s2w(sp.x, sp.y);
    if (S.place) { const s = spotAt(p); S.place.hover = s ? s.id : null; R.cv.style.cursor = s ? 'pointer' : 'not-allowed'; return; }
    const s = pickSurvivor(r, p);
    S.hover = s ? s.id : null;
    const b = !s && R.hitBuilding(r, p.x, p.y);
    R.cv.style.cursor = s || b || (S.night && S.sel) ? 'pointer' : 'grab';
  }
  function onPointerUp(e) {
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) pinch = null; down = null; return; }
    if (!down || e.pointerId !== down.id) return;
    const d = down;
    down = null;
    R.cv.style.cursor = 'default';
    if (d.drag || d.btn !== 0) return;
    tap(d.x, d.y, d.touch);
  }
  function onPointerCancel(e) { pts.delete(e.pointerId); pinch = null; down = null; }

  function tap(sx, sy, touch) {
    const r = S.screen === 'run' ? S.run : null;
    if (!r || r.phase !== 'play' || LC.UI.modalOpen()) return;
    const tol = touch ? 1.7 : 1;
    const p = R.s2w(sx, sy);
    if (S.place) {
      const sp = spotAt(p, touch ? 1.3 : 1);
      if (sp) F.placeAt(sp.id);
      else { LC.UI.toast(touch ? 'Tap one of the highlighted spots (tap Build again to cancel).' : 'Click one of the highlighted spots (right-click to cancel).', 'neutral'); A.play('deny'); }
      return;
    }
    const s = pickSurvivor(r, p, tol);
    if (s) { S.sel = S.sel === s.id ? null : s.id; S.selB = null; A.play('click'); LC.UI.refreshPanels(true); return; }
    const sel = S.sel ? r.survivors.find((o) => o.id === S.sel && o.alive) : null;
    if (S.night && sel) {
      const tower = LC.Night.towerAt(r, p.x, p.y);
      const b = R.hitBuilding(r, p.x, p.y);
      if (tower || !b || b.type === 'wall') {
        const res = LC.Night.order(r, S.night, sel, p.x, p.y);
        if (res === 'tower') LC.UI.toast(sel.name + ' heads up the archer tower.', 'neutral');
        A.play('click');
        LC.FX.burst(p.x, p.y, 'dust', 4);
        return;
      }
    }
    const b = R.hitBuilding(r, p.x, p.y);
    if (b) { S.selB = S.selB === b.id ? null : b.id; S.sel = null; A.play('click'); LC.UI.refreshPanels(true); return; }
    if (S.sel || S.selB) { S.sel = null; S.selB = null; LC.UI.refreshPanels(true); }
  }
  function onWheel(e) {
    e.preventDefault();
    const sp = screenPos(e);
    R.zoomAt(sp.x, sp.y, Math.pow(1.0015, -e.deltaY));
  }
  function onKey(e) {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'm') { A.setMuted(!A.muted); LC.UI.syncMute(); return; }
    if (S.screen !== 'run' || !S.run || S.run.phase !== 'play') return;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) { S.keys[k] = true; e.preventDefault(); return; }
    if (LC.UI.modalOpen()) return;
    A.init();
    if (k === ' ' || k === 'p') { e.preventDefault(); F.togglePause(); }
    else if (k === 'f') LC.Night.stoke(S.run);
    else if (k === '1' || k === '2' || k === '3') { S.speed = +k; S.paused = false; LC.UI.syncSpeed(); }
    else if (k === 't') LC.UI.toggleDrawer('tasks');
    else if (k === 'r') LC.UI.toggleDrawer('roles');
    else if (k === 'b') LC.UI.toggleDrawer('build');
    else if (k === 'l') LC.UI.toggleDrawer('log');
    else if (k === 'c') R.resetCamera();
    else if (k === 'Escape') {
      if (S.place) S.place = null;
      else if (LC.UI.drawer) LC.UI.closeDrawer();
      else { S.sel = null; S.selB = null; LC.UI.refreshPanels(true); }
    }
  }
  function onKeyUp(e) { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; S.keys[k] = false; }

  // keep the 720-unit-tall layout; on wide screens (phones in landscape) show more world instead of black bars
  function fit() {
    const stage = document.getElementById('stage');
    const vw = window.innerWidth, vh = window.innerHeight;
    C.W = Math.round(U.clamp(C.H * vw / vh, 1280, 1720));
    const s = Math.min(vw / C.W, vh / C.H);
    stage.style.width = C.W + 'px';
    R.cv.style.width = C.W + 'px';
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.round((vw - C.W * s) / 2) + 'px';
    stage.style.top = Math.round((vh - C.H * s) / 2) + 'px';
    R.resize(s);
    R.clampCam();
  }

  function makeDemo() {
    const d = G.newRun({ upg: { settlers: 2 } });
    d.phase = 'menu';
    d.clock = 22;
    const add = (type, extra, lvl) => d.buildings.push(Object.assign({ id: d.nextBid++, type, lvl, target: null, progress: 0, need: 0, started: 0 }, extra));
    add('tower', { slot: 2 }, 2); add('tower', { slot: 5 }, 3); add('tower', { slot: 6 }, 1);
    add('trap', { slot: 3 }, 1); add('trap', { slot: 6 }, 2);
    add('storehouse', { plot: 9 }, 2); add('quarry', { plot: 15 }, 1); add('workshop', { plot: 6 }, 2); add('infirmary', { plot: 3 }, 1);
    for (const s of d.survivors) { s.task = 'idle'; s.job = null; }
    return d;
  }

  function boot() {
    S.meta = G.loadMeta();
    A.muted = !!U.store.get('lastcamp.muted', false);
    const cv = document.getElementById('cv');
    R.init(cv);
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => setTimeout(fit, 250));
    S.demo = makeDemo();
    LC.UI.init();
    LC.UI.showMenu();
    if (LC.App) LC.App.onChange(() => { if (S.screen === 'menu' && !LC.UI.modalOpen()) LC.UI.showMenu(); });
    LC.Cloud.onChange(() => {
      if (S.screen === 'menu') { S.meta = G.loadMeta(); if (!LC.UI.modalOpen()) LC.UI.showMenu(); }
      else LC.UI.syncCloud();
    });
    LC.Cloud.init().then(() => {
      if (LC.Cloud.user && S.screen === 'menu' && !LC.UI.modalOpen()) {
        const save = G.load();
        if (save) LC.UI.toast('Welcome back! Your camp on day ' + save.night + ' is ready.', 'good');
      }
    });
    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerCancel);
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !down) S.hover = null; });
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { S.keys = {}; });
    const saveOnLeave = () => { if (S.screen === 'run' && S.run && !S.night) G.save(S.run); LC.Cloud.flush(); };
    window.addEventListener('pagehide', saveOnLeave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveOnLeave(); });
    document.addEventListener('pointerdown', () => A.init(), { once: true });
    requestAnimationFrame(loop);
  }

  // test hooks (used by automated checks; harmless in play)
  LC.debug = {
    advance(hours) {
      const r = S.run;
      if (!r) return 'norun';
      const end = r.clock + hours;
      while (r.clock < end) {
        if (r.phase !== 'play') return 'gameover';
        if (LC.UI.modalOpen() || S.queue.length) return 'modal';
        if (advance(0.025) === 'stop') return r.phase === 'play' ? 'stop' : 'gameover';
      }
      return 'ok';
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.LC);
