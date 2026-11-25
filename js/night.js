/* Last Camp — night defence: random attackers, survivor combat AI */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, B = LC.Bld, Geo = LC.Geo, A = LC.Audio;

  const N = (LC.Night = {});
  const E = () => LC.ENEMIES;
  const SURV_MAX_D = 0.93;
  const WALL_STOP_D = 1.03;

  // expected strength of tonight's attackers (before the random roll)
  N.budget = function (run) {
    const n = run.night;
    let b = 4 + n * 1.6 + Math.pow(n, 1.35) * 0.3;
    if (n <= 6) b = Math.min(b, 2 + 2.6 * G.defensePower(run)); // early nights stay within what the camp can handle
    if (run.flags.raiders) b *= 1.35;
    return b;
  };

  N.forecast = function (run) {
    const b = N.budget(run);
    const r = b / (2 + 3 * G.defensePower(run));
    const level = r < 0.55 ? 1 : r < 0.85 ? 2 : r < 1.15 ? 3 : 4;
    return { level, label: ['', 'Low', 'Moderate', 'High', 'Deadly'][level] };
  };

  N.start = function (run) {
    const n = run.night;
    const st = {
      t: 0, len: C.NIGHT_LEN, enemies: [], proj: [], corpses: [], queue: [], qi: 0, nextId: 1,
      kills: 0, lost: [], dawn: false, warnT: 0, ammoWarnT: 0, breachT: 0, boss: false,
      hpMul: 1 + 0.07 * (n - 1) + 0.2 * Math.floor((n - 1) / 28),
      dmgMul: 1 + 0.04 * (n - 1),
    };
    st.threat = N.forecast(run);
    let budget = N.budget(run) * U.rand(0.8, 1.25);
    const pool = [{ w: 6, v: 'walker' }];
    if (n >= 3) pool.push({ w: 3 + n * 0.08, v: 'runner' });
    if (n >= 5) pool.push({ w: 1.2, v: 'wolf' });
    if (n >= 6) pool.push({ w: 0.8 + n * 0.04, v: 'brute' });
    if (n >= 8) pool.push({ w: 1.4, v: 'moth' });
    const win = st.len * 0.8;
    const add = (type, time, a) => st.queue.push({ type, time: U.clamp(time, 1.5, st.len - 6), a });
    let guard = 0;
    while (budget > 0 && guard++ < 3000) {
      const type = U.weighted(pool);
      const time = U.rand(2, win);
      const a = Math.random() * U.TAU;
      // sometimes they come in a pack from one direction
      const group = type === 'wolf' || type === 'moth' ? U.randi(2, 4) : U.chance(0.22) ? U.randi(2, 4) : 1;
      for (let i = 0; i < group && budget > 0; i++) {
        add(type, time + i * U.rand(0.3, 0.9), a + U.rand(-0.2, 0.2));
        budget -= E()[type].cost;
      }
    }
    if (run.flags.wolves) for (let p = 0; p < run.flags.wolves; p++) { const a = Math.random() * U.TAU, t0 = U.rand(5, win); for (let i = 0; i < 3; i++) add('wolf', t0 + i * 0.4, a); }
    if (n >= 8 && U.chance(Math.min(0.5, 0.06 * (n - 7)))) {
      st.boss = true;
      add('colossus', U.rand(st.len * 0.25, st.len * 0.6), Math.random() * U.TAU);
    }
    st.queue.sort((a, b) => a.time - b.time);
    N.assignPosts(run, st);
    return st;
  };

  N.towers = (run) => B.all(run, 'tower').filter((b) => b.lvl > 0);
  N.traps = (run) => B.all(run, 'trap').filter((b) => b.lvl > 0);

  const guardPref = { archer: 0, scavenger: 1, fighter: 2, lumberjack: 3, miner: 3, farmer: 3, builder: 5, medic: 6 };
  N.assignPosts = function (run, st) {
    const alive = G.alive(run);
    for (const s of alive) { s.tower = -1; s.onTower = false; s.hold = false; s.cd = U.rand(0, 0.5); s.atk = 0; s.hurt = 0; s.aimT = 0; s.working = null; s.deathT = 0; }
    const towers = N.towers(run);
    const used = new Set();
    for (const t of towers) {
      const g = t.guard && alive.find((s) => s.id === t.guard);
      if (g && !used.has(g.id)) { g.tower = t.id; used.add(g.id); }
    }
    const free = alive.filter((s) => !used.has(s.id) && guardPref[s.role] <= 3).sort((a, b) => guardPref[a.role] - guardPref[b.role]);
    for (const t of towers) {
      if (alive.some((s) => s.tower === t.id)) continue;
      const s = free.shift();
      if (!s) break;
      s.tower = t.id; used.add(s.id);
    }
    const ground = alive.filter((s) => s.tower < 0);
    const fighters = ground.filter((s) => s.role !== 'medic' && s.role !== 'builder');
    fighters.forEach((s, i) => {
      const a = Math.PI / 2 + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (U.TAU / Math.max(4, fighters.length + 1)));
      const p = Geo.pt(a, 0.8);
      s.postX = p.x; s.postY = p.y;
    });
    ground.filter((s) => s.role === 'medic' || s.role === 'builder').forEach((s, i) => {
      const p = Geo.pt(-Math.PI / 2 + i * 1.3, 0.3);
      s.postX = p.x; s.postY = p.y;
    });
  };

  // ---------- helpers ----------
  function moveTo(s, tx, ty, spd, dt, maxD) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d < 3) { s.moving = false; return true; }
    const step = Math.min(d, spd * dt);
    let nx = s.x + dx / d * step, ny = s.y + dy / d * step;
    const p = Geo.clampIn(nx, ny, maxD);
    nx = p.x; ny = p.y;
    const fx = nx - C.CX, fy = ny - C.CY, fd = Math.hypot(fx, fy);
    if (fd < 34) { if (fd < 0.01) { nx = C.CX + 34; ny = C.CY; } else { nx = C.CX + fx / fd * 34; ny = C.CY + fy / fd * 34; } }
    const moved = Math.hypot(nx - s.x, ny - s.y);
    s.x = nx; s.y = ny;
    s.moving = moved > 0.05;
    if (Math.abs(dx) > 0.5) s.face = dx > 0 ? 1 : -1;
    s.phase += moved * 0.16;
    return false;
  }
  N.moveTo = moveTo;

  function nearestSurvivor(run, x, y, maxD) {
    let best = null, bd = maxD;
    for (const s of run.survivors) {
      if (!s.alive || s.onTower) continue;
      const d = U.dist(x, y, s.x, s.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function nearestEnemy(st, x, y, range, filter) {
    let best = null, bd = range;
    for (const e of st.enemies) {
      if (e.dead || e.flee) continue;
      if (filter && !filter(e)) continue;
      const ey = e.type === 'moth' ? e.y - e.alt * 0.5 : e.y;
      const d = U.dist(x, y, e.x, ey);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  const hitH = (e) => (e.type === 'moth' ? e.alt : E()[e.type].hitH * (LC.Draw ? LC.Draw.FIG : 1));
  N.hitH = hitH;
  function burst(x, y, kind, n) { if (LC.FX) LC.FX.burst(x, y, kind, n); }
  function toast(msg, kind) { if (LC.UI && LC.UI.toast) LC.UI.toast(msg, kind); }

  function shoot(st, src, target, dmg, sx, sy) {
    st.proj.push({ x: sx, y: sy, target, dmg, src, speed: 660, life: 1.4, lx: target.x, ly: target.y - hitH(target), ang: 0, done: false });
    A.play('arrow');
  }
  function killEnemy(run, st, e, src) {
    if (e.dead) return;
    e.dead = true;
    st.kills++;
    run.stats.kills++;
    st.corpses.push({ type: e.type, x: e.x, y: e.y, face: e.face, look: e.look, seed: e.seed, alt: e.alt || 0, ang: e.ang || 0, t: 0 });
    burst(e.x, e.y - hitH(e) * 0.7, e.type === 'moth' ? 'dust' : 'ichor', e.type === 'colossus' ? 40 : 9);
    A.play('enemyDie');
    if (src && src.alive && G.addXp(run, src, E()[e.type].xp)) {
      if (LC.FX) LC.FX.text(src.x, src.y - 60, src.name + ' reached Lv ' + src.lvl + '!', '#ffd27a');
      A.play('level');
    }
    if (e.type === 'colossus') toast('The Ash Colossus has fallen!', 'good');
  }
  function hitEnemy(run, st, e, dmg, src) {
    if (!e || e.dead) return;
    e.hp -= dmg;
    e.hurt = 1;
    burst(e.x, e.y - hitH(e) * 0.75, e.type === 'moth' ? 'dust' : 'ichor', 3);
    if (e.hp <= 0) killEnemy(run, st, e, src);
  }
  function damageSurvivor(run, st, s, dmg) {
    if (!s.alive) return;
    s.hp -= dmg;
    s.hurt = 1;
    burst(s.x, s.y - 26, 'blood', 4);
    A.play('hurt');
    if (s.hp <= 0) {
      s.hp = 0; s.alive = false; s.deathT = 0; s.moving = false; s.tower = -1; s.onTower = false;
      st.lost.push(s.name);
      G.log(run, s.name + ' fell defending the camp on night ' + run.night + '.', 'bad');
      toast(s.name + ' has fallen.', 'bad');
      A.play('death');
    }
  }
  function wallHit(run, st, seg, dmg) {
    if (run.wallBroken[seg]) return;
    run.wallHp[seg] -= dmg;
    const p = Geo.pt(Geo.segMid(seg), 1.0);
    burst(p.x + U.rand(-14, 14), p.y - 18, 'splinter', 3);
    A.play('chop');
    if (run.wallHp[seg] <= 0) {
      run.wallHp[seg] = 0;
      run.wallBroken[seg] = true;
      burst(p.x, p.y - 14, 'splinter', 14);
      A.play('break');
      if (st.breachT <= 0) { toast(Geo.isGate(seg) ? 'The gate is broken!' : 'The wall is breached in the ' + Geo.dirName(Geo.segMid(seg)) + '!', 'bad'); st.breachT = 6; }
    }
  }

  // ---------- survivors ----------
  function updSurvivor(run, st, s, dt) {
    s.atk = Math.max(0, s.atk - dt * 3);
    s.hurt = Math.max(0, s.hurt - dt * 4);
    s.aimT = Math.max(0, s.aimT - dt);
    s.cd -= dt;
    s.moving = false;
    s.working = null;
    const swift = G.has(run, 'swift');
    const spd = 72 * (swift ? 1.25 : 1);
    const cdMul = swift ? 0.85 : 1;

    if (s.tower >= 0) {
      const t = B.byId(run, s.tower);
      if (!t || t.lvl === 0) { s.tower = -1; s.onTower = false; return; }
      const tp = B.pos(t);
      if (!s.onTower) {
        moveTo(s, tp.x, tp.y, spd, dt, 1.0);
        if (U.dist(s.x, s.y, tp.x, tp.y) < 7) { s.onTower = true; s.x = tp.x; s.y = tp.y; s.moving = false; }
        return;
      }
      s.x = tp.x; s.y = tp.y;
      const e = nearestEnemy(st, s.x, s.y - 50, G.towerRange(run, t.lvl));
      if (e) {
        s.face = e.x >= s.x ? 1 : -1;
        s.aimT = Math.max(s.aimT, 0.3);
        if (s.cd <= 0) {
          if (run.res.ammo >= 1) {
            run.res.ammo -= 1;
            shoot(st, s, e, G.towerDmg(run, s, t.lvl), s.x + s.face * 8, s.y - 80);
            s.cd = B.stat('tower', 'rate', t.lvl) * cdMul; s.atk = 1; s.aimT = 0.7;
          } else if (st.ammoWarnT <= 0) { st.ammoWarnT = 8; toast('Out of arrows! Tower guards cannot shoot. Staff the Workshop.', 'bad'); }
        }
      }
      return;
    }

    const ranged = s.role === 'archer' && run.res.ammo >= 1;
    const reachable = (e) => e.type === 'moth' || Geo.d(e.x, e.y) <= 1.06;
    let target = nearestEnemy(st, s.x, s.y, 460, (e) => e.type !== 'moth' && Geo.d(e.x, e.y) < 0.98);
    if (!target) {
      target = nearestEnemy(st, s.x, s.y, ranged ? 250 : 150, ranged ? null : reachable);
      if (target && s.hold && U.dist(target.x, target.y, s.postX, s.postY) > 260) target = null;
    }
    // nothing close: unless ordered to hold a spot, go wherever the wall is under attack
    if (!target && !s.hold && s.role !== 'medic' && (s.role !== 'builder' || G.alive(run).length <= 3)) {
      target = nearestEnemy(st, s.x, s.y, 2000, (e) => e.type !== 'moth' && Geo.d(e.x, e.y) <= 1.06);
    }
    if (target) {
      const ty = target.type === 'moth' ? target.y - target.alt * 0.5 : target.y;
      const d = U.dist(s.x, s.y, target.x, ty);
      if (ranged) {
        if (d <= 250) {
          s.face = target.x >= s.x ? 1 : -1;
          s.aimT = Math.max(s.aimT, 0.3);
          if (s.cd <= 0) { run.res.ammo -= 1; shoot(st, s, target, G.rangedDmg(run, s), s.x + s.face * 9, s.y - 32); s.cd = 1.0 * cdMul; s.atk = 1; s.aimT = 0.7; }
        } else moveTo(s, target.x, target.y, spd, dt, SURV_MAX_D);
      } else {
        const reach = 22 + target.r;
        if (d <= reach) {
          s.face = target.x >= s.x ? 1 : -1;
          if (s.cd <= 0) { hitEnemy(run, st, target, G.meleeDmg(run, s), s); s.cd = 0.85 * cdMul; s.atk = 1; A.play('hit'); }
        } else moveTo(s, target.x, ty, spd, dt, SURV_MAX_D);
      }
      return;
    }

    if (s.role === 'builder') {
      let best = -1, bestScore = Infinity;
      for (let i = 0; i < C.SEG; i++) {
        const max = G.segMax(run, i);
        if (run.wallHp[i] >= max) continue;
        const p = Geo.pt(Geo.segMid(i), 0.86);
        if (nearestEnemy(st, p.x, p.y, 90)) continue;
        const score = (run.wallBroken[i] ? -1000 : 0) + run.wallHp[i] / max * 300 + U.dist(s.x, s.y, p.x, p.y);
        if (score < bestScore) { bestScore = score; best = i; }
      }
      if (best >= 0) {
        const p = Geo.pt(Geo.segMid(best), 0.86);
        if (U.dist(s.x, s.y, p.x, p.y) > 6) moveTo(s, p.x, p.y, spd, dt, SURV_MAX_D);
        else {
          s.working = 'build';
          const max = G.segMax(run, best);
          const wp = Geo.pt(Geo.segMid(best), 1);
          s.face = wp.x >= s.x ? 1 : -1;
          run.wallHp[best] = Math.min(max, run.wallHp[best] + 7 * (G.has(run, 'quickhands') ? 1.5 : 1) * (1 + 0.1 * (s.lvl - 1)) * dt);
          if (run.wallBroken[best] && run.wallHp[best] >= max * 0.3) { run.wallBroken[best] = false; toast(s.name + ' patched the breach.', 'good'); }
          if (Math.random() < dt * 2.5) { burst(wp.x, wp.y - 16, 'splinter', 1); A.play('chop'); }
        }
        return;
      }
    }

    if (s.role === 'medic') {
      let ally = null, worst = 0.999;
      for (const o of run.survivors) {
        if (!o.alive || o === s || o.onTower) continue;
        const ratio = o.hp / G.maxHp(run, o);
        if (ratio < worst && U.dist(o.x, o.y, s.postX, s.postY) < 360) { worst = ratio; ally = o; }
      }
      if (ally) {
        if (U.dist(s.x, s.y, ally.x, ally.y) > 30) moveTo(s, ally.x, ally.y, spd, dt, SURV_MAX_D);
        else {
          s.working = 'heal';
          s.face = ally.x >= s.x ? 1 : -1;
          const inf = B.get(run, 'infirmary');
          const boost = inf && inf.lvl > 0 ? 1 + 0.15 * inf.lvl : 1;
          ally.hp = Math.min(G.maxHp(run, ally), ally.hp + 6 * boost * (1 + 0.1 * (s.lvl - 1)) * dt);
          if (Math.random() < dt * 3) burst(ally.x, ally.y - 30, 'heal', 1);
        }
        return;
      }
    }
    s.hp = Math.min(G.maxHp(run, s), s.hp + 1.5 * dt);
    moveTo(s, s.postX, s.postY, spd, dt, SURV_MAX_D);
  }

  // ---------- enemies ----------
  function spawn(run, st, q) {
    const def = E()[q.type];
    const dx = Math.cos(q.a) * C.RX, dy = Math.sin(q.a) * C.RY;
    const tx = dx > 0 ? (C.WW + 30 - C.CX) / dx : dx < 0 ? (-30 - C.CX) / dx : Infinity;
    const ty = dy > 0 ? (C.WH + 50 - C.CY) / dy : dy < 0 ? (-20 - C.CY) / dy : Infinity;
    const k = Math.min(tx, ty);
    const x = C.CX + dx * k, y = C.CY + dy * k;
    const hp = def.hp * st.hpMul;
    st.enemies.push({
      id: st.nextId++, type: q.type, x, y, hp, maxHp: hp, r: def.r, face: x < C.CX ? 1 : -1,
      phase: Math.random() * 6, cd: U.rand(0.2, 1), atk: 0, hurt: 0, seed: Math.random() * 100,
      slow: 0, alt: def.flying ? U.rand(26, 36) : 0, ang: 0, out: true, moving: true, flee: false, look: N.enemyLook(q.type),
    });
    if (q.type === 'colossus') { toast('The ground shakes... an Ash Colossus approaches from the ' + Geo.dirName(q.a) + '!', 'bad'); A.play('boss'); }
    if (q.type === 'wolf' && Math.random() < 0.3) A.play('howl');
  }

  N.enemyLook = function (type) {
    const P = U.pick;
    if (type === 'brute') return { skin: P(['#7c8574', '#87806f', '#737d6c']), shirt: P(['#3a3530', '#45392e']), pants: P(['#2a2724', '#352d26']), hair: '#1a1714', hairStyle: 'bald', boots: '#1d1915' };
    if (type === 'colossus') return { skin: '#3d3632', shirt: '#2a2420', pants: '#221d1a', hair: '#111', hairStyle: 'bald', boots: '#151210' };
    if (type === 'runner') return { skin: P(['#a3a894', '#9aa391', '#adb09c']), shirt: P(['#5a4a3a', '#3d4a52', '#4a3d48', '#5c5546']), pants: P(['#2e2c28', '#3a332b']), hair: P(['#1c1a17', '#3a342c', '#6a6258']), hairStyle: P(['stringy', 'short', 'bald']), boots: '#1f1b17' };
    return { skin: P(['#8f9c86', '#87917f', '#9a9f8a', '#94947e']), shirt: P(['#4a4842', '#3f3a33', '#504536', '#3b4140', '#5a3f35', '#46503f']), pants: P(['#2e2c28', '#35302a', '#2a2e33']), hair: P(['#1c1a17', '#3a342c', '#5a5248']), hairStyle: P(['stringy', 'bald', 'short', 'long']), boots: '#1f1b17' };
  };

  function updEnemy(run, st, e, dt) {
    const def = E()[e.type];
    e.hurt = Math.max(0, e.hurt - dt * 5);
    e.atk = Math.max(0, e.atk - dt * 2.5);
    e.cd -= dt;
    e.slow = Math.max(0, e.slow - dt);
    e.moving = false;
    const spd = def.speed * (e.slow > 0 ? 0.5 : 1);
    const ox = e.x, oy = e.y;

    if (e.flee) {
      const a = Math.atan2(e.y - C.CY, e.x - C.CX);
      e.x += Math.cos(a) * def.speed * 1.4 * dt;
      e.y += Math.sin(a) * def.speed * 1.4 * dt;
      e.face = Math.cos(a) >= 0 ? 1 : -1; e.ang = a; e.moving = true;
      e.phase += Math.hypot(e.x - ox, e.y - oy) * 0.14;
      if (e.x < -120 || e.x > C.WW + 120 || e.y < -120 || e.y > C.WH + 120) e.gone = true;
      return;
    }
    if (def.flying) {
      const dx = C.CX - e.x, dy = C.CY - e.y, d = Math.hypot(dx, dy);
      e.ang = Math.atan2(dy, dx);
      if (d > 18) {
        const a = e.ang + Math.sin(st.t * 3 + e.seed) * 0.6;
        e.x += Math.cos(a) * spd * dt; e.y += Math.sin(a) * spd * dt; e.moving = true;
      } else {
        run.fireFuel -= def.drain * st.dmgMul * dt;
        e.x = C.CX + Math.cos(st.t * 4 + e.seed) * 12;
        e.y = C.CY + Math.sin(st.t * 4 + e.seed) * 6;
        e.atk = 1;
        if (Math.random() < dt * 4) burst(e.x, e.y - e.alt, 'dust', 1);
      }
      e.face = Math.cos(e.ang) >= 0 ? 1 : -1;
      e.out = false;
      return;
    }
    const d = Geo.d(e.x, e.y);
    if (d > 1.0) {
      const seg = Geo.seg(e.x, e.y);
      const intact = !run.wallBroken[seg];
      const sv = !intact && d <= 1.08 ? nearestSurvivor(run, e.x, e.y, e.r + 22) : null;
      if (sv) {
        e.face = sv.x >= e.x ? 1 : -1;
        if (e.cd <= 0) { damageSurvivor(run, st, sv, def.dmg * st.dmgMul); e.cd = def.cd; e.atk = 1; }
      } else if (intact && d <= WALL_STOP_D + 0.005) {
        e.face = C.CX >= e.x ? 1 : -1;
        if (e.cd <= 0) { wallHit(run, st, seg, def.wallDmg * st.dmgMul); e.cd = def.cd; e.atk = 1; }
      } else {
        const a = Math.atan2(C.CY - e.y, C.CX - e.x) + Math.sin(st.t * 1.3 + e.seed) * 0.25;
        e.x += Math.cos(a) * spd * dt; e.y += Math.sin(a) * spd * dt;
        e.face = Math.cos(a) >= 0 ? 1 : -1;
        if (Geo.d(e.x, e.y) < WALL_STOP_D && !run.wallBroken[Geo.seg(e.x, e.y)]) {
          const p = Geo.pt(Geo.ang(e.x, e.y), WALL_STOP_D);
          e.x = p.x; e.y = p.y;
        }
      }
    } else {
      const tgt = nearestSurvivor(run, e.x, e.y, 220);
      const tx = tgt ? tgt.x : C.CX, ty = tgt ? tgt.y : C.CY;
      const dd = U.dist(e.x, e.y, tx, ty);
      const reach = tgt ? e.r + 20 : 30 + e.r;
      if (dd <= reach) {
        e.face = tx >= e.x ? 1 : -1;
        if (e.cd <= 0) {
          e.cd = def.cd; e.atk = 1;
          if (!tgt) { run.fireFuel -= def.dmg * 0.25 * st.dmgMul; burst(C.CX + U.rand(-10, 10), C.CY - 10, 'spark', 6); A.play('stoke'); if (st.warnT <= 0) { st.warnT = 6; toast('The dead are trampling the fire! Drive them out!', 'bad'); } }
          else {
            damageSurvivor(run, st, tgt, def.dmg * st.dmgMul);
            if (e.type === 'colossus') {
              for (const o of run.survivors) if (o !== tgt && o.alive && !o.onTower && U.dist(o.x, o.y, tgt.x, tgt.y) < 48) damageSurvivor(run, st, o, def.dmg * 0.35 * st.dmgMul);
              burst(tgt.x, tgt.y - 4, 'smoke', 8);
            }
          }
        }
      } else {
        const a = Math.atan2(ty - e.y, tx - e.x);
        e.x += Math.cos(a) * spd * dt; e.y += Math.sin(a) * spd * dt;
        e.face = Math.cos(a) >= 0 ? 1 : -1;
      }
    }
    const moved = Math.hypot(e.x - ox, e.y - oy);
    e.moving = moved > 0.01;
    e.phase += moved * (e.type === 'wolf' ? 0.2 : 0.14);
    e.out = Geo.d(e.x, e.y) > 1.0;
  }

  function separate(run, st) {
    const es = st.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      if (a.dead || a.type === 'moth' || a.flee) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        if (b.dead || b.type === 'moth' || b.flee) continue;
        const dx = b.x - a.x, dy = (b.y - a.y) * 1.6;
        const min = (a.r + b.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (min - d) / 2, ux = dx / d, uy = dy / d / 1.6;
          const wa = b.r / (a.r + b.r), wb = a.r / (a.r + b.r);
          a.x -= ux * push * 2 * wa; a.y -= uy * push * 2 * wa;
          b.x += ux * push * 2 * wb; b.y += uy * push * 2 * wb;
        }
      }
    }
    for (const e of es) {
      if (e.dead || e.type === 'moth' || e.flee || !e.out) continue;
      if (Geo.d(e.x, e.y) < WALL_STOP_D && !run.wallBroken[Geo.seg(e.x, e.y)]) {
        const p = Geo.pt(Geo.ang(e.x, e.y), WALL_STOP_D);
        e.x = p.x; e.y = p.y;
      }
    }
  }

  function traps(run, st, dt) {
    for (const t of N.traps(run)) {
      const p = B.pos(t);
      const dps = G.trapDps(run, t.lvl);
      for (const e of st.enemies) {
        if (e.dead || e.flee || e.type === 'moth') continue;
        if (Math.abs(e.x - p.x) < 26 + e.r * 0.5 && Math.abs(e.y - p.y) < 14 + e.r * 0.3) {
          e.hp -= dps * dt;
          e.slow = 0.4;
          e.trapT = (e.trapT || 0) + dt;
          if (e.trapT > 0.45) { e.trapT = 0; e.hurt = 0.7; burst(e.x, e.y - 6, 'ichor', 2); }
          if (e.hp <= 0) killEnemy(run, st, e, null);
        }
      }
    }
  }

  function updProj(run, st, dt) {
    for (const p of st.proj) {
      const t = p.target;
      let tx, ty;
      if (t && !t.dead && !t.gone) { tx = t.x; ty = t.y - hitH(t); p.lx = tx; p.ly = ty; } else { tx = p.lx; ty = p.ly; p.lost = true; }
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
      p.ang = Math.atan2(dy, dx);
      if (d <= step + 4) { if (!p.lost) hitEnemy(run, st, t, p.dmg, p.src); p.done = true; }
      else { p.x += dx / d * step; p.y += dy / d * step; }
      p.life -= dt;
      if (p.life <= 0) p.done = true;
    }
    st.proj = st.proj.filter((p) => !p.done);
  }

  N.beginDawn = function (st) {
    if (st.dawn) return;
    st.dawn = true;
    st.qi = st.queue.length;
    for (const e of st.enemies) e.flee = true;
    toast('Dawn breaks. The dead retreat into the forest.', 'good');
  };

  // per-frame update; returns null or {type:'lose', reason}
  N.update = function (run, st, dt) {
    st.t += dt;
    st.breachT -= dt;
    st.ammoWarnT -= dt;
    while (st.qi < st.queue.length && st.queue[st.qi].time <= st.t) { spawn(run, st, st.queue[st.qi]); st.qi++; }
    if (!st.dawn) run.fireFuel -= G.burnRate(run) * dt;
    const fmax = G.fireMax(run);
    if (!st.dawn && run.fireFuel < fmax * 0.4 && N.autoFeed(run, 0.7) > 0) { if (LC.FX) LC.FX.burst(C.CX, C.CY - 14, 'spark', 6); }
    if (run.fireFuel > fmax) run.fireFuel = fmax;
    for (const s of run.survivors) { if (s.alive) updSurvivor(run, st, s, dt); else s.deathT = (s.deathT || 0) + dt; }
    for (const e of st.enemies) if (!e.dead) updEnemy(run, st, e, dt);
    separate(run, st);
    traps(run, st, dt);
    updProj(run, st, dt);
    st.enemies = st.enemies.filter((e) => !e.dead && !e.gone);
    for (const c of st.corpses) c.t += dt;
    st.corpses = st.corpses.filter((c) => c.t < 3);
    if (run.fireFuel <= 0 && !st.dawn) { run.fireFuel = 0; return { type: 'lose', reason: 'The fire went out, and the dark swallowed the camp.' }; }
    if (run.fireFuel < 0) run.fireFuel = 0;
    if (!run.survivors.some((s) => s.alive)) return { type: 'lose', reason: 'No one is left to keep the fire burning.' };
    if (!st.dawn && run.fireFuel < fmax * 0.2) {
      st.warnT -= dt;
      if (st.warnT <= 0) { st.warnT = 9; toast('The fire is dying! Add wood (F).', 'bad'); A.play('warn'); }
    } else st.warnT = 0;
    return null;
  };

  // ---------- player actions ----------
  N.stoke = function (run) {
    const fmax = G.fireMax(run);
    if (run.res.wood < 1) { toast('No wood left!', 'bad'); A.play('deny'); return false; }
    if (run.fireFuel >= fmax - 1) { toast('The fire is already full.', 'neutral'); return false; }
    run.res.wood -= 1;
    run.fireFuel = Math.min(fmax, run.fireFuel + C.FUEL_PER_WOOD);
    if (LC.FX) LC.FX.burst(C.CX, C.CY - 14, 'spark', 14);
    A.play('stoke');
    return true;
  };

  // the fire keeper: quietly tops the fire up from the woodpile (can be switched off)
  N.autoFeed = function (run, target) {
    if (run.autoFire === false) return 0;
    const fmax = G.fireMax(run);
    let used = 0;
    while (run.fireFuel < fmax * target && run.res.wood >= 1 && run.fireFuel <= fmax - C.FUEL_PER_WOOD * 0.5) {
      run.res.wood -= 1; run.fireFuel = Math.min(fmax, run.fireFuel + C.FUEL_PER_WOOD); used++;
    }
    return used;
  };

  N.towerAt = function (run, x, y) {
    for (const t of N.towers(run)) {
      const p = B.pos(t);
      if (Math.abs(x - p.x) < 26 && y > p.y - 100 && y < p.y + 14) return t;
    }
    return null;
  };

  N.order = function (run, st, s, x, y) {
    if (!s || !s.alive) return null;
    const t = N.towerAt(run, x, y);
    const leave = () => {
      if (s.tower >= 0) {
        const old = B.byId(run, s.tower);
        if (old && s.onTower) { const q = Geo.clampIn(B.pos(old).x, B.pos(old).y + 30, 0.86); s.x = q.x; s.y = q.y; }
      }
      s.tower = -1; s.onTower = false;
    };
    if (t) {
      if (s.tower === t.id) return 'tower';
      const occ = run.survivors.find((o) => o.alive && o !== s && o.tower === t.id);
      if (occ) {
        const q = Geo.clampIn(B.pos(t).x, B.pos(t).y + 30, 0.86);
        occ.tower = -1; occ.onTower = false; occ.x = q.x; occ.y = q.y; occ.postX = q.x; occ.postY = q.y;
      }
      leave();
      s.tower = t.id;
      t.guard = s.id;
      return 'tower';
    }
    leave();
    const p = Geo.clampIn(x, y, 0.9);
    s.postX = p.x; s.postY = p.y;
    s.hold = true;
    return 'move';
  };

  N.status = function (run, s) {
    if (!s.alive) return 'Fallen';
    if (s.tower >= 0) return s.onTower ? 'On archer tower' : 'Climbing tower';
    if (s.working === 'build') return 'Repairing wall';
    if (s.working === 'heal') return 'Tending wounds';
    if (s.atk > 0 || s.aimT > 0) return 'Fighting';
    if (s.hold) return s.moving ? 'Moving to position' : 'Holding position (ordered)';
    if (s.moving) return 'Moving';
    return 'Holding position';
  };
})(window.LC);
