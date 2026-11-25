/* Last Camp — the living town: clock, daily schedule, workers, production, construction */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game, B = LC.Bld, Geo = LC.Geo, A = LC.Audio;

  // ---------- static scenery shared by the simulation and the renderer ----------
  const Scene = (LC.Scene = { trees: [], rocks: [] });
  (function build() {
    const rnd = U.seeded(1337);
    const roadClear = (x, y) => Math.abs(x - C.CX) < 70 && y > C.CY + C.RY * 0.8;
    // rock outcrops for the quarry, south-west and south-east of the camp
    const rockAngles = [125, 140, 155, 112, 35, 50, 65, 22];
    for (let i = 0; i < rockAngles.length; i++) {
      const p = Geo.pt(rockAngles[i] * Math.PI / 180, 1.34 + rnd() * 0.25);
      Scene.rocks.push({ x: p.x, y: p.y, k: 0.9 + rnd() * 0.4, seed: rnd(), shake: 0, users: 0 });
    }
    let tries = 0;
    while (Scene.trees.length < 190 && tries < 12000) {
      tries++;
      const x = rnd() * (C.WW + 40) - 20, y = rnd() * (C.WH + 20) + 10;
      if (Geo.d(x, y) < 1.3 || roadClear(x, y)) continue;
      if (Scene.trees.some((t) => Math.hypot(t.x - x, (t.y - y) * 1.4) < 46)) continue;
      if (Scene.rocks.some((r) => Math.hypot(r.x - x, (r.y - y) * 1.4) < 60)) continue;
      Scene.trees.push({ x, y, k: 0.85 + rnd() * 0.6, kind: rnd() < 0.68 ? 'pine' : 'oak', seed: rnd(), shake: 0, users: 0 });
    }
    // trees woodcutters may use: close to the camp on the gate side
    Scene.choppable = Scene.trees.filter((t) => { const d = Geo.d(t.x, t.y); return d < 1.85 && t.y > C.CY + 40; });
  })();

  const T = (LC.Town = {});
  const SPEED = 58;

  // ---------- paths: through the gate when crossing the wall ----------
  function arc(a0, a1, d) {
    let diff = a1 - a0;
    while (diff > Math.PI) diff -= U.TAU;
    while (diff < -Math.PI) diff += U.TAU;
    const n = Math.floor(Math.abs(diff) / 0.4);
    const pts = [];
    for (let i = 1; i <= n; i++) pts.push(Geo.pt(a0 + diff * i / (n + 1), d));
    return pts;
  }
  T.route = function (from, to) {
    const fin = Geo.d(from.x, from.y) < 1, tin = Geo.d(to.x, to.y) < 1;
    const half = Math.PI / 2;
    if (fin && tin) return [to];
    if (fin) return [Geo.gateIn(), Geo.gateOut()].concat(arc(half, Geo.ang(to.x, to.y), 1.22), [to]);
    if (tin) return arc(Geo.ang(from.x, from.y), half, 1.22).concat([Geo.gateOut(), Geo.gateIn(), to]);
    return arc(Geo.ang(from.x, from.y), Geo.ang(to.x, to.y), 1.22).concat([to]);
  };

  function step(s, tx, ty, spd, dt) {
    const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d < 2) { s.x = tx; s.y = ty; s.moving = false; return true; }
    const st = Math.min(d, spd * dt);
    s.x += dx / d * st; s.y += dy / d * st;
    s.moving = true;
    if (Math.abs(dx) > 0.5) s.face = dx > 0 ? 1 : -1;
    s.phase += st * 0.16;
    return st >= d - 0.01;
  }
  T.step = step;

  function walk(s, to, then) {
    s.job = { st: 'walk', path: T.route({ x: s.x, y: s.y }, to), then: then || null };
  }
  function idle(s, note) {
    const p = Geo.pt(Math.random() * U.TAU, U.rand(0.12, 0.3));
    s.job = { st: 'walk', path: T.route({ x: s.x, y: s.y }, p), then: { st: 'wander', t: U.rand(3, 6), note: note || '' } };
  }

  // drop-off points for carried goods
  function dropFor(run, kind, b) {
    if (b && b.lvl > 0) return B.door(b);
    const sh = B.get(run, 'storehouse');
    if (kind !== 'wood' && sh && sh.lvl > 0) return B.door(sh);
    const p = kind === 'wood' ? LC.PROPS.woodpile : LC.PROPS.crates;
    return { x: C.CX + p[0], y: C.CY + p[1] + 10 };
  }

  function pickResource(list, s) {
    const go = Geo.gateOut();
    const sorted = list.slice().sort((a, b) => (a.users - b.users) || (U.dist(a.x, a.y, go.x, go.y) - U.dist(b.x, b.y, go.x, go.y)));
    const pool = sorted.slice(0, Math.min(6, sorted.length));
    return pool[(s.id * 7 + Math.floor(Math.random() * pool.length)) % pool.length];
  }

  const outsideAllowed = (run) => G.phase(run) === 'day' && G.hour(run) < 17;

  T.status = function (run, s) {
    if (!s.alive) return 'Fallen';
    const j = s.job;
    if (!j) return 'Idle';
    const at = (b) => (b ? B.def(b.type).name : '');
    switch (j.st) {
      case 'walk': return j.then && j.then.st === 'deposit' ? 'Carrying ' + (s.carry ? s.carry.n + ' ' + s.carry.k : 'goods') : j.then && j.then.st === 'away' ? 'Heading out on an expedition' : 'Walking';
      case 'chop': return 'Chopping wood';
      case 'mine': return 'Mining stone';
      case 'away': return 'Away: ' + (j.loc ? j.loc.name : 'expedition') + ' · back ~' + Math.floor(G.hour({ clock: j.until })) + ':00';
      case 'inside': return 'Resting at home';
      case 'work': return { farm: 'Tending the fields', build: 'Building ' + at(B.byId(run, j.b)), repair: 'Repairing the wall', workshop: 'Carving arrows', armory: 'Sharpening weapons', infirmary: 'Treating the wounded' }[j.kind] || 'Working';
      case 'wander': return j.note || 'Idle';
      default: return 'Idle';
    }
  };

  // decide what a worker should do next, based on their assignment and the time of day
  T.plan = function (run, s) {
    s.working = null;
    const task = s.task;
    if (task === 'rest') {
      const houses = B.all(run, 'house').filter((h) => h.lvl > 0);
      if (!houses.length) return idle(s, 'No house to rest in');
      const h = houses.sort((a, b) => U.dist(s.x, s.y, B.pos(a).x, B.pos(a).y) - U.dist(s.x, s.y, B.pos(b).x, B.pos(b).y))[0];
      return walk(s, B.door(h), { st: 'inside', b: h.id });
    }
    if (task === 'build') {
      const sites = B.sites(run);
      if (sites.length) {
        const site = sites[0];
        const p = B.pos(site);
        const n = run.survivors.filter((o) => o.alive && o.job && o.job.b === site.id && o !== s).length;
        const off = [[-26, 10], [26, 10], [0, 22], [-40, -4], [40, -4]][n % 5];
        const place = B.def(site.type).place;
        let to = { x: p.x + off[0], y: p.y + off[1] };
        if (place === 'tower' || place === 'trap') to = Geo.clampIn(to.x, to.y, 0.9);
        return walk(s, to, { st: 'work', kind: 'build', b: site.id });
      }
      let worst = -1, ratio = 1;
      for (let i = 0; i < C.SEG; i++) { const r = run.wallHp[i] / G.segMax(run, i); if (r < ratio - 0.001) { ratio = r; worst = i; } }
      if (worst >= 0 && run.res.wood >= G.fireReserve(run) + 1) {
        const p = Geo.pt(Geo.segMid(worst), 0.88);
        return walk(s, p, { st: 'work', kind: 'repair', seg: worst });
      }
      return idle(s, worst >= 0 ? 'Keeping wood for the fire (needs more to repair)' : 'Nothing to build');
    }
    if (typeof task !== 'number') return idle(s, '');
    const b = B.byId(run, task);
    if (!b) { s.task = 'idle'; return idle(s, ''); }
    if (b.lvl === 0) return idle(s, 'Waiting for the ' + B.def(b.type).name + ' to be built');
    const staff = B.staff(run, b);
    if (staff.indexOf(s) >= B.slots(b)) return idle(s, 'No room at the ' + B.def(b.type).name);
    const p = B.pos(b);
    const idx = staff.indexOf(s);
    switch (b.type) {
      case 'farm': {
        const fx = p.x - 24 + (idx % 2) * 48, fy = p.y + 4 + Math.floor(idx / 2) * 14;
        return walk(s, { x: fx, y: fy }, { st: 'work', kind: 'farm', b: b.id });
      }
      case 'mill':
      case 'quarry': {
        if (!outsideAllowed(run)) return idle(s, 'Too late to go outside');
        const list = b.type === 'mill' ? Scene.choppable : Scene.rocks;
        const r = pickResource(list, s);
        r.users++;
        const side = s.id % 2 ? 1 : -1;
        return walk(s, { x: r.x + side * 17 * r.k, y: r.y + 2 }, { st: b.type === 'mill' ? 'chop' : 'mine', res: list.indexOf(r), t: 0, b: b.id, swing: 0 });
      }
      case 'workshop':
      case 'armory':
      case 'infirmary':
        return walk(s, { x: p.x - 18 + idx * 18, y: p.y + 18 }, { st: 'work', kind: b.type, b: b.id });
      case 'expedition': {
        if (s.tripDay === run.night) return idle(s, 'Back from today\'s expedition');
        if (!outsideAllowed(run) || G.hour(run) >= 13) return idle(s, 'Expeditions leave before 13:00');
        const loc = LC.LOCS.find((l) => l.id === run.expedition && run.night >= l.unlock) || LC.LOCS[0];
        const a = loc.ang;
        const edge = { x: U.clamp(C.CX + Math.cos(a) * 900, 20, C.WW - 20), y: U.clamp(C.CY + Math.sin(a) * 700, 20, C.WH - 20) };
        const until = Math.floor(run.clock / 24) * 24 + 16 + U.rand(0, 0.8);
        return walk(s, edge, { st: 'away', loc, until, edge, b: b.id });
      }
      default:
        return idle(s, '');
    }
  };

  function finishTrip(run, s, j) {
    const loc = j.loc;
    const b = B.byId(run, j.b);
    const lvl = b ? Math.max(1, b.lvl) : 1;
    const st = run.locs[loc.id] || (run.locs[loc.id] = { rich: 1 });
    const mul = st.rich * B.stat('expedition', 'loot', lvl) / 100 * G.roleMul(s, 'expedition') * (G.has(run, 'deeppockets') ? 1.3 : 1) * (1 + 0.05 * (s.lvl - 1));
    const loot = {};
    for (const k in loc.loot) { const v = Math.round(U.rand(loc.loot[k][0], loc.loot[k][1]) * mul); if (v > 0) loot[k] = v; }
    st.rich = Math.max(0.25, st.rich - 0.15);
    s.tripDay = run.night;
    const risk = U.clamp(loc.risk * (1 + run.night * 0.015) * (s.role === 'scavenger' ? 0.6 : 1) * (G.has(run, 'lucky') ? 0.65 : 1) * (1 - B.stat('expedition', 'safety', lvl) / 100), 0, 0.85);
    const lootTxt = Object.keys(loot).length ? LC.fmtRes(loot) : 'nothing';
    if (U.chance(risk)) {
      const dmg = Math.round(U.randi(15, 32) * (1 + run.night * 0.03));
      if (s.hp - dmg <= 0) {
        s.alive = false; s.hp = 0;
        G.log(run, s.name + ' never came back from ' + loc.name + '.', 'bad');
        if (LC.UI) LC.UI.toast(s.name + ' never came back from ' + loc.name + '.', 'bad');
        run.fallen.push({ name: s.name, role: s.role, night: run.night });
        return null;
      }
      s.hp -= dmg;
      G.log(run, s.name + ' returned hurt from ' + loc.name + ' (-' + dmg + ' health) with ' + lootTxt + '.', 'bad');
    } else {
      G.log(run, s.name + ' returned from ' + loc.name + ' with ' + lootTxt + '.', 'good');
    }
    if (U.chance(0.1)) {
      const ns = G.newSurvivor(run, U.pick(Object.keys(LC.ROLES)), U.clamp(1 + Math.floor(run.night / 6), 1, 5));
      if (G.freeBeds(run) > 0) {
        G.addSurvivor(run, ns);
        ns.x = s.x + 12; ns.y = s.y;
        walk(ns, Geo.gateIn(), null);
        if (LC.UI) LC.UI.toast(s.name + ' found ' + ns.name + ' hiding in the ruins. They join the camp!', 'good');
      } else {
        G.log(run, s.name + ' met a survivor named ' + ns.name + ', but there was no free bed for them.', 'bad');
        if (LC.UI) LC.UI.toast(ns.name + ' wanted to join, but there is no free bed. Build a House!', 'bad');
      }
    }
    return loot;
  }

  function addCarried(run, s, goods) {
    let wasted = 0;
    const parts = [];
    for (const k in goods) {
      const got = G.addRes(run, k, goods[k]);
      wasted += goods[k] - got;
      if (got > 0) parts.push('+' + Math.round(got) + ' ' + k);
    }
    if (parts.length && LC.FX) LC.FX.text(s.x, s.y - 60, parts.join(' '), '#d8f0c8');
    if (wasted > 0.5 && LC.UI) LC.UI.toast('Storage is full! Build or upgrade a Storehouse.', 'bad');
  }

  // ---------- per-frame worker update (day and dusk) ----------
  T.updateWorker = function (run, s, sdt) {
    const dh = sdt / C.HOUR;
    s.atk = Math.max(0, s.atk - sdt * 3);
    s.hurt = Math.max(0, s.hurt - sdt * 4);
    s.aimT = 0;
    if (!s.job) T.plan(run, s);
    const j = s.job;
    const spd = SPEED * (G.has(run, 'swift') ? 1.25 : 1) * (s.carry ? 0.85 : 1);
    s.moving = false;
    switch (j.st) {
      case 'walk': {
        s.hidden = false;
        if (!j.path.length) { s.job = j.then; if (!s.job) T.plan(run, s); break; }
        const p = j.path[0];
        if (step(s, p.x, p.y, spd, sdt)) j.path.shift();
        break;
      }
      case 'wander': {
        s.working = null;
        j.t -= sdt;
        if (j.t <= 0) { s.job = null; }
        break;
      }
      case 'chop':
      case 'mine': {
        const list = j.st === 'chop' ? Scene.choppable : Scene.rocks;
        const r = list[j.res];
        if (!r) { s.job = null; break; }
        s.face = r.x >= s.x ? 1 : -1;
        s.working = j.st;
        j.swing -= sdt;
        if (j.swing <= 0) {
          j.swing = 0.62;
          s.atk = 1;
          r.shake = 0.25;
          if (LC.FX) LC.FX.burst(r.x - s.face * 4, r.y - (j.st === 'chop' ? 16 : 10) * r.k, j.st === 'chop' ? 'chip' : 'rockchip', 3);
          if (LC.Render && LC.Render.onScreen(s.x, s.y)) A.play(j.st === 'chop' ? 'chop' : 'pick');
        }
        j.t += dh;
        if (j.t >= 1 || !outsideAllowed(run) && j.t >= 0.4) {
          r.users = Math.max(0, r.users - 1);
          const b = B.byId(run, j.b);
          const lvl = b ? Math.max(1, b.lvl) : 1;
          const k = j.st === 'chop' ? 'wood' : 'stone';
          const base = B.stat(j.st === 'chop' ? 'mill' : 'quarry', 'load', lvl);
          const perk = j.st === 'chop' ? (G.has(run, 'lumberjack') ? 2 : 0) : (G.has(run, 'stonecutter') ? 2 : 0);
          const n = Math.max(1, Math.round((base + Math.floor(s.lvl / 4)) * G.roleMul(s, j.st === 'chop' ? 'mill' : 'quarry') * Math.min(1, j.t) + perk));
          s.carry = { k, n };
          s.working = null;
          G.addXp(run, s, 1);
          walk(s, dropFor(run, k, b), { st: 'deposit' });
        }
        break;
      }
      case 'deposit': {
        if (s.carry) { const g = {}; g[s.carry.k] = s.carry.n; addCarried(run, s, g); s.carry = null; }
        if (j.goods) addCarried(run, s, j.goods);
        s.job = null;
        break;
      }
      case 'away': {
        s.hidden = true;
        if (run.clock >= j.until || G.phase(run) !== 'day') {
          s.hidden = false;
          s.x = j.edge.x; s.y = j.edge.y;
          const loot = finishTrip(run, s, j);
          if (!s.alive) { s.job = null; break; }
          walk(s, dropFor(run, 'loot', null), { st: 'deposit', goods: loot });
        }
        break;
      }
      case 'inside': {
        s.hidden = true;
        const h = B.byId(run, j.b);
        const max = G.maxHp(run, s);
        s.hp = Math.min(max, s.hp + max * (h ? B.stat('house', 'rest', h.lvl) : 5) / 100 * dh);
        if (s.task !== 'rest' || !h) { s.hidden = false; s.job = null; }
        break;
      }
      case 'work':
        work(run, s, j, dh, sdt);
        break;
      default:
        s.job = null;
    }
    // light passive recovery while in camp
    if (s.alive && !s.hidden && j && j.st !== 'chop' && j.st !== 'mine') s.hp = Math.min(G.maxHp(run, s), s.hp + G.maxHp(run, s) * 0.01 * dh);
  };

  function work(run, s, j, dh, sdt) {
    s.hidden = false;
    s.working = j.kind;
    if (j.kind === 'build') {
      const site = B.byId(run, j.b);
      if (!site || !site.target) { s.job = null; s.working = null; return; }
      const p = B.pos(site);
      s.face = p.x >= s.x ? 1 : -1;
      site.progress += dh * (s.role === 'builder' ? 1.6 : 1) * (G.has(run, 'quickhands') ? 1.5 : 1);
      if (Math.random() < sdt * 1.6 && LC.FX) LC.FX.burst(p.x + U.rand(-20, 20), p.y - 20, 'splinter', 1);
      if (site.progress >= site.need) {
        B.complete(run, site);
        const name = B.def(site.type).name;
        const msg = site.lvl === 1 ? name + ' built!' : name + ' upgraded to level ' + site.lvl + '!';
        G.log(run, msg, 'good');
        if (LC.UI) LC.UI.toast(msg, 'good');
        A.play('build');
        G.addXp(run, s, 3);
        s.job = null; s.working = null;
        if (LC.UI && LC.UI.refreshPanels) LC.UI.refreshPanels();
      }
      return;
    }
    if (j.kind === 'repair') {
      const i = j.seg, max = G.segMax(run, i);
      const wp = Geo.pt(Geo.segMid(i), 1);
      s.face = wp.x >= s.x ? 1 : -1;
      if (run.wallHp[i] >= max || run.res.wood < G.fireReserve(run)) { s.job = null; s.working = null; return; }
      const add = Math.min(max - run.wallHp[i], dh * 60 * (s.role === 'builder' ? 1.6 : 1) * (G.has(run, 'quickhands') ? 1.5 : 1));
      run.wallHp[i] += add;
      s.woodDebt = (s.woodDebt || 0) + add / 250;
      while (s.woodDebt >= 1 && run.res.wood >= 1) { run.res.wood -= 1; s.woodDebt -= 1; }
      if (run.wallBroken[i] && run.wallHp[i] >= max * 0.3) run.wallBroken[i] = false;
      if (Math.random() < sdt * 1.6 && LC.FX) LC.FX.burst(wp.x, wp.y - 18, 'splinter', 1);
      return;
    }
    const b = B.byId(run, j.b);
    if (!b || s.task !== b.id || b.lvl === 0) { s.job = null; s.working = null; return; }
    const p = B.pos(b);
    s.face = p.x >= s.x ? 1 : -1;
    if (j.kind === 'farm') {
      const season = G.season(run).idx;
      let sm = [1, 0, 0.85, 1.25][season];
      if (season === 1 && G.has(run, 'greenthumb')) sm = 0.25;
      const rate = B.stat('farm', 'rate', b.lvl) * G.roleMul(s, 'farm') * sm * (G.has(run, 'greenthumb') ? 1.3 : 1);
      s.acc = (s.acc || 0) + rate * dh;
      if (s.acc >= 1) { const n = Math.floor(s.acc); s.acc -= n; addCarried(run, s, { food: n }); G.addXp(run, s, 1); }
      if (sm === 0) s.working = 'idleFrozen';
    } else if (j.kind === 'workshop') {
      const rate = B.stat('workshop', 'arrows', b.lvl) * (G.has(run, 'fletcher') ? 1.5 : 1) * (s.role === 'archer' ? 1.25 : 1);
      if (run.res.wood < 1 && (s.woodDebt || 0) <= 0) { s.working = 'noWood'; return; }
      s.acc = (s.acc || 0) + rate * dh;
      if (s.acc >= 4) {
        const n = Math.floor(s.acc);
        s.acc -= n;
        s.woodDebt = (s.woodDebt || 0) + n / 4;
        while (s.woodDebt >= 1 && run.res.wood >= 1) { run.res.wood -= 1; s.woodDebt -= 1; }
        addCarried(run, s, { ammo: n });
        G.addXp(run, s, 1);
      }
    } else if (j.kind === 'infirmary') {
      const rate = B.stat('infirmary', 'heal', b.lvl) * G.roleMul(s, 'infirmary') / 100;
      let healed = false;
      for (const o of run.survivors) {
        if (!o.alive || (o.job && o.job.st === 'away')) continue;
        const max = G.maxHp(run, o);
        if (o.hp < max) { o.hp = Math.min(max, o.hp + max * rate * dh); healed = true; }
      }
      if (healed && Math.random() < sdt * 0.8 && LC.FX) LC.FX.burst(p.x + U.rand(-20, 20), p.y - 30, 'heal', 1);
    }
    // armory: being staffed is what keeps the bonus active
  }

  // ---------- the daily schedule ----------
  T.onHour = function (run, S, h) {
    const out = [];
    if (h === 6) {
      // (night wrap-up is handled by the caller before this)
      for (const s of run.survivors) if (s.alive) s.job = null;
      if (G.season(run).dayOf === 1 && run.night > 1) out.push({ type: 'toast', text: seasonLine(G.season(run)), kind: 'neutral' });
      out.push({ type: 'save' });
    } else if (h === 7) {
      const need = G.foodNeed(run);
      const eaten = Math.min(need, Math.floor(run.res.food));
      run.res.food -= eaten;
      const short = need - eaten;
      if (short > 0) {
        const alive = U.shuffle(G.alive(run).slice());
        const hungry = alive.slice(0, Math.min(alive.length, Math.ceil(short * alive.length / Math.max(1, need))));
        for (const s of hungry) {
          s.hp -= Math.round(G.maxHp(run, s) * 0.25);
          if (s.hp <= 0) {
            s.alive = false; s.hp = 0;
            run.fallen.push({ name: s.name, role: s.role, night: run.night });
            G.log(run, s.name + ' starved to death.', 'bad');
            out.push({ type: 'toast', text: s.name + ' starved to death.', kind: 'bad' });
          }
        }
        G.log(run, 'Breakfast: not enough food! ' + hungry.map((s) => s.name).join(', ') + ' went hungry.', 'bad');
        out.push({ type: 'toast', text: 'Not enough food! Some people went hungry. Staff a Farm.', kind: 'bad' });
        run.survivors = run.survivors.filter((s) => s.alive);
      } else {
        G.log(run, 'Breakfast: the camp ate ' + eaten + ' food.', 'neutral');
      }
    } else if (h === 10) {
      const ev = run.night >= 2 && U.chance(0.55) ? T.rollEvent(run) : null;
      if (ev) out.push({ type: 'event', ev });
    } else if (h === 12) {
      out.push({ type: 'save' });
    } else if (h === 17) {
      out.push({ type: 'toast', text: 'Workers outside are heading back before dark.', kind: 'neutral' });
    } else if (h === 18) {
      for (const s of run.survivors) {
        if (!s.alive || !s.job) continue;
        if (Geo.d(s.x, s.y) > 1 && s.job.st !== 'away') {
          const carry = s.carry;
          if (s.job.st === 'chop' || s.job.st === 'mine') {
            const list = s.job.st === 'chop' ? Scene.choppable : Scene.rocks;
            if (list[s.job.res]) list[s.job.res].users = Math.max(0, list[s.job.res].users - 1);
          }
          walk(s, carry ? dropFor(run, carry.k, B.byId(run, s.task)) : Geo.pt(Math.random() * U.TAU, 0.25), carry ? { st: 'deposit' } : null);
        }
      }
      const fc = LC.Night.forecast(run);
      out.push({ type: 'toast', text: 'Dusk. Night falls at 20:00. Threat tonight: ' + fc.label + '.', kind: fc.level >= 3 ? 'bad' : 'neutral' });
      out.push({ type: 'save' });
    } else if (h === 13) {
      if (G.freeBeds(run) > 0 && U.chance(Math.min(0.75, 0.3 + 0.15 * G.freeBeds(run)))) {
        const ev = LC.EVENTS.find((e) => e.id === 'stranger').make(run);
        if (ev) out.push({ type: 'event', ev });
      }
    } else if (h === 19) {
      const used = LC.Night.autoFeed(run, 1);
      const fmax = G.fireMax(run);
      if (run.fireFuel < fmax * 0.6) out.push({ type: 'toast', text: 'One hour until nightfall, and the fire is low! Get more wood.', kind: 'bad' });
      else out.push({ type: 'toast', text: 'One hour until nightfall.' + (used ? ' The fire keeper added ' + used + ' wood.' : ''), kind: 'neutral' });
      A.play('warn');
    } else if (h === 20) {
      T.toNight(run);
      out.push({ type: 'night' });
    } else if (h === 5) {
      out.push({ type: 'dawn' });
    }
    return out;
  };

  T.toNight = function (run) {
    for (const s of run.survivors) {
      if (!s.alive) continue;
      if (s.job && (s.job.st === 'chop' || s.job.st === 'mine')) {
        const list = s.job.st === 'chop' ? Scene.choppable : Scene.rocks;
        if (list[s.job.res]) list[s.job.res].users = Math.max(0, list[s.job.res].users - 1);
      }
      if (s.carry) { const g = {}; g[s.carry.k] = s.carry.n; G.addRes(run, s.carry.k, s.carry.n); s.carry = null; }
      if (s.hidden || Geo.d(s.x, s.y) > 0.95) {
        const gi = Geo.gateIn();
        s.x = gi.x + U.rand(-20, 20); s.y = gi.y + U.rand(-10, 0);
      }
      s.hidden = false; s.job = null; s.working = null;
    }
    for (const r of Scene.trees) r.users = 0;
    for (const r of Scene.rocks) r.users = 0;
  };

  T.rollEvent = function (run) {
    const pool = LC.EVENTS.filter((e) => !e.cond || e.cond(run)).map((e) => ({ w: e.w, v: e }));
    for (let tries = 0; tries < 4 && pool.length; tries++) {
      const ev = U.weighted(pool).make(run);
      if (ev) return ev;
    }
    return null;
  };

  function seasonLine(se) {
    const lines = ['🍂 Autumn returns. The forest grows quiet.', '❄ Winter has come. The fire burns hungrier and farms freeze.',
      '🌱 Spring. The snow melts and the fields can be worked again.', '☀ Summer. Long days and rich harvests.'];
    return lines[se.idx] + (se.year > 1 ? ' (Year ' + U.roman(se.year) + ': the dead grow stronger.)' : '');
  }
  T.seasonLine = seasonLine;
})(window.LC);
