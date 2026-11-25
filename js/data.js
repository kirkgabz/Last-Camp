/* Last Camp — game data: constants, roles, enemies, perks, events */
(function (LC) {
  'use strict';
  const U = LC.U;

  LC.C = {
    W: 1280, H: 720,
    CX: 700, CY: 395, RX: 290, RY: 185, // camp centre and palisade ellipse
    SEG: 20, LOGS: 8,                    // wall segments, logs per segment
    NIGHT_LEN: 80,                       // seconds of game time per night
    FUEL_PER_WOOD: 20,
    MAX_LVL: 10,
    SAVE_KEY: 'lastcamp.save.v1',
    META_KEY: 'lastcamp.meta.v1',
  };

  LC.SEASONS = ['Autumn', 'Winter', 'Spring', 'Summer'];
  LC.RES = { wood: 'Wood', food: 'Food', scrap: 'Scrap', meds: 'Medicine', ammo: 'Arrows' };

  LC.ROLES = {
    fighter:   { name: 'Fighter',   hp: 120, melee: 14, ranged: 0,  tool: 'axe',     coat: '#5b3a26', color: '#e0614f', desc: 'Tough. Hits hard up close.' },
    hunter:    { name: 'Hunter',    hp: 90,  melee: 8,  ranged: 12, tool: 'bow',     coat: '#4a5a34', color: '#86c06c', desc: 'Shoots arrows. Better at hunting food.' },
    scavenger: { name: 'Scavenger', hp: 85,  melee: 9,  ranged: 9,  tool: 'crowbar', coat: '#6a5a44', color: '#62a8e6', desc: '+50% loot and fewer accidents on trips.' },
    builder:   { name: 'Builder',   hp: 105, melee: 10, ranged: 8,  tool: 'hammer',  coat: '#7d6a3c', color: '#e8b54a', desc: 'Repairs the wall during the night. Chops more wood.' },
    medic:     { name: 'Medic',     hp: 85,  melee: 7,  ranged: 8,  tool: 'knife',   coat: '#d9d4c7', color: '#f0f0f0', desc: 'Heals others at night. Resting heals more while home.' },
  };

  LC.LOCS = [
    { id: 'farm',     name: 'Burnt Farmhouse',    risk: 0.08, unlock: 1, loot: { scrap: [2, 5], food: [0, 3], meds: [0, 1] } },
    { id: 'town',     name: 'Old Town',           risk: 0.15, unlock: 3, loot: { scrap: [3, 7], food: [2, 5], ammo: [0, 8] } },
    { id: 'hospital', name: 'St. Agnes Hospital', risk: 0.22, unlock: 5, loot: { meds: [2, 4], scrap: [1, 4] } },
    { id: 'outpost',  name: 'Military Outpost',   risk: 0.30, unlock: 8, loot: { scrap: [5, 10], ammo: [10, 18], meds: [0, 2] } },
  ];

  LC.ENEMIES = {
    walker:   { name: 'Hollow',       hp: 40,   speed: 28, dmg: 4,  cd: 1.3, wallDmg: 6,   r: 11, xp: 4,   cost: 1,   hitH: 26 },
    runner:   { name: 'Runner',       hp: 24,   speed: 56, dmg: 3,  cd: 0.9, wallDmg: 3,   r: 10, xp: 4,   cost: 1,   hitH: 24 },
    brute:    { name: 'Brute',        hp: 160,  speed: 19, dmg: 12, cd: 1.8, wallDmg: 20,  r: 17, xp: 14,  cost: 4.5, hitH: 40 },
    wolf:     { name: 'Gaunt Wolf',   hp: 32,   speed: 78, dmg: 4,  cd: 0.8, wallDmg: 2,   r: 12, xp: 5,   cost: 1.1, hitH: 15 },
    moth:     { name: 'Ash Moth',     hp: 16,   speed: 46, dmg: 0,  cd: 1.0, wallDmg: 0,   r: 10, xp: 3,   cost: 0.9, hitH: 0, flying: true, drain: 1.8 },
    colossus: { name: 'Ash Colossus', hp: 1100, speed: 13, dmg: 24, cd: 2.2, wallDmg: 90,  r: 30, xp: 150, cost: 0,   hitH: 70, boss: true },
  };

  // positions relative to the camp centre
  LC.TENT_SLOTS = [[-150, -75], [150, -75], [0, -125], [-175, 45], [175, 45], [-85, 110]];
  LC.PROPS = { woodpile: [118, 100], crates: [-100, -15], barrel: [72, -88], armory: [22, 135] };
  LC.TOWER_ANGLES = [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];
  LC.TRAP_ANGLES = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * Math.PI / 4 + Math.PI / 8);

  LC.LOOKS = {
    skin: ['#f1d2b6', '#e3b896', '#c99169', '#a86d48', '#7d4e31', '#5d3a25'],
    hair: ['#2a1d14', '#4a3020', '#6b4a2a', '#a07040', '#c9a86a', '#161412', '#8a8580', '#7a2f1a'],
    shirt: ['#7a3b2e', '#3e5c76', '#5b6b3a', '#8a6d3b', '#4a4a5a', '#6e4a6b', '#2f5d50', '#9c5a2c', '#5d6b78'],
    pants: ['#3b3a36', '#2d3a4a', '#4a3b2a', '#3a4630', '#55504a', '#2e3138'],
    hat: ['#8a2d2d', '#2d4a6a', '#5a5a2d', '#4a3a5a', '#6a4a2a'],
    boots: ['#2a2018', '#3a2a1c', '#1e1a16', '#4a3524'],
  };

  LC.NAMES = ['Mara', 'Ruel', 'Tess', 'Ike', 'Nilo', 'Ada', 'Bram', 'Cass', 'Dov', 'Esme', 'Finn', 'Greta', 'Hale', 'Iris',
    'Jonah', 'Kit', 'Lena', 'Milo', 'Nora', 'Otto', 'Pia', 'Quinn', 'Rosa', 'Sol', 'Tamsin', 'Uri', 'Vera', 'Wes', 'Yara',
    'Zeke', 'Alba', 'Boone', 'Clem', 'Dara', 'Ezra', 'Fern', 'Gus', 'Hollis', 'Ines', 'Jude', 'Koa', 'Lior', 'Mika', 'Rook', 'Sage', 'Tobin'];

  LC.PERKS = [
    { id: 'longburn',     icon: '🔥', name: 'Long Burn',      desc: 'The fire burns 20% slower.' },
    { id: 'sharpstakes',  icon: '🪓', name: 'Sharp Stakes',   desc: 'Spike traps deal +50% damage.' },
    { id: 'deeppockets',  icon: '🎒', name: 'Deep Pockets',   desc: 'Scavenging brings back +30% loot.' },
    { id: 'thickskin',    icon: '🛡️', name: 'Thick Skin',     desc: 'Survivors have +20% max health.' },
    { id: 'eagleeye',     icon: '🎯', name: 'Eagle Eye',      desc: '+25% arrow damage, towers see farther.' },
    { id: 'rationing',    icon: '🥫', name: 'Rationing',      desc: 'The camp eats 30% less food.' },
    { id: 'quickhands',   icon: '🔨', name: 'Quick Hands',    desc: 'Builders repair twice as fast. Repairs cost less wood.' },
    { id: 'fletcher',     icon: '🏹', name: 'Fletcher',       desc: 'Making arrows yields +50%.' },
    { id: 'secondwind',   icon: '💚', name: 'Second Wind',    desc: 'Everyone heals 25% at every dawn.' },
    { id: 'steelnerves',  icon: '⚔️', name: 'Steel Nerves',   desc: '+20% melee damage.' },
    { id: 'warmhearth',   icon: '🏕️', name: 'Warm Hearth',    desc: 'The fire holds 30% more fuel.' },
    { id: 'lucky',        icon: '🍀', name: 'Lucky Stars',    desc: 'Trips outside are 35% less dangerous.' },
    { id: 'ironpalisade', icon: '🧱', name: 'Iron Palisade',  desc: 'The wall is 30% tougher.' },
    { id: 'lumberjack',   icon: '🌲', name: 'Lumberjack',     desc: '+3 wood for every woodcutter.' },
    { id: 'keenhunters',  icon: '🦌', name: 'Keen Hunters',   desc: '+3 food for every forager.' },
    { id: 'swift',        icon: '💨', name: 'Fleet Feet',     desc: 'Survivors move 25% faster and attack 15% faster.' },
  ];

  LC.META_UPG = [
    { id: 'settlers',  name: 'Seasoned Settlers', desc: 'Start with +1 survivor (Scavenger, then Medic).', max: 2, cost: (l) => 15 + l * 20 },
    { id: 'stockpile', name: 'Stockpile',         desc: 'Start with +10 wood, +6 food, +2 scrap.',          max: 3, cost: (l) => 10 + l * 12 },
    { id: 'quiver',    name: 'Full Quiver',       desc: 'Start with +20 arrows.',                            max: 2, cost: (l) => 8 + l * 10 },
    { id: 'hearth',    name: 'Hearthstone',       desc: 'The fire holds +15% fuel.',                         max: 3, cost: (l) => 12 + l * 15 },
    { id: 'fortified', name: 'Fortified',         desc: 'The palisade is +15% tougher.',                     max: 3, cost: (l) => 12 + l * 15 },
    { id: 'veterans',  name: 'Veterans',          desc: 'Survivors start at level 2.',                       max: 1, cost: () => 40 },
  ];

  // ---- events: make(run) returns {title, text, person?, options:[{label, sub, enabled, act()}]} or null ----
  const fmt = (o) => Object.keys(o).map((k) => o[k] + ' ' + LC.RES[k].toLowerCase()).join(', ');
  const canPay = (run, o) => Object.keys(o).every((k) => run.res[k] >= o[k]);
  LC.fmtRes = fmt;

  LC.EVENTS = [
    {
      id: 'stranger', w: 4.5,
      make(run) {
        const G = LC.Game;
        const role = U.pick(Object.keys(LC.ROLES));
        const lvl = U.clamp(1 + Math.floor(run.night / 5), 1, 6);
        const s = G.newSurvivor(run, role, lvl);
        const free = G.beds(run) > G.alive(run).length;
        return {
          title: 'A Stranger at the Wall', person: s,
          text: 'A ' + LC.ROLES[role].name.toLowerCase() + ' named ' + s.name + ' steps out of the treeline with raised hands. "Please... I can pull my weight."',
          options: [
            { label: 'Let ' + s.name + ' in', sub: free ? '+1 survivor (' + LC.ROLES[role].name + ', Lv ' + s.lvl + ')' : 'No free bed. Build a tent first.', enabled: free,
              act() { run.survivors.push(s); G.placeIdle(s); return s.name + ' joins the camp.'; } },
            { label: 'Share a meal, then send them away', sub: '-2 food', enabled: run.res.food >= 2,
              act() { run.res.food -= 2; return s.name + ' thanks you and disappears into the trees.'; } },
            { label: 'Turn them away', sub: '', enabled: true, act() { return 'The stranger walks off into the dusk.'; } },
          ],
        };
      },
    },
    {
      id: 'trader', w: 2.5,
      make(run) {
        const deals = U.shuffle([
          { give: { wood: 8 }, get: { meds: 2 } },
          { give: { scrap: 5 }, get: { ammo: 20 } },
          { give: { food: 6 }, get: { scrap: 5 } },
          { give: { wood: 10 }, get: { food: 7 } },
          { give: { meds: 1 }, get: { wood: 10 } },
          { give: { scrap: 8 }, get: { meds: 3 } },
          { give: { ammo: 15 }, get: { food: 5 } },
        ]).slice(0, 2);
        return {
          title: "A Trader's Cart",
          text: 'Wheels creak on the old road. A hooded trader raises a lantern: "Fair deals, before the dark comes."',
          options: deals.map((d) => ({
            label: 'Trade ' + fmt(d.give) + ' → ' + fmt(d.get), sub: canPay(run, d.give) ? '' : 'Not enough supplies', enabled: canPay(run, d.give),
            act() {
              for (const k in d.give) run.res[k] -= d.give[k];
              for (const k in d.get) run.res[k] += d.get[k];
              return 'Traded ' + fmt(d.give) + ' for ' + fmt(d.get) + '.';
            },
          })).concat([{ label: 'Send the trader on their way', sub: '', enabled: true, act() { return 'The cart rolls off toward the hills.'; } }]),
        };
      },
    },
    {
      id: 'fever', w: 2,
      make(run) {
        const G = LC.Game;
        const al = G.alive(run);
        if (!al.length) return null;
        const s = U.pick(al);
        const loss = Math.round(G.maxHp(run, s) * 0.35);
        return {
          title: 'Fever', person: s,
          text: s.name + ' is shivering with a fever and can barely stand.',
          options: [
            { label: 'Treat with medicine', sub: '-1 medicine', enabled: run.res.meds >= 1, act() { run.res.meds -= 1; return s.name + ' sweats it out and recovers.'; } },
            { label: 'Let them rest it off', sub: s.name + ' loses ' + loss + ' health', enabled: true, act() { s.hp = Math.max(1, s.hp - loss); return s.name + ' suffers through the evening.'; } },
          ],
        };
      },
    },
    {
      id: 'cache', w: 1.6,
      make(run) {
        const keys = U.shuffle(['scrap', 'food', 'ammo', 'wood']).slice(0, 2);
        const amt = { scrap: U.randi(3, 7), food: U.randi(3, 6), ammo: U.randi(8, 16), wood: U.randi(5, 9) };
        const loot = {};
        for (const k of keys) loot[k] = amt[k];
        return {
          title: 'Hidden Cache',
          text: 'Under a loose floorboard of an old hunting blind, someone finds a sealed tin box.',
          options: [{ label: 'Open it', sub: fmt(loot), enabled: true, act() { for (const k in loot) run.res[k] += loot[k]; return 'Found ' + fmt(loot) + '.'; } }],
        };
      },
    },
    {
      id: 'raiders', w: 1.5, cond: (run) => run.night >= 3,
      make(run) {
        const toll = 4 + Math.floor(run.night / 3);
        return {
          title: 'Raiders',
          text: 'Three armed figures stop at the treeline. "' + toll + ' food, and we lead the dead away from you tonight. Refuse, and we ring the old church bells."',
          options: [
            { label: 'Pay ' + toll + ' food', sub: run.res.food >= toll ? '' : 'Not enough food', enabled: run.res.food >= toll, act() { run.res.food -= toll; return 'They take the food and vanish.'; } },
            { label: 'Refuse', sub: 'Tonight: +35% enemies', enabled: true, act() { run.flags.raiders = true; return 'Distant bells ring out. The dead will come in greater numbers tonight.'; } },
          ],
        };
      },
    },
    {
      id: 'storm', w: 1.4,
      make(run) {
        const lose = Math.ceil(run.res.wood * 0.3);
        return {
          title: 'Storm Clouds',
          text: 'The wind howls and the sky turns black. Your wood stores are exposed.',
          options: [
            { label: 'Cover the stores', sub: '-3 scrap', enabled: run.res.scrap >= 3, act() { run.res.scrap -= 3; return 'The tarps hold. Nothing is lost.'; } },
            { label: 'Ride it out', sub: 'Lose ' + lose + ' wood, the wall takes damage', enabled: true,
              act() {
                run.res.wood -= lose;
                for (let i = 0; i < run.wallHp.length; i++) if (!run.wallBroken[i]) run.wallHp[i] = Math.max(1, Math.round(run.wallHp[i] * 0.8));
                return 'The storm ruins ' + lose + ' wood and batters the palisade.';
              } },
          ],
        };
      },
    },
    {
      id: 'wolves', w: 1.4, cond: (run) => run.night >= 4,
      make(run) {
        const al = LC.Game.alive(run);
        if (!al.length) return null;
        return {
          title: 'Tracks in the Mud',
          text: 'Huge paw prints circle the camp. A pack of gaunt wolves has found your scent.',
          options: [
            { label: 'Hunt the pack', sub: '+7 food, someone may get hurt', enabled: true,
              act() {
                const s = U.pick(al);
                run.res.food += 7;
                if (U.chance(0.6)) { const d = U.randi(15, 35); s.hp = Math.max(1, s.hp - d); return s.name + ' brings back meat, but got mauled (-' + d + ' health).'; }
                return s.name + ' brings back meat without a scratch.';
              } },
            { label: 'Leave them be', sub: 'Tonight: two extra wolf packs', enabled: true, act() { run.flags.wolves = 2; return 'You hear howling as the sun sets.'; } },
          ],
        };
      },
    },
    {
      id: 'truck', w: 1.2, cond: (run) => run.night >= 2,
      make(run) {
        const al = LC.Game.alive(run);
        if (!al.length) return null;
        return {
          title: 'Smoke on the Horizon',
          text: 'A supply truck has crashed on the highway. It is close, but the noise will have drawn things.',
          options: [
            { label: 'Send someone to search it', sub: '+8 scrap, +2 medicine, +15 arrows. Risky.', enabled: true,
              act() {
                run.res.scrap += 8; run.res.meds += 2; run.res.ammo += 15;
                const s = U.pick(al);
                if (U.chance(0.5)) { const d = U.randi(20, 40); s.hp = Math.max(1, s.hp - d); return s.name + ' hauls back the supplies, bleeding (-' + d + ' health).'; }
                return s.name + ' hauls back the supplies unharmed.';
              } },
            { label: 'Too dangerous. Ignore it.', sub: '', enabled: true, act() { return 'The smoke fades as evening comes.'; } },
          ],
        };
      },
    },
    {
      id: 'feast', w: 1.2,
      make(run) {
        const G = LC.Game;
        const al = G.alive(run);
        if (!al.length) return null;
        const need = Math.max(3, al.length);
        return {
          title: 'A Quiet Evening',
          text: 'For once the forest is silent. Someone suggests a proper meal around the fire.',
          options: [
            { label: 'Share a feast', sub: '-' + need + ' food, everyone heals 25%', enabled: run.res.food >= need,
              act() { run.res.food -= need; for (const s of al) s.hp = Math.min(G.maxHp(run, s), s.hp + G.maxHp(run, s) * 0.25); return 'Laughter around the fire, for the first time in weeks.'; } },
            { label: 'Save the food', sub: '', enabled: true, act() { return 'Everyone eats their rations in silence.'; } },
          ],
        };
      },
    },
  ];
})(window.LC);
