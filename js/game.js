/* Last Camp — run state, rules, buildings, camp geometry, save/load */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C;

  // ---------- geometry (ellipse metric: 1.0 = palisade line) ----------
  const Geo = (LC.Geo = {});
  Geo.d = (x, y) => Math.hypot((x - C.CX) / C.RX, (y - C.CY) / C.RY);
  Geo.ang = (x, y) => Math.atan2((y - C.CY) / C.RY, (x - C.CX) / C.RX);
  Geo.pt = (a, d) => ({ x: C.CX + Math.cos(a) * C.RX * d, y: C.CY + Math.sin(a) * C.RY * d });
  Geo.seg = (x, y) => {
    let a = Geo.ang(x, y);
    if (a < 0) a += U.TAU;
    return Math.min(C.SEG - 1, Math.floor(a / U.TAU * C.SEG));
  };
  Geo.segMid = (i) => (i + 0.5) / C.SEG * U.TAU;
  Geo.isGate = (i) => C.GATE_SEGS.indexOf(i) >= 0;
  Geo.clampIn = (x, y, maxD) => {
    const d = Geo.d(x, y);
    if (d <= maxD) return { x, y };
    const k = maxD / d;
    return { x: C.CX + (x - C.CX) * k, y: C.CY + (y - C.CY) * k };
  };
  Geo.gateIn = () => Geo.pt(Math.PI / 2, 0.84);
  Geo.gateOut = () => Geo.pt(Math.PI / 2, 1.16);
  Geo.towerPos = (slot) => Geo.pt(LC.TOWER_ANGLES[slot], 1.0);
  Geo.trapPos = (slot) => Geo.pt(LC.TRAP_ANGLES[slot], 1.2);
  Geo.plotPos = (p) => ({ x: C.CX + LC.PLOTS[p][0], y: C.CY + LC.PLOTS[p][1] });
  Geo.dirName = (a) => {
    const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    return names[Math.round(((a % U.TAU) + U.TAU) % U.TAU / (Math.PI / 4)) % 8];
  };

  // ---------- buildings ----------
  const B = (LC.Bld = {});
  B.def = (t) => LC.BUILDINGS[t];
  B.all = (run, type) => run.buildings.filter((b) => b.type === type);
  B.get = (run, type) => run.buildings.find((b) => b.type === type) || null;
  B.byId = (run, id) => run.buildings.find((b) => b.id === id) || null;
  B.lvl = (run, type) => { const b = B.get(run, type); return b ? b.lvl : 0; };
  B.stat = (type, key, lvl) => (lvl > 0 ? B.def(type).stats[key][Math.min(lvl, C.BMAX) - 1] : 0);
  B.cost = (type, lvl) => B.def(type).cost[lvl - 1] || {};
  B.hours = (type, lvl) => B.def(type).hours[lvl - 1] || 0;
  B.slots = (b) => { const w = B.def(b.type).workers; return w && b.lvl > 0 ? w[b.lvl - 1] : 0; };
  B.pos = (b) => {
    const d = B.def(b.type);
    if (d.place === 'plot') return Geo.plotPos(b.plot);
    if (d.place === 'tower') return Geo.towerPos(b.slot);
    if (d.place === 'trap') return Geo.trapPos(b.slot);
    if (b.type === 'gate') return Geo.pt(Math.PI / 2, 1.0);
    if (b.type === 'wall') return Geo.pt(-Math.PI / 2, 1.0);
    return { x: C.CX, y: C.CY };
  };
  B.door = (b) => { const p = B.pos(b); return B.def(b.type).place === 'plot' ? { x: p.x, y: p.y + 14 } : p; };
  B.staff = (run, b) => run.survivors.filter((s) => s.alive && s.task === b.id);
  B.active = (run, b) => b.lvl > 0 && (!B.def(b.type).workers || B.staff(run, b).length > 0);
  B.canAfford = (run, cost) => Object.keys(cost).every((k) => (run.res[k] || 0) >= cost[k]);
  B.pay = (run, cost) => { for (const k in cost) run.res[k] -= cost[k]; };
  B.usedPlots = (run) => new Set(run.buildings.filter((b) => b.plot !== undefined && b.plot !== null).map((b) => b.plot));
  B.usedSlots = (run, type) => new Set(B.all(run, type).map((b) => b.slot));
  B.count = (run, type) => B.all(run, type).length;

  B.canPlace = function (run, type) {
    const d = B.def(type);
    if (B.count(run, type) >= d.max) return 'You already have the most of these.';
    if (d.place === 'plot' && B.usedPlots(run).size >= LC.PLOTS.length) return 'No free building plots.';
    if (d.place === 'tower' && B.usedSlots(run, 'tower').size >= LC.TOWER_ANGLES.length) return 'No free tower spots.';
    if (d.place === 'trap' && B.usedSlots(run, 'trap').size >= LC.TRAP_ANGLES.length) return 'No free trap spots.';
    if (!B.canAfford(run, B.cost(type, 1))) return 'Not enough resources.';
    return null;
  };

  // start construction of a new building (pays now; builders do the work)
  B.place = function (run, type, where) {
    if (B.canPlace(run, type)) return null;
    const d = B.def(type);
    const b = { id: run.nextBid++, type, lvl: 0, target: 1, progress: 0, need: B.hours(type, 1), started: run.clock };
    if (d.place === 'plot') { if (B.usedPlots(run).has(where)) return null; b.plot = where; }
    if (d.place === 'tower' || d.place === 'trap') { if (B.usedSlots(run, type).has(where)) return null; b.slot = where; }
    B.pay(run, B.cost(type, 1));
    run.buildings.push(b);
    run.stats.built++;
    return b;
  };

  B.upgradeBlock = function (run, b) {
    if (b.target) return 'Construction already in progress.';
    if (b.lvl >= C.BMAX) return 'Maximum level.';
    if (!B.canAfford(run, B.cost(b.type, b.lvl + 1))) return 'Not enough resources.';
    return null;
  };
  B.upgrade = function (run, b) {
    if (B.upgradeBlock(run, b)) return false;
    B.pay(run, B.cost(b.type, b.lvl + 1));
    b.target = b.lvl + 1;
    b.progress = 0;
    b.need = B.hours(b.type, b.target);
    b.started = run.clock;
    return true;
  };
  B.cancel = function (run, b) {
    if (!b.target) return false;
    const c = B.cost(b.type, b.target);
    for (const k in c) G.addRes(run, k, Math.floor(c[k] * 0.5));
    if (b.lvl === 0) {
      run.buildings = run.buildings.filter((x) => x !== b);
      for (const s of run.survivors) if (s.task === b.id) { s.task = 'idle'; s.job = null; }
    } else { b.target = null; b.progress = 0; }
    return true;
  };
  B.complete = function (run, b) {
    const before = b.lvl;
    b.lvl = b.target;
    b.target = null;
    b.progress = 0;
    if (b.type === 'wall' || b.type === 'gate') {
      for (let i = 0; i < C.SEG; i++) {
        if (Geo.isGate(i) !== (b.type === 'gate')) continue;
        run.wallHp[i] = G.segMax(run, i);
        run.wallBroken[i] = false;
      }
    }
    return before;
  };
  B.sites = (run) => run.buildings.filter((b) => b.target).sort((a, b) => a.started - b.started);

  // ---------- game rules ----------
  const G = (LC.Game = {});
  G.has = (run, id) => run.perks.indexOf(id) >= 0;
  G.metaLvl = (run, id) => (run.meta && run.meta[id]) || 0;
  G.alive = (run) => run.survivors.filter((s) => s.alive);
  G.beds = (run) => B.all(run, 'house').reduce((n, b) => n + B.stat('house', 'beds', b.lvl), 0);
  G.freeBeds = (run) => G.beds(run) - G.alive(run).length;
  G.hour = (run) => ((run.clock % 24) + 24) % 24;
  G.phase = (run) => {
    const h = G.hour(run);
    if (h >= C.DAY_START && h < C.DUSK) return 'day';
    if (h >= C.DUSK && h < C.NIGHT_START) return 'dusk';
    if (h >= C.DAWN && h < C.DAY_START) return 'dawn';
    return 'night';
  };
  G.caps = function (run) {
    const sh = B.get(run, 'storehouse');
    const extra = sh ? B.stat('storehouse', 'cap', sh.lvl) : 0;
    const c = LC.BASE_CAP;
    return { wood: c.wood + extra, stone: c.stone + extra, food: c.food + extra, scrap: c.scrap + Math.round(extra / 2), meds: c.meds + Math.round(extra / 10), ammo: c.ammo + extra };
  };
  G.addRes = function (run, k, v) {
    const cap = G.caps(run)[k];
    const before = run.res[k];
    run.res[k] = Math.min(cap, run.res[k] + v);
    if (run.res[k] < before) run.res[k] = before; // never lose stock that was already above a cap
    return run.res[k] - before;
  };
  G.armory = (run) => {
    const b = B.get(run, 'armory');
    if (!b || !B.active(run, b)) return { melee: 0, ranged: 0 };
    return { melee: B.stat('armory', 'melee', b.lvl) / 100, ranged: B.stat('armory', 'ranged', b.lvl) / 100 };
  };
  G.maxHp = (run, s) => Math.round(LC.ROLES[s.role].hp * (1 + 0.12 * (s.lvl - 1)) * (G.has(run, 'thickskin') ? 1.2 : 1));
  G.meleeDmg = (run, s) => LC.ROLES[s.role].melee * (1 + 0.1 * (s.lvl - 1)) * (1 + G.armory(run).melee) * (G.has(run, 'steelnerves') ? 1.2 : 1);
  G.rangedDmg = (run, s) => (LC.ROLES[s.role].ranged || 7) * (1 + 0.1 * (s.lvl - 1)) * (1 + G.armory(run).ranged) * (G.has(run, 'eagleeye') ? 1.25 : 1);
  G.towerDmg = (run, s, lvl) => G.rangedDmg(run, s) * B.stat('tower', 'dmg', lvl) / 100 * (s.role === 'archer' ? 1.25 : 1);
  G.towerRange = (run, lvl) => B.stat('tower', 'range', lvl) + (G.has(run, 'eagleeye') ? 40 : 0);
  G.trapDps = (run, lvl) => B.stat('trap', 'dps', lvl) * (G.has(run, 'sharpstakes') ? 1.5 : 1);
  G.fireLvl = (run) => Math.max(1, B.lvl(run, 'fire'));
  G.fireMax = (run) => Math.round(B.stat('fire', 'fuel', G.fireLvl(run)) * (G.has(run, 'warmhearth') ? 1.3 : 1) * (1 + 0.15 * G.metaLvl(run, 'hearth')));
  G.segMax = (run, i) => {
    const gate = Geo.isGate(i);
    const lvl = Math.max(1, B.lvl(run, gate ? 'gate' : 'wall'));
    return Math.round(B.stat(gate ? 'gate' : 'wall', 'hp', lvl) * (G.has(run, 'ironpalisade') ? 1.3 : 1) * (1 + 0.15 * G.metaLvl(run, 'fortified')));
  };
  G.season = (run) => {
    const i = Math.floor((run.night - 1) / 7) % 4;
    return { idx: i, name: LC.SEASONS[i], year: Math.floor((run.night - 1) / 28) + 1, dayOf: ((run.night - 1) % 7) + 1 };
  };
  G.burnRate = (run) => {
    const s = G.season(run).idx;
    return 0.85 * (s === 1 ? 1.25 : s === 3 ? 0.9 : 1) * (G.has(run, 'longburn') ? 0.8 : 1);
  };
  // wood to keep back so the fire lasts the night
  G.fireReserve = (run) => Math.max(0, Math.ceil((G.burnRate(run) * C.NIGHT_LEN - run.fireFuel * 0.5) / C.FUEL_PER_WOOD)) + 3;
  G.foodNeed = (run) => {
    const n = G.alive(run).length;
    return G.has(run, 'rationing') ? Math.ceil(n * 0.7) : n;
  };
  G.roleMul = (s, job) => (LC.ROLES[s.role].job === job ? 1.5 : 1);
  G.xpNeed = (lvl) => 25 + lvl * 25;
  G.addXp = (run, s, xp) => {
    if (!s.alive || s.lvl >= C.MAX_LVL) return false;
    s.xp += xp;
    let up = false;
    while (s.lvl < C.MAX_LVL && s.xp >= G.xpNeed(s.lvl)) {
      s.xp -= G.xpNeed(s.lvl);
      const before = G.maxHp(run, s);
      s.lvl++;
      const after = G.maxHp(run, s);
      s.hp = Math.min(after, s.hp + (after - before) + after * 0.2);
      up = true;
    }
    if (s.lvl >= C.MAX_LVL) s.xp = 0;
    return up;
  };
  // rough measure of the camp's fighting strength (keeps early nights fair)
  G.defensePower = function (run) {
    let p = 0;
    for (const s of G.alive(run)) p += (0.75 + 0.12 * (s.lvl - 1)) * (s.role === 'fighter' || s.role === 'archer' ? 1.25 : 1);
    for (const t of B.all(run, 'tower')) if (t.lvl > 0) p += 0.5 + 0.25 * t.lvl;
    for (const t of B.all(run, 'trap')) if (t.lvl > 0) p += 0.2 + 0.1 * t.lvl;
    p += (Math.max(1, B.lvl(run, 'wall')) - 1) * 0.5 + (Math.max(1, B.lvl(run, 'gate')) - 1) * 0.25;
    return p;
  };

  G.log = function (run, text, kind) {
    run.log.push({ n: run.night, h: Math.floor(G.hour(run)), text, kind: kind || 'neutral' });
    if (run.log.length > 60) run.log.splice(0, run.log.length - 60);
  };

  G.resetRuntime = (s) => {
    s.moving = false; s.tower = -1; s.onTower = false; s.cd = 0; s.atk = 0; s.hurt = 0; s.aimT = 0;
    s.working = null; s.job = null; s.hidden = false; s.carry = null; s.deathT = 0; s.postX = s.x; s.postY = s.y;
  };

  G.newSurvivor = function (run, role, lvl) {
    const used = new Set(run.survivors.filter((s) => s.alive).map((s) => s.name));
    let pool = LC.NAMES.filter((n) => !used.has(n));
    if (!pool.length) pool = LC.NAMES;
    const L = LC.LOOKS;
    const style = U.weighted([
      { w: 3, v: 'short' }, { w: 2, v: 'long' }, { w: 1.4, v: 'ponytail' }, { w: 1, v: 'bun' },
      { w: 1.2, v: 'beanie' }, { w: 1, v: 'cap' }, { w: 0.8, v: 'bald' },
    ]);
    const s = {
      id: run.nextId++, name: U.pick(pool), role, lvl: lvl || 1, xp: 0, hp: 1, alive: true, task: 'idle',
      look: {
        skin: U.pick(L.skin), hair: U.pick(L.hair), hairStyle: style,
        beard: style !== 'long' && style !== 'ponytail' && style !== 'bun' && U.chance(0.35),
        shirt: U.pick(L.shirt), pants: U.pick(L.pants), hat: U.pick(L.hat), boots: U.pick(L.boots),
      },
      x: C.CX, y: C.CY + 60, face: 1, phase: 0,
    };
    G.resetRuntime(s);
    s.hp = G.maxHp(run, s);
    return s;
  };
  G.placeIdle = function (s) {
    const p = Geo.pt(Math.random() * U.TAU, U.rand(0.15, 0.32));
    s.x = p.x; s.y = p.y;
    G.resetRuntime(s);
  };
  G.addSurvivor = function (run, s) {
    s.task = 'idle';
    const gi = Geo.gateIn();
    s.x = gi.x + U.rand(-15, 15); s.y = gi.y;
    G.resetRuntime(s);
    run.survivors.push(s);
    G.log(run, s.name + ' (' + LC.ROLES[s.role].name + ') joined the camp.', 'good');
  };

  G.newRun = function (meta) {
    const m = Object.assign({}, (meta && meta.upg) || {});
    const run = {
      v: 2, night: 1, clock: 7, phase: 'play', // clock = game hours since the start; day 1 begins at 07:00
      res: {
        wood: 60 + 15 * (m.stockpile || 0), stone: 10 + 10 * (m.stockpile || 0), food: 20 + 8 * (m.stockpile || 0),
        scrap: 6, meds: 2, ammo: 30 + 25 * (m.quiver || 0),
      },
      survivors: [], fallen: [], buildings: [], log: [],
      fireFuel: 0, wallHp: [], wallBroken: [],
      perks: [], locs: {}, flags: {}, stats: { kills: 0, nightsSurvived: 0, built: 0 },
      expedition: 'farm', autoFire: true, nextId: 1, nextBid: 1, meta: m,
    };
    const prebuilt = [
      { type: 'fire' }, { type: 'wall' }, { type: 'gate' },
      { type: 'house', plot: 0 }, { type: 'house', plot: 2 },
      { type: 'farm', plot: 4 }, { type: 'mill', plot: 16 },
    ];
    for (const p of prebuilt) run.buildings.push(Object.assign({ id: run.nextBid++, lvl: 1, target: null, progress: 0, need: 0, started: 0 }, p));
    const roles = ['lumberjack', 'farmer', 'builder'];
    if ((m.settlers || 0) >= 1) roles.push('fighter');
    if ((m.settlers || 0) >= 2) roles.push('medic');
    const lvl = m.veterans ? 2 : 1;
    const farm = B.get(run, 'farm'), mill = B.get(run, 'mill');
    for (const r of roles) {
      const s = G.newSurvivor(run, r, lvl);
      G.placeIdle(s);
      s.task = r === 'lumberjack' ? mill.id : r === 'farmer' ? farm.id : r === 'builder' ? 'build' : 'idle';
      run.survivors.push(s);
    }
    if (G.beds(run) < run.survivors.length) run.buildings.push({ id: run.nextBid++, type: 'house', plot: 1, lvl: 1, target: null, progress: 0, need: 0, started: 0 });
    run.fireFuel = G.fireMax(run);
    for (let i = 0; i < C.SEG; i++) { run.wallHp.push(G.segMax(run, i)); run.wallBroken.push(false); }
    for (const l of LC.LOCS) run.locs[l.id] = { rich: 1 };
    G.log(run, 'Day 1. A handful of survivors, one fire, and a long winter ahead.', 'neutral');
    return run;
  };

  // called at 06:00 after a night is survived
  G.dawn = function (run) {
    const fallen = [];
    run.survivors = run.survivors.filter((s) => {
      if (!s.alive) { run.fallen.push({ name: s.name, role: s.role, night: run.night }); fallen.push(s.name); return false; }
      return true;
    });
    for (const s of run.survivors) {
      G.resetRuntime(s);
      if (G.has(run, 'secondwind')) s.hp += G.maxHp(run, s) * 0.25;
      s.hp = Math.min(G.maxHp(run, s), Math.max(1, Math.round(s.hp)));
    }
    for (const b of run.buildings) if (b.type === 'tower' && b.guard && !run.survivors.some((s) => s.id === b.guard)) b.guard = null;
    const prevSeason = G.season(run).idx;
    run.stats.nightsSurvived = run.night;
    run.night++;
    for (const id in run.locs) run.locs[id].rich = Math.min(1, run.locs[id].rich + 0.06);
    run.flags = {};
    return { fallen, newSeason: G.season(run).idx !== prevSeason, perkDue: (run.night - 1) % 3 === 0 };
  };

  G.perkChoices = (run) => U.shuffle(LC.PERKS.filter((p) => !G.has(run, p.id))).slice(0, 3);
  G.embersFor = (run) => run.stats.nightsSurvived * 2 + Math.floor(run.stats.kills / 10);

  // ---------- persistence (local cache per account, mirrored to the cloud) ----------
  const key = (base) => (LC.Cloud ? LC.Cloud.key(base) : base);
  const cloudPush = () => { if (LC.Cloud) LC.Cloud.queuePush(); };
  G.saveable = (run) => !!run && run.phase === 'play' && (G.phase(run) === 'day' || G.phase(run) === 'dusk');
  G.save = function (run) {
    if (!G.saveable(run)) return false;
    const copy = JSON.parse(JSON.stringify(run, (k, v) => (k === 'job' || k === 'carry' ? undefined : v)));
    U.store.set(key(C.SAVE_KEY), copy);
    cloudPush();
    return true;
  };
  G.load = function () {
    const r = U.store.get(key(C.SAVE_KEY), null);
    if (!r || r.v !== 2 || !Array.isArray(r.survivors) || !r.res || !Array.isArray(r.buildings) || !Array.isArray(r.wallHp)) return null;
    r.survivors = r.survivors.filter((s) => s.alive);
    if (!r.survivors.length) return null;
    for (const s of r.survivors) G.resetRuntime(s);
    for (const k of LC.RES_KEYS) if (typeof r.res[k] !== 'number') r.res[k] = 0;
    if (!r.log) r.log = [];
    if (!r.flags) r.flags = {};
    const h = G.hour(r);
    if (h < C.DAY_START || h >= C.NIGHT_START) r.clock = Math.floor(r.clock / 24) * 24 + C.DAY_START + (h >= C.NIGHT_START ? 24 : 0);
    r.phase = 'play';
    return r;
  };
  G.hasSave = () => !!G.load();
  G.clearSave = () => { U.store.del(key(C.SAVE_KEY)); cloudPush(); };
  G.loadMeta = function () {
    const m = U.store.get(key(C.META_KEY), null) || {};
    return { embers: m.embers || 0, best: m.best || 0, runs: m.runs || 0, totalKills: m.totalKills || 0, upg: m.upg || {} };
  };
  G.saveMeta = (meta) => { U.store.set(key(C.META_KEY), meta); cloudPush(); };
})(window.LC);
