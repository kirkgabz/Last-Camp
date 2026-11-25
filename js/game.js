/* Last Camp — run state, derived stats, geometry, save/load */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C;

  // ---------- geometry of the camp (ellipse metric: 1.0 = palisade line) ----------
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
  Geo.clampIn = (x, y, maxD) => {
    const d = Geo.d(x, y);
    if (d <= maxD) return { x, y };
    const k = maxD / d;
    return { x: C.CX + (x - C.CX) * k, y: C.CY + (y - C.CY) * k };
  };
  Geo.towerPos = (i) => Geo.pt(LC.TOWER_ANGLES[i], 1.0);
  Geo.trapPos = (i) => Geo.pt(LC.TRAP_ANGLES[i], 1.27);
  Geo.intact = (run, i) => !run.wallBroken[i];
  Geo.dirName = (a) => {
    const names = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
    let k = Math.round(((a % U.TAU) + U.TAU) % U.TAU / (Math.PI / 4)) % 8;
    return names[k];
  };

  // ---------- game rules ----------
  const G = (LC.Game = {});
  G.has = (run, id) => run.perks.indexOf(id) >= 0;
  G.metaLvl = (run, id) => (run.meta && run.meta[id]) || 0;
  G.alive = (run) => run.survivors.filter((s) => s.alive);
  G.beds = (run) => run.tents * 2;
  G.maxHp = (run, s) => Math.round(LC.ROLES[s.role].hp * (1 + 0.12 * (s.lvl - 1)) * (G.has(run, 'thickskin') ? 1.2 : 1));
  G.meleeDmg = (run, s) => LC.ROLES[s.role].melee * (1 + 0.1 * (s.lvl - 1)) * (1 + 0.15 * run.armory) * (G.has(run, 'steelnerves') ? 1.2 : 1);
  G.rangedDmg = (run, s) => (LC.ROLES[s.role].ranged || 8) * (1 + 0.1 * (s.lvl - 1)) * (1 + 0.1 * run.armory) * (G.has(run, 'eagleeye') ? 1.25 : 1);
  G.towerDmg = (run, s) => G.rangedDmg(run, s) * (1 + 0.25 * (run.towerLvl - 1)) * (s.role === 'hunter' ? 1 : 1.15);
  G.towerRange = (run) => 250 + 25 * (run.towerLvl - 1) + (G.has(run, 'eagleeye') ? 40 : 0);
  G.trapDps = (run) => 16 * (1 + 0.45 * (run.trapLvl - 1)) * (G.has(run, 'sharpstakes') ? 1.5 : 1);
  G.fireMax = (run) => Math.round(100 * (1 + 0.3 * (run.fireLvl - 1)) * (G.has(run, 'warmhearth') ? 1.3 : 1) * (1 + 0.15 * G.metaLvl(run, 'hearth')));
  G.wallMax = (run) => Math.round(140 * (1 + 0.5 * (run.wallLvl - 1)) * (G.has(run, 'ironpalisade') ? 1.3 : 1) * (1 + 0.15 * G.metaLvl(run, 'fortified')));
  G.season = (run) => {
    const i = Math.floor((run.night - 1) / 7) % 4;
    return { idx: i, name: LC.SEASONS[i], year: Math.floor((run.night - 1) / 28) + 1, dayOf: ((run.night - 1) % 7) + 1 };
  };
  G.burnRate = (run) => {
    const s = G.season(run).idx;
    return 0.85 * (s === 1 ? 1.25 : s === 3 ? 0.9 : 1) * (G.has(run, 'longburn') ? 0.8 : 1);
  };
  G.foodNeed = (run) => {
    const n = G.alive(run).length;
    return G.has(run, 'rationing') ? Math.ceil(n * 0.7) : n;
  };
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
      id: run.nextId++, name: U.pick(pool), role: role, lvl: lvl || 1, xp: 0, hp: 1, alive: true, task: 'rest',
      look: {
        skin: U.pick(L.skin), hair: U.pick(L.hair), hairStyle: style,
        beard: style !== 'long' && style !== 'ponytail' && style !== 'bun' && U.chance(0.35),
        shirt: U.pick(L.shirt), pants: U.pick(L.pants), coat: LC.ROLES[role].coat, hat: U.pick(L.hat), boots: U.pick(L.boots),
      },
      x: C.CX, y: C.CY + 60, face: 1, phase: 0, moving: false,
      tower: -1, onTower: false, postX: C.CX, postY: C.CY + 60,
      cd: 0, atk: 0, hurt: 0, aimT: 0, working: false, wait: 0, wx: null, wy: null, deathT: 0,
    };
    s.hp = G.maxHp(run, s);
    return s;
  };

  G.placeIdle = function (s) {
    const a = Math.random() * U.TAU;
    const p = Geo.pt(a, U.rand(0.3, 0.7));
    s.x = p.x; s.y = p.y; s.wx = null; s.wy = null; s.wait = U.rand(0, 2);
  };

  G.newRun = function (meta) {
    const m = Object.assign({}, (meta && meta.upg) || {});
    const run = {
      v: 1, night: 1, phase: 'day',
      res: {
        wood: 30 + 10 * (m.stockpile || 0), food: 12 + 6 * (m.stockpile || 0), scrap: 4 + 2 * (m.stockpile || 0),
        meds: 2, ammo: 30 + 20 * (m.quiver || 0),
      },
      survivors: [], fallen: [], tents: 2,
      fireLvl: 1, fireFuel: 0, wallLvl: 1, wallHp: [], wallBroken: [],
      towers: 0, towerLvl: 1, traps: 0, trapLvl: 1, armory: 0,
      perks: [], locs: {}, flags: {}, stats: { kills: 0, nightsSurvived: 0, built: 0 },
      nextId: 1, meta: m,
    };
    const roles = ['fighter', 'hunter', 'builder'];
    if ((m.settlers || 0) >= 1) roles.push('scavenger');
    if ((m.settlers || 0) >= 2) roles.push('medic');
    const lvl = m.veterans ? 2 : 1;
    for (const r of roles) {
      const s = G.newSurvivor(run, r, lvl);
      G.placeIdle(s);
      run.survivors.push(s);
    }
    run.tents = Math.max(2, Math.ceil(run.survivors.length / 2));
    run.fireFuel = G.fireMax(run);
    const wm = G.wallMax(run);
    for (let i = 0; i < C.SEG; i++) { run.wallHp.push(wm); run.wallBroken.push(false); }
    for (const l of LC.LOCS) run.locs[l.id] = { rich: 1 };
    return run;
  };

  // called when a night is survived
  G.dawn = function (run) {
    const fallen = [];
    run.survivors = run.survivors.filter((s) => {
      if (!s.alive) { run.fallen.push({ name: s.name, role: s.role, night: run.night }); fallen.push(s.name); return false; }
      return true;
    });
    for (const s of run.survivors) {
      s.tower = -1; s.onTower = false; s.atk = 0; s.hurt = 0; s.aimT = 0; s.working = false; s.wx = null; s.wy = null;
      if (G.has(run, 'secondwind')) s.hp += G.maxHp(run, s) * 0.25;
      s.hp = Math.min(G.maxHp(run, s), Math.max(1, Math.round(s.hp)));
    }
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
  G.save = function (run) {
    if (!run || (run.phase !== 'day' && run.phase !== 'dusk')) return;
    U.store.set(key(C.SAVE_KEY), run);
    cloudPush();
  };
  G.load = function () {
    const r = U.store.get(key(C.SAVE_KEY), null);
    if (!r || r.v !== 1 || !Array.isArray(r.survivors) || !r.res || !Array.isArray(r.wallHp)) return null;
    if (r.phase !== 'day' && r.phase !== 'dusk') r.phase = 'day';
    for (const s of r.survivors) { s.tower = -1; s.onTower = false; s.atk = 0; s.hurt = 0; s.aimT = 0; s.working = false; s.wx = null; s.wy = null; }
    r.survivors = r.survivors.filter((s) => s.alive);
    if (!r.survivors.length) return null;
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
