/* Last Camp — boot, main loop, input and game flow */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, A = LC.Audio, Geo = LC.Geo;

  const S = (LC.state = {
    screen: 'menu', run: null, demo: null, night: null,
    speed: 1, paused: false, sel: null, hover: null,
    amb: 1, ambT: 1, time: 0, meta: null, crackleT: 0, errors: 0,
  });

  // ---------- flow ----------
  const F = (LC.Flow = {});

  F.newRun = function () {
    G.clearSave();
    LC.FX.clear();
    LC.UI.clearToasts();
    S.run = G.newRun(S.meta);
    S.screen = 'run'; S.night = null; S.sel = null; S.speed = 1; S.paused = false;
    S.amb = 0.15;
    F.startDay();
    LC.UI.toast('Day 1. Three survivors, one fire, and a long winter ahead.', 'neutral');
  };

  F.continueRun = function () {
    const r = G.load();
    if (!r) { LC.UI.toast('No saved camp found.', 'bad'); LC.UI.showMenu(); return; }
    LC.FX.clear();
    LC.UI.clearToasts();
    S.run = r; S.screen = 'run'; S.night = null; S.sel = null; S.speed = 1; S.paused = false;
    for (const s of r.survivors) G.placeIdle(s);
    if (r.phase === 'dusk') { S.amb = 0.45; F.toDusk(); } else { S.amb = 0.1; F.startDay(); }
  };

  F.startDay = function () {
    const r = S.run;
    r.phase = 'day';
    S.ambT = 0;
    S.night = null;
    for (const s of r.survivors) { if (!s.task) s.task = 'rest'; }
    G.save(r);
    LC.UI.showDay();
  };

  F.sendOut = function () {
    const r = S.run;
    if (!r || r.phase !== 'day') return;
    const rep = LC.Day.resolve(r);
    LC.UI.showReport(rep, () => {
      if (!G.alive(r).length) return F.gameOver('Nobody came back from the day\'s work.');
      const ev = LC.Day.rollEvent(r);
      if (ev) LC.UI.showEvent(ev, () => F.toDusk());
      else F.toDusk();
    });
  };

  F.toDusk = function () {
    const r = S.run;
    r.phase = 'dusk';
    S.ambT = 0.45;
    G.save(r);
    LC.UI.showDusk();
  };

  F.beginNight = function () {
    const r = S.run;
    if (!r || r.phase !== 'dusk') return;
    G.save(r); // dusk snapshot: quitting mid-night returns here
    r.phase = 'night';
    S.ambT = 1;
    S.night = LC.Night.start(r);
    S.sel = null; S.paused = false;
    LC.UI.showNight();
    A.play(S.night.boss ? 'boss' : 'horn');
    LC.UI.toast('Night ' + r.night + '. They are coming, mostly from the ' + S.night.dir + '.', 'bad');
  };

  F.togglePause = function () {
    if (!S.run || S.run.phase !== 'night') return;
    S.paused = !S.paused;
    LC.UI.syncSpeed();
  };

  F.dawn = function (sum) {
    const r = S.run;
    const info = G.dawn(r);
    S.night = null; S.sel = null; S.paused = false;
    r.phase = 'dawn';
    S.ambT = 0.2;
    A.play('dawn');
    LC.UI.showDawn(r, sum, info, () => {
      if (info.perkDue) {
        const ch = G.perkChoices(r);
        if (ch.length) {
          LC.UI.showPerks(ch, (id) => {
            r.perks.push(id);
            const p = LC.PERKS.find((x) => x.id === id);
            LC.UI.toast('Perk gained: ' + p.name + '.', 'good');
            F.startDay();
          });
          return;
        }
      }
      F.startDay();
    });
  };

  F.gameOver = function (reason) {
    const r = S.run;
    if (!r || r.phase === 'gameover') return;
    r.phase = 'gameover';
    r.lossReason = reason;
    S.ambT = 1;
    S.paused = false;
    const embers = G.embersFor(r);
    const m = S.meta;
    const nights = r.stats.nightsSurvived;
    const newBest = nights > m.best;
    if (newBest) m.best = nights;
    m.embers += embers;
    m.runs += 1;
    m.totalKills += r.stats.kills;
    G.saveMeta(m);
    G.clearSave();
    A.play('gameover');
    LC.UI.clearToasts();
    LC.UI.showGameOver(r, { reason, embers, newBest });
  };

  F.toMenu = function () {
    S.screen = 'menu'; S.run = null; S.night = null; S.sel = null; S.paused = false;
    S.ambT = 1;
    LC.FX.clear();
    LC.UI.clearToasts();
    LC.UI.showMenu();
  };

  // ---------- idle wandering in camp (day, dusk, menu) ----------
  function wander(r, dt) {
    for (const s of r.survivors) {
      if (!s.alive) continue;
      s.atk = Math.max(0, (s.atk || 0) - dt * 3);
      s.hurt = Math.max(0, (s.hurt || 0) - dt * 4);
      s.aimT = 0; s.working = false;
      if (s.wx === null || s.wx === undefined) {
        s.moving = false;
        s.wait -= dt;
        if (s.wait <= 0) {
          let p, tries = 0;
          do { p = Geo.pt(Math.random() * U.TAU, U.rand(0.25, 0.75)); tries++; } while (tries < 10 && U.dist(p.x, p.y, C.CX, C.CY) < 55);
          s.wx = p.x; s.wy = p.y;
        }
      } else {
        const arrived = LC.Night.moveTo(s, s.wx, s.wy, 34, dt, 0.85);
        if (arrived) { s.wx = null; s.wy = null; s.wait = U.rand(2, 6); s.moving = false; if (Math.random() < 0.6) s.face = C.CX >= s.x ? 1 : -1; }
      }
    }
  }

  // ---------- main loop ----------
  function update(dt) {
    const r = S.run || S.demo;
    S.amb += (S.ambT - S.amb) * Math.min(1, dt * 1.1);
    if (S.screen === 'menu') S.ambT = 1;

    if (S.screen === 'run' && r.phase === 'night' && S.night) {
      if (!S.paused && !LC.UI.modalOpen()) {
        let sim = dt * S.speed;
        while (sim > 1e-6) {
          const step = Math.min(0.025, sim);
          sim -= step;
          const res = LC.Night.update(r, S.night, step);
          LC.FX.update(step);
          if (res) {
            if (res.type === 'dawn') F.dawn({ kills: S.night.kills, lost: S.night.lost.slice() });
            else F.gameOver(res.reason);
            break;
          }
        }
      }
    } else {
      if (r.phase !== 'gameover') wander(r, dt);
      else for (const s of r.survivors) if (!s.alive) s.deathT = (s.deathT || 0) + dt;
      LC.FX.update(dt);
    }

    // fire ambience
    const frac = U.clamp(r.fireFuel / G.fireMax(r), 0, 1);
    if (frac > 0 && !(S.paused && r.phase === 'night')) {
      if (Math.random() < dt * (3 + 6 * frac)) LC.FX.burst(C.CX, C.CY - 18, 'spark', 1);
      if (frac < 0.25 && Math.random() < dt * 3) LC.FX.burst(C.CX, C.CY - 20, 'smoke', 1);
      S.crackleT -= dt;
      if (S.crackleT <= 0 && S.amb > 0.3) { S.crackleT = U.rand(0.08, 0.5); A.play('crackle'); }
    }
    if (!(S.paused && r.phase === 'night')) LC.Render.updateWeather(dt, r, S.amb);
  }

  let last = 0;
  function loop(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    S.time += dt;
    try {
      update(dt);
      LC.Render.draw(S);
      LC.UI.tick(dt);
    } catch (err) {
      S.errors++;
      if (S.errors < 5) console.error(err);
    }
    requestAnimationFrame(loop);
  }

  // ---------- input ----------
  function toWorld(e) {
    const rect = LC.Render.cv.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width * C.W, y: (e.clientY - rect.top) / rect.height * C.H };
  }

  function pickSurvivor(r, p) {
    let best = null, bd = Infinity;
    for (const s of r.survivors) {
      if (!s.alive) continue;
      const by = s.onTower ? s.y - LC.Draw.TOWER_H - 5 : s.y;
      if (Math.abs(p.x - s.x) <= 16 && p.y <= by + 5 && p.y >= by - 62) {
        const d = Math.abs(p.x - s.x) + Math.abs(p.y - (by - 29));
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }

  const nearFire = (p) => Math.abs(p.x - C.CX) < 34 && p.y > C.CY - 55 && p.y < C.CY + 16;

  function onMove(e) {
    const r = S.screen === 'run' ? S.run : null;
    if (!r) { S.hover = null; return; }
    const p = toWorld(e);
    const s = pickSurvivor(r, p);
    S.hover = s ? s.id : null;
    let pointer = !!s;
    if (r.phase === 'night' && (nearFire(p) || S.sel)) pointer = true;
    LC.Render.cv.style.cursor = pointer ? 'pointer' : 'default';
  }

  function onDown(e) {
    A.init();
    const r = S.screen === 'run' ? S.run : null;
    if (!r || r.phase !== 'night' || !S.night || LC.UI.modalOpen()) return;
    if (e.button === 2) { S.sel = null; return; }
    if (e.button !== 0) return;
    const p = toWorld(e);
    const s = pickSurvivor(r, p);
    if (s) { S.sel = S.sel === s.id ? null : s.id; A.play('click'); return; }
    const sel = S.sel ? r.survivors.find((o) => o.id === S.sel && o.alive) : null;
    if (sel && !nearFire(p)) {
      const res = LC.Night.order(r, S.night, sel, p.x, p.y);
      if (res === 'tower') LC.UI.toast(sel.name + ' heads up the watchtower.', 'neutral');
      A.play('click');
      LC.FX.burst(p.x, p.y, 'dust', 4);
      return;
    }
    if (nearFire(p)) LC.Night.stoke(r);
  }

  function onKey(e) {
    if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
    const r = S.screen === 'run' ? S.run : null;
    const k = e.key.toLowerCase();
    if (k === 'm') { A.setMuted(!A.muted); LC.UI.syncMute(); return; }
    if (!r || r.phase !== 'night' || LC.UI.modalOpen()) return;
    A.init();
    if (k === ' ' || k === 'p') { e.preventDefault(); F.togglePause(); }
    else if (k === 'f') LC.Night.stoke(r);
    else if (k === '1' || k === '2' || k === '3') { S.speed = +k; S.paused = false; LC.UI.syncSpeed(); }
    else if (k === 'escape') S.sel = null;
  }

  function fit() {
    const stage = document.getElementById('stage');
    const s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.round((window.innerWidth - C.W * s) / 2) + 'px';
    stage.style.top = Math.round((window.innerHeight - C.H * s) / 2) + 'px';
    LC.Render.resize(s);
  }

  function makeDemo() {
    const d = G.newRun({ upg: { settlers: 2 } });
    d.phase = 'menu';
    d.towers = 2; d.traps = 3; d.armory = 1; d.tents = 3;
    d.night = 1;
    return d;
  }

  function boot() {
    S.meta = G.loadMeta();
    A.muted = !!U.store.get('lastcamp.muted', false);
    const cv = document.getElementById('cv');
    LC.Render.init(cv);
    fit();
    window.addEventListener('resize', fit);
    S.demo = makeDemo();
    LC.UI.init();
    LC.UI.showMenu();
    // online accounts: restore the remembered session, then show that player's save
    LC.Cloud.onChange(() => {
      if (S.screen === 'menu') {
        S.meta = G.loadMeta();
        if (!LC.UI.modalOpen()) LC.UI.showMenu();
      } else LC.UI.syncCloud();
    });
    LC.Cloud.init().then(() => {
      if (LC.Cloud.user && S.screen === 'menu' && !LC.UI.modalOpen()) {
        const save = G.load();
        if (save) LC.UI.toast('Welcome back! Your camp on ' + (save.phase === 'dusk' ? 'Dusk ' : 'Day ') + save.night + ' is ready.', 'good');
      }
    });
    cv.addEventListener('mousemove', onMove);
    cv.addEventListener('mousedown', onDown);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', () => A.init(), { once: true });
    requestAnimationFrame(loop);
  }

  // test hooks (used for automated checks; harmless in play)
  LC.debug = {
    simulate(seconds) {
      const r = S.run;
      if (!r || r.phase !== 'night' || !S.night) return null;
      let t = 0;
      while (t < seconds) {
        const res = LC.Night.update(r, S.night, 0.025);
        LC.FX.update(0.025);
        t += 0.025;
        if (res) {
          if (res.type === 'dawn') F.dawn({ kills: S.night.kills, lost: S.night.lost.slice() });
          else F.gameOver(res.reason);
          return res.type;
        }
      }
      return 'running';
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.LC);
