/* Last Camp — daytime jobs, events and dusk construction */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, G = LC.Game;

  const Day = (LC.Day = {});

  Day.tasks = function (run) {
    const list = [
      { id: 'rest', label: 'Rest in camp' },
      { id: 'wood', label: 'Chop wood' },
      { id: 'forage', label: 'Hunt & forage' },
      { id: 'craft', label: 'Fletch arrows (2 wood)' },
    ];
    for (const l of LC.LOCS) if (run.night >= l.unlock) list.push({ id: 'scav:' + l.id, label: 'Scavenge: ' + l.name });
    return list;
  };

  Day.risk = function (run, s, base) {
    return U.clamp(base * (1 + run.night * 0.015) * (s.role === 'scavenger' ? 0.6 : 1) * (G.has(run, 'lucky') ? 0.65 : 1), 0, 0.9);
  };

  Day.richLabel = (r) => (r > 0.8 ? 'untouched' : r > 0.55 ? 'picked over' : r > 0.35 ? 'mostly empty' : 'stripped bare');

  Day.hint = function (run, s) {
    const t = s.task || 'rest';
    const max = G.maxHp(run, s);
    const medicHome = G.alive(run).some((o) => o.role === 'medic' && (o.task === 'rest' || o.task === 'craft'));
    if (t === 'rest') return 'Heals ' + Math.round(max * (medicHome ? 0.65 : 0.45)) + ' health' + (medicHome ? ' (medic in camp)' : '') + '.';
    if (t === 'craft') return '+' + Math.round((10 + s.lvl) * (G.has(run, 'fletcher') ? 1.5 : 1)) + ' arrows for 2 wood. Safe.';
    if (t === 'wood') {
      const lo = 6 + Math.floor(s.lvl / 2) + (s.role === 'builder' ? 2 : 0) + (G.has(run, 'lumberjack') ? 3 : 0);
      return 'Wood +' + lo + '–' + (lo + 3) + ' · risk ' + Math.round(Day.risk(run, s, 0.05) * 100) + '%';
    }
    if (t === 'forage') {
      const sm = [1, 0.6, 1, 1.3][G.season(run).idx];
      const lo = Math.max(1, Math.round((3 + Math.floor(s.lvl / 2) + (s.role === 'hunter' ? 2 : 0) + (G.has(run, 'keenhunters') ? 3 : 0)) * sm));
      const hi = Math.max(1, Math.round((6 + Math.floor(s.lvl / 2) + (s.role === 'hunter' ? 2 : 0) + (G.has(run, 'keenhunters') ? 3 : 0)) * sm));
      return 'Food +' + lo + '–' + hi + (sm !== 1 ? ' (' + G.season(run).name.toLowerCase() + ')' : '') + ' · risk ' + Math.round(Day.risk(run, s, 0.08) * 100) + '%';
    }
    if (t.indexOf('scav:') === 0) {
      const loc = LC.LOCS.find((l) => l.id === t.slice(5));
      if (!loc) return '';
      const st = run.locs[loc.id] || { rich: 1 };
      const keys = Object.keys(loc.loot).map((k) => LC.RES[k].toLowerCase()).join(', ');
      return keys + ' · ' + Day.richLabel(st.rich) + ' · risk ' + Math.round(Day.risk(run, s, loc.risk) * 100) + '%';
    }
    return '';
  };

  // resolve the day's work; returns a report
  Day.resolve = function (run) {
    const lines = [];
    const gains = { wood: 0, food: 0, scrap: 0, meds: 0, ammo: 0 };
    const deaths = [];
    const alive = G.alive(run);
    const medicHome = alive.some((s) => s.role === 'medic' && (s.task === 'rest' || s.task === 'craft'));
    const season = G.season(run);
    const n = run.night;
    const joiners = [];

    for (const s of alive) {
      const max = G.maxHp(run, s);
      const t = s.task || 'rest';
      if (t === 'rest') {
        const before = s.hp;
        s.hp = Math.min(max, s.hp + max * (medicHome ? 0.65 : 0.45));
        const healed = Math.round(s.hp - before);
        lines.push({ who: s.name, text: healed > 0 ? 'rested and recovered ' + healed + ' health.' : 'rested by the fire, already in good health.', kind: 'neutral' });
        continue;
      }
      if (t === 'craft') {
        s.hp = Math.min(max, s.hp + max * 0.1);
        if (run.res.wood >= 2) {
          run.res.wood -= 2;
          const amt = Math.round((10 + s.lvl) * (G.has(run, 'fletcher') ? 1.5 : 1));
          gains.ammo += amt;
          lines.push({ who: s.name, text: 'carved ' + amt + ' arrows from 2 wood.', kind: 'good' });
        } else {
          lines.push({ who: s.name, text: 'had no wood to make arrows, and rested instead.', kind: 'neutral' });
        }
        continue;
      }
      // trips outside
      s.hp = Math.min(max, s.hp + max * 0.1);
      let base = 0.05, place = 'the forest', got = {}, desc = '';
      if (t === 'wood') {
        base = 0.05;
        const amt = U.randi(6, 9) + Math.floor(s.lvl / 2) + (s.role === 'builder' ? 2 : 0) + (G.has(run, 'lumberjack') ? 3 : 0);
        got.wood = amt; desc = 'chopped ' + amt + ' wood';
      } else if (t === 'forage') {
        base = 0.08; place = 'the hunting grounds';
        const sm = [1, 0.6, 1, 1.3][season.idx];
        const amt = Math.max(1, Math.round((U.randi(3, 6) + Math.floor(s.lvl / 2) + (s.role === 'hunter' ? 2 : 0) + (G.has(run, 'keenhunters') ? 3 : 0)) * sm));
        got.food = amt; desc = 'brought back ' + amt + ' food';
      } else if (t.indexOf('scav:') === 0) {
        const loc = LC.LOCS.find((l) => l.id === t.slice(5));
        if (!loc || n < loc.unlock) { s.task = 'rest'; lines.push({ who: s.name, text: 'stayed in camp.', kind: 'neutral' }); continue; }
        base = loc.risk; place = loc.name;
        const st = run.locs[loc.id] || (run.locs[loc.id] = { rich: 1 });
        const mul = st.rich * (s.role === 'scavenger' ? 1.5 : 1) * (G.has(run, 'deeppockets') ? 1.3 : 1) * (1 + 0.05 * (s.lvl - 1));
        const parts = [];
        for (const k in loc.loot) {
          const [a, b] = loc.loot[k];
          const v = Math.round(U.rand(a, b) * mul);
          if (v > 0) { got[k] = v; parts.push(v + ' ' + LC.RES[k].toLowerCase()); }
        }
        st.rich = Math.max(0.25, st.rich - 0.15);
        desc = parts.length ? 'searched ' + loc.name + ': ' + parts.join(', ') : 'searched ' + loc.name + ' but found nothing';
        if (U.chance(0.1) && G.beds(run) > G.alive(run).length + joiners.length) {
          const role = U.pick(Object.keys(LC.ROLES));
          const ns = G.newSurvivor(run, role, U.clamp(1 + Math.floor(n / 6), 1, 5));
          joiners.push({ ns, finder: s.name });
        }
      }
      const risk = Day.risk(run, s, base);
      if (U.chance(risk)) {
        const dmg = Math.round(U.randi(15, 32) * (1 + n * 0.03));
        if (s.hp - dmg <= 0 || (s.hp < max * 0.4 && U.chance(0.25))) {
          s.alive = false; s.hp = 0;
          deaths.push(s.name);
          lines.push({ who: s.name, text: 'never came back from ' + place + '.', kind: 'bad' });
          continue;
        }
        s.hp -= dmg;
        lines.push({ who: s.name, text: desc + ', but was attacked on the way back (-' + dmg + ' health).', kind: 'bad' });
      } else {
        lines.push({ who: s.name, text: desc + '.', kind: 'good' });
      }
      for (const k in got) gains[k] += got[k];
    }
    for (const k in gains) run.res[k] += gains[k];

    for (const j of joiners) {
      if (!run.survivors.some((x) => x.alive && x.name === j.finder)) continue;
      run.survivors.push(j.ns);
      G.placeIdle(j.ns);
      lines.push({ who: j.ns.name, text: 'was found hiding in the ruins by ' + j.finder + ' and joins the camp (' + LC.ROLES[j.ns.role].name + ').', kind: 'good' });
    }

    // the dead are remembered
    run.survivors = run.survivors.filter((s) => {
      if (!s.alive) { run.fallen.push({ name: s.name, role: s.role, night: run.night }); return false; }
      return true;
    });

    // upkeep
    const need = G.foodNeed(run);
    let eaten = Math.min(need, run.res.food);
    run.res.food -= eaten;
    const short = need - eaten;
    const starving = [];
    if (short > 0) {
      const hungry = U.shuffle(G.alive(run).slice()).slice(0, Math.min(G.alive(run).length, Math.ceil(short / (need / Math.max(1, G.alive(run).length)))));
      for (const s of hungry) {
        const loss = Math.round(G.maxHp(run, s) * 0.25);
        s.hp -= loss;
        if (s.hp <= 0) {
          s.alive = false; s.hp = 0; deaths.push(s.name);
          lines.push({ who: s.name, text: 'starved to death.', kind: 'bad' });
        } else {
          starving.push(s.name);
        }
      }
      run.survivors = run.survivors.filter((s) => {
        if (!s.alive) { run.fallen.push({ name: s.name, role: s.role, night: run.night }); return false; }
        return true;
      });
    }
    for (const s of run.survivors) s.hp = Math.min(G.maxHp(run, s), Math.round(s.hp));
    return { lines, gains, eaten, short, starving, deaths };
  };

  Day.rollEvent = function (run) {
    if (run.night < 2 || !U.chance(0.55)) return null;
    const pool = LC.EVENTS.filter((e) => !e.cond || e.cond(run)).map((e) => ({ w: e.w, v: e }));
    if (!pool.length) return null;
    for (let tries = 0; tries < 4; tries++) {
      const ev = U.weighted(pool).make(run);
      if (ev) return ev;
    }
    return null;
  };

  // ---------- dusk construction ----------
  const Build = (LC.Build = {});
  const HP_PER_WOOD = 60;

  function wallMissing(run) {
    const max = G.wallMax(run);
    let miss = 0;
    for (let i = 0; i < C.SEG; i++) miss += max - Math.min(max, run.wallHp[i]);
    return miss;
  }

  Build.list = function (run) {
    const r = run.res;
    const fmax = G.fireMax(run);
    const fuelNeed = Math.ceil(Math.max(0, fmax - run.fireFuel) / C.FUEL_PER_WOOD);
    const miss = wallMissing(run);
    const hpw = HP_PER_WOOD * (G.has(run, 'quickhands') ? 1.33 : 1);
    const repairCost = Math.ceil(miss / hpw);
    const wmax = G.wallMax(run);
    const intactPct = Math.round(100 * (1 - miss / (wmax * C.SEG)));
    const items = [];
    items.push({ id: 'stoke', name: 'Stoke the fire', desc: 'Fuel ' + Math.floor(run.fireFuel) + ' / ' + fmax + '. 1 wood = ' + C.FUEL_PER_WOOD + ' fuel.',
      cost: { wood: Math.max(1, Math.min(fuelNeed, r.wood)) }, done: fuelNeed === 0, doneLabel: 'Full', partial: true });
    items.push({ id: 'repair', name: 'Repair the palisade', desc: intactPct + '% intact' + (run.wallBroken.some((b) => b) ? ' · has breaches!' : '') + ' · ' + repairCost + ' wood for a full repair (max 10 per click).',
      cost: { wood: Math.max(1, Math.min(repairCost, r.wood, 10)) }, done: miss <= 0, doneLabel: 'Intact', partial: true });
    items.push({ id: 'arrows', name: 'Fletch arrows', desc: '+10 arrows. You have ' + r.ammo + '.', cost: { wood: 2, scrap: 1 } });
    items.push({ id: 'tent', name: 'Pitch a tent', desc: 'Beds ' + G.beds(run) + ' → ' + (G.beds(run) + 2) + '. Room for newcomers.',
      cost: { wood: 10 + 5 * (run.tents - 2) }, done: run.tents >= 6, doneLabel: 'Max' });
    items.push({ id: 'tower', name: 'Build a watchtower', desc: run.towers + '/4 built. A survivor on a tower shoots arrows from above.',
      cost: { wood: 18, scrap: 6 }, done: run.towers >= 4, doneLabel: 'Max' });
    if (run.towers > 0) items.push({ id: 'towerlvl', name: 'Tower upgrades Lv ' + run.towerLvl, desc: '+25% tower damage, +25 range.',
      cost: { wood: 12 * run.towerLvl, scrap: 8 * run.towerLvl }, done: run.towerLvl >= 5, doneLabel: 'Max' });
    items.push({ id: 'trap', name: 'Set a spike trap', desc: run.traps + '/8 placed outside the wall. Hurts and slows.',
      cost: { wood: 6, scrap: 3 }, done: run.traps >= 8, doneLabel: 'Max' });
    if (run.traps > 0) items.push({ id: 'traplvl', name: 'Sharpen traps Lv ' + run.trapLvl, desc: '+45% trap damage.',
      cost: { wood: 8 * run.trapLvl, scrap: 6 * run.trapLvl }, done: run.trapLvl >= 5, doneLabel: 'Max' });
    items.push({ id: 'wall', name: 'Palisade Lv ' + run.wallLvl + (run.wallLvl < 5 ? ' → ' + (run.wallLvl + 1) : ''), desc: '+50% wall toughness and full repair.',
      cost: { wood: 20 * run.wallLvl, scrap: 8 * run.wallLvl }, done: run.wallLvl >= 5, doneLabel: 'Max' });
    items.push({ id: 'fire', name: 'Fire pit Lv ' + run.fireLvl + (run.fireLvl < 5 ? ' → ' + (run.fireLvl + 1) : ''), desc: '+30% fuel capacity and a wider light.',
      cost: { wood: 12 * run.fireLvl, scrap: 5 * run.fireLvl }, done: run.fireLvl >= 5, doneLabel: 'Max' });
    items.push({ id: 'armory', name: 'Armory Lv ' + run.armory + (run.armory < 5 ? ' → ' + (run.armory + 1) : ''), desc: 'Better weapons: +15% melee, +10% arrow damage.',
      cost: { wood: 6 * (run.armory + 1), scrap: 10 * (run.armory + 1) }, done: run.armory >= 5, doneLabel: 'Max' });
    for (const it of items) {
      it.afford = Object.keys(it.cost).every((k) => r[k] >= it.cost[k]);
      if (it.partial) it.afford = r.wood >= 1;
    }
    return items;
  };

  Build.apply = function (run, id) {
    const it = Build.list(run).find((x) => x.id === id);
    if (!it || it.done || !it.afford) return false;
    const r = run.res;
    if (id === 'stoke') {
      const fmax = G.fireMax(run);
      const need = Math.ceil(Math.max(0, fmax - run.fireFuel) / C.FUEL_PER_WOOD);
      const use = Math.min(need, r.wood);
      r.wood -= use;
      run.fireFuel = Math.min(fmax, run.fireFuel + use * C.FUEL_PER_WOOD);
      return true;
    }
    if (id === 'repair') {
      const max = G.wallMax(run);
      const hpw = HP_PER_WOOD * (G.has(run, 'quickhands') ? 1.33 : 1);
      const need = Math.ceil(wallMissing(run) / hpw);
      const use = Math.min(need, r.wood, 10);
      r.wood -= use;
      let pool = use * hpw;
      const order = [];
      for (let i = 0; i < C.SEG; i++) order.push(i);
      order.sort((a, b) => run.wallHp[a] - run.wallHp[b]);
      for (const i of order) {
        if (pool <= 0) break;
        const add = Math.min(pool, max - run.wallHp[i]);
        if (add <= 0) continue;
        run.wallHp[i] += add; pool -= add;
        if (run.wallHp[i] >= max * 0.3) run.wallBroken[i] = false;
      }
      return true;
    }
    for (const k in it.cost) r[k] -= it.cost[k];
    run.stats.built++;
    switch (id) {
      case 'arrows': r.ammo += 10; break;
      case 'tent': run.tents++; break;
      case 'tower': run.towers++; break;
      case 'towerlvl': run.towerLvl++; break;
      case 'trap': run.traps++; break;
      case 'traplvl': run.trapLvl++; break;
      case 'wall': {
        run.wallLvl++;
        const max = G.wallMax(run);
        for (let i = 0; i < C.SEG; i++) { run.wallHp[i] = max; run.wallBroken[i] = false; }
        break;
      }
      case 'fire': run.fireLvl++; break;
      case 'armory': run.armory++; break;
      default: break;
    }
    return true;
  };
})(window.LC);
