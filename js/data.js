/* Last Camp — game data: constants, roles, buildings, enemies, perks, events */
(function (LC) {
  'use strict';
  const U = LC.U;

  LC.C = {
    W: 1280, H: 720,                 // screen (logical pixels)
    WW: 1800, WH: 1150,              // world size
    CX: 900, CY: 590, RX: 470, RY: 300, // camp centre and palisade ellipse
    SEG: 28, LOGS: 7,                // wall segments, logs per segment
    GATE_SEGS: [6, 7],               // the two segments at the south form the gate
    HOUR: 8,                         // real seconds per game hour at 1x speed (after day 50)
    EARLY_DAYS: 50,                  // up to this day, days run longer and nights shorter
    DAY_HOUR_EARLY: 10, NIGHT_HOUR_EARLY: 6.5,
    DAY_START: 6, DUSK: 18, NIGHT_START: 20, DAWN: 5,
    FUEL_PER_WOOD: 20,
    MAX_LVL: 10,                     // survivor level cap
    BMAX: 5,                         // building level cap
    SAVE_KEY: 'lastcamp.save.v2',
    META_KEY: 'lastcamp.meta.v1',
  };
  LC.C.NIGHT_LEN = (24 - LC.C.NIGHT_START + LC.C.DAWN) * LC.C.HOUR; // 20:00 -> 05:00

  LC.SEASONS = ['Autumn', 'Winter', 'Spring', 'Summer'];
  LC.RES_KEYS = ['wood', 'stone', 'food', 'scrap', 'meds', 'ammo'];
  LC.RES = { wood: 'Wood', stone: 'Stone', food: 'Food', scrap: 'Scrap', meds: 'Medicine', ammo: 'Arrows' };
  LC.BASE_CAP = { wood: 100, stone: 100, food: 100, scrap: 60, meds: 20, ammo: 150 };

  // job: building type this role is best at (x1.5), or a special bonus
  LC.ROLES = {
    fighter:    { name: 'Fighter',    hp: 125, melee: 15, ranged: 0,  tool: 'axe',     coat: '#5b3a26', color: '#e0614f', job: 'armory',     desc: 'Strongest in close combat. Works the Armory best.' },
    archer:     { name: 'Archer',     hp: 90,  melee: 8,  ranged: 13, tool: 'bow',     coat: '#4a5a34', color: '#86c06c', job: 'tower',      desc: 'Shoots arrows. +25% damage on archer towers. Works the Workshop well.' },
    builder:    { name: 'Builder',    hp: 105, melee: 10, ranged: 8,  tool: 'hammer',  coat: '#7d6a3c', color: '#e8b54a', job: 'build',      desc: 'Builds and repairs 60% faster. Repairs the wall during the night.' },
    farmer:     { name: 'Farmer',     hp: 95,  melee: 9,  ranged: 8,  tool: 'hoe',     coat: '#6b5a2e', color: '#d6c25a', job: 'farm',       desc: 'Grows 50% more food on Farms.' },
    lumberjack: { name: 'Lumberjack', hp: 110, melee: 12, ranged: 7,  tool: 'axe',     coat: '#7a3b2e', color: '#c9824a', job: 'mill',       desc: 'Chops 50% more wood for the Lumber Mill.' },
    miner:      { name: 'Miner',      hp: 110, melee: 11, ranged: 7,  tool: 'pickaxe', coat: '#4d4d55', color: '#a9b0b8', job: 'quarry',     desc: 'Digs 50% more stone for the Quarry.' },
    medic:      { name: 'Medic',      hp: 85,  melee: 7,  ranged: 8,  tool: 'knife',   coat: '#d9d4c7', color: '#f0f0f0', job: 'infirmary',  desc: 'Heals 50% more in the Infirmary and tends the wounded at night.' },
    scavenger:  { name: 'Scavenger',  hp: 85,  melee: 9,  ranged: 9,  tool: 'crowbar', coat: '#6a5a44', color: '#62a8e6', job: 'expedition', desc: 'Brings back 50% more from expeditions and gets hurt less often.' },
  };

  LC.LOCS = [
    { id: 'farm',     name: 'Burnt Farmhouse',    risk: 0.08, unlock: 1, ang: 2.3, loot: { scrap: [2, 5], food: [1, 4], meds: [0, 1] } },
    { id: 'town',     name: 'Old Town',           risk: 0.15, unlock: 3, ang: 0.8, loot: { scrap: [3, 7], food: [2, 5], ammo: [4, 10] } },
    { id: 'hospital', name: 'St. Agnes Hospital', risk: 0.22, unlock: 5, ang: 2.8, loot: { meds: [2, 4], scrap: [1, 4] } },
    { id: 'outpost',  name: 'Military Outpost',   risk: 0.30, unlock: 8, ang: 0.3, loot: { scrap: [5, 10], ammo: [10, 20], meds: [0, 2] } },
  ];

  /*
   * Buildings. cost[i] / hours[i] = what it takes to reach level i+1 (null = comes pre-built).
   * workers[i] = staff slots at level i+1 (the building only works while staffed).
   * stats: per-level values shown in the inspector; `fmt` formats a stat for display.
   */
  LC.BUILDINGS = {
    fire: {
      name: 'Campfire', cat: 'Core', icon: '🔥', place: 'fixed', max: 1,
      desc: 'The heart of the camp. It burns wood all night. If it goes out at night, the camp falls.',
      stats: { fuel: [100, 130, 165, 205, 250], light: [100, 110, 120, 132, 145] },
      labels: { fuel: 'Fuel capacity', light: 'Light radius %' },
      cost: [null, { wood: 30, stone: 10 }, { wood: 50, stone: 30, scrap: 8 }, { wood: 80, stone: 60, scrap: 16 }, { wood: 120, stone: 100, scrap: 28 }],
      hours: [0, 3, 4, 5, 6],
    },
    wall: {
      name: 'Palisade', cat: 'Defense', icon: '🪵', place: 'fixed', max: 1,
      desc: 'Keeps the dead out. While a section stands they can only claw at it, and your people strike back through the gaps.',
      stats: { hp: [140, 220, 320, 450, 620] },
      labels: { hp: 'Health per section' },
      cost: [null, { wood: 60, stone: 10 }, { wood: 60, stone: 60, scrap: 10 }, { wood: 80, stone: 120, scrap: 25 }, { wood: 100, stone: 200, scrap: 45 }],
      hours: [0, 4, 6, 8, 10],
    },
    gate: {
      name: 'Gate', cat: 'Defense', icon: '🚪', place: 'fixed', max: 1,
      desc: 'Workers pass through by day. It closes at night and is the toughest part of the wall.',
      stats: { hp: [260, 400, 580, 800, 1080] },
      labels: { hp: 'Gate health' },
      cost: [null, { wood: 35, stone: 5, scrap: 5 }, { wood: 40, stone: 35, scrap: 12 }, { wood: 55, stone: 70, scrap: 22 }, { wood: 70, stone: 120, scrap: 35 }],
      hours: [0, 3, 4, 5, 6],
    },
    tower: {
      name: 'Archer Tower', cat: 'Defense', icon: '🏹', place: 'tower', max: 8, guard: true,
      desc: 'Built on the wall. At night its guard shoots arrows at anything in range. Needs a guard to work.',
      stats: { dmg: [100, 125, 155, 190, 230], range: [260, 285, 310, 340, 370], rate: [1.1, 1.0, 0.9, 0.8, 0.7] },
      labels: { dmg: 'Arrow damage %', range: 'Range', rate: 'Seconds per shot' },
      cost: [{ wood: 35, stone: 5, scrap: 5 }, { wood: 30, stone: 20, scrap: 8 }, { wood: 40, stone: 45, scrap: 14 }, { wood: 55, stone: 80, scrap: 22 }, { wood: 70, stone: 130, scrap: 34 }],
      hours: [3, 3, 4, 5, 6],
    },
    trap: {
      name: 'Spike Trap', cat: 'Defense', icon: '⛏️', place: 'trap', max: 9,
      desc: 'A pit of sharpened stakes outside the wall. Hurts and slows anything walking through it.',
      stats: { dps: [16, 24, 34, 46, 60] },
      labels: { dps: 'Damage per second' },
      cost: [{ wood: 10, scrap: 2 }, { wood: 12, stone: 4, scrap: 4 }, { wood: 16, stone: 10, scrap: 6 }, { wood: 20, stone: 18, scrap: 9 }, { wood: 26, stone: 28, scrap: 12 }],
      hours: [1, 1, 2, 2, 3],
    },
    house: {
      name: 'House', cat: 'Housing', icon: '🏠', place: 'plot', max: 6,
      desc: 'Beds for your people. Strangers can only join if there is a free bed. Resting here heals faster.',
      stats: { beds: [2, 3, 4, 5, 6], rest: [6, 8, 10, 12, 15] },
      labels: { beds: 'Beds', rest: 'Rest healing %/hour' },
      cost: [{ wood: 30 }, { wood: 30, stone: 10 }, { wood: 40, stone: 25, scrap: 3 }, { wood: 55, stone: 45, scrap: 6 }, { wood: 75, stone: 70, scrap: 10 }],
      hours: [3, 3, 4, 5, 6],
    },
    farm: {
      name: 'Farm', cat: 'Production', icon: '🌾', place: 'plot', max: 3,
      desc: 'Workers tend the fields and grow food. Nothing grows in winter.',
      stats: { rate: [0.45, 0.55, 0.7, 0.85, 1.0] },
      labels: { rate: 'Food per worker-hour' },
      workers: [1, 2, 2, 3, 4],
      cost: [{ wood: 25 }, { wood: 30, stone: 5 }, { wood: 40, stone: 15, scrap: 4 }, { wood: 55, stone: 30, scrap: 8 }, { wood: 75, stone: 50, scrap: 12 }],
      hours: [2, 3, 4, 5, 6],
    },
    mill: {
      name: 'Lumber Mill', cat: 'Production', icon: '🪓', place: 'plot', max: 2,
      desc: 'Workers walk out to the forest, chop trees and carry the logs back.',
      stats: { load: [5, 6, 7, 9, 11] },
      labels: { load: 'Wood per trip' },
      workers: [2, 2, 3, 4, 5],
      cost: [{ wood: 20, stone: 5 }, { wood: 30, stone: 15 }, { wood: 40, stone: 30, scrap: 5 }, { wood: 55, stone: 50, scrap: 10 }, { wood: 75, stone: 75, scrap: 15 }],
      hours: [2, 3, 4, 5, 6],
    },
    quarry: {
      name: 'Stone Quarry', cat: 'Production', icon: '⛏', place: 'plot', max: 2,
      desc: 'Workers mine the rock outcrops outside the wall and haul stone back.',
      stats: { load: [2, 3, 4, 5, 6] },
      labels: { load: 'Stone per trip' },
      workers: [2, 2, 3, 3, 4],
      cost: [{ wood: 25 }, { wood: 35, stone: 10 }, { wood: 45, stone: 25, scrap: 5 }, { wood: 60, stone: 45, scrap: 10 }, { wood: 80, stone: 70, scrap: 15 }],
      hours: [3, 3, 4, 5, 6],
    },
    storehouse: {
      name: 'Storehouse', cat: 'Production', icon: '📦', place: 'plot', max: 1,
      desc: 'Raises how much of each resource the camp can hold. Big upgrades need big storage.',
      stats: { cap: [80, 180, 300, 450, 650] },
      labels: { cap: 'Extra storage' },
      cost: [{ wood: 40, stone: 10 }, { wood: 50, stone: 30 }, { wood: 70, stone: 60, scrap: 8 }, { wood: 100, stone: 100, scrap: 15 }, { wood: 140, stone: 160, scrap: 25 }],
      hours: [3, 4, 5, 6, 8],
    },
    workshop: {
      name: 'Workshop', cat: 'Crafting', icon: '🛠️', place: 'plot', max: 1,
      desc: 'Workers carve arrows for archers and towers. Uses 1 wood for every 4 arrows.',
      stats: { arrows: [3, 4, 5, 6, 8] },
      labels: { arrows: 'Arrows per worker-hour' },
      workers: [1, 1, 2, 2, 3],
      cost: [{ wood: 35, stone: 10, scrap: 6 }, { wood: 35, stone: 20, scrap: 10 }, { wood: 45, stone: 40, scrap: 16 }, { wood: 60, stone: 65, scrap: 24 }, { wood: 80, stone: 100, scrap: 34 }],
      hours: [3, 3, 4, 5, 6],
    },
    armory: {
      name: 'Armory', cat: 'Crafting', icon: '⚔️', place: 'plot', max: 1,
      desc: 'A smith keeps everyone\'s weapons sharp. The damage bonus is only active while someone works here.',
      stats: { melee: [10, 20, 32, 46, 62], ranged: [8, 16, 25, 35, 46] },
      labels: { melee: 'Melee damage +%', ranged: 'Arrow damage +%' },
      workers: [1, 1, 1, 2, 2],
      cost: [{ wood: 30, stone: 20, scrap: 12 }, { wood: 35, stone: 30, scrap: 18 }, { wood: 45, stone: 50, scrap: 26 }, { wood: 60, stone: 80, scrap: 36 }, { wood: 80, stone: 120, scrap: 50 }],
      hours: [3, 4, 5, 6, 7],
    },
    infirmary: {
      name: 'Infirmary', cat: 'Support', icon: '✚', place: 'plot', max: 1,
      desc: 'Staff heal every injured person in camp during the day, and heal faster at night.',
      stats: { heal: [5, 6, 8, 10, 12] },
      labels: { heal: 'Healing %/hour per worker' },
      workers: [1, 1, 2, 2, 3],
      cost: [{ wood: 35, stone: 10, meds: 1 }, { wood: 35, stone: 20, scrap: 6, meds: 1 }, { wood: 45, stone: 40, scrap: 10, meds: 2 }, { wood: 60, stone: 65, scrap: 16, meds: 2 }, { wood: 80, stone: 100, scrap: 24, meds: 3 }],
      hours: [3, 3, 4, 5, 6],
    },
    expedition: {
      name: 'Scout Post', cat: 'Support', icon: '🧭', place: 'plot', max: 1,
      desc: 'Sends its workers on daily expeditions to scavenge scrap, medicine, arrows and food from the ruins.',
      stats: { loot: [100, 115, 130, 150, 170], safety: [0, 10, 20, 30, 40] },
      labels: { loot: 'Loot %', safety: 'Danger reduced %' },
      workers: [1, 2, 2, 3, 3],
      cost: [{ wood: 30, stone: 5 }, { wood: 30, stone: 15, scrap: 5 }, { wood: 40, stone: 30, scrap: 10 }, { wood: 55, stone: 50, scrap: 15 }, { wood: 70, stone: 80, scrap: 22 }],
      hours: [2, 3, 4, 5, 6],
    },
  };
  LC.BUILD_ORDER = ['house', 'farm', 'mill', 'quarry', 'storehouse', 'tower', 'trap', 'workshop', 'armory', 'infirmary', 'expedition'];

  // building plots inside the camp (offsets from the centre); the south is kept clear for the gate road
  LC.PLOTS = [
    [-202, -58], [0, -128], [202, -58], [200, 50], [-200, 50],          // inner ring
    [-345, -60], [-250, -160], [-95, -218], [95, -218], [250, -160], [345, -60],
    [345, 62], [-345, 62], [250, 165], [-250, 165],                     // outer ring
    [115, 150], [-115, 150],                                            // by the road
  ];
  const deg = Math.PI / 180;
  LC.TOWER_ANGLES = [-157.5, -112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5].map((a) => a * deg);
  LC.TRAP_ANGLES = [-160, -125, -90, -55, -20, 15, 50, 130, 165].map((a) => a * deg);
  LC.PROPS = { woodpile: [-62, 235], crates: [62, 232] };

  LC.ENEMIES = {
    walker:   { name: 'Hollow',       hp: 40,   speed: 28, dmg: 4,  cd: 1.3, wallDmg: 6,  r: 11, xp: 4,   cost: 1,   hitH: 26 },
    runner:   { name: 'Runner',       hp: 24,   speed: 56, dmg: 3,  cd: 0.9, wallDmg: 3,  r: 10, xp: 4,   cost: 1,   hitH: 24 },
    brute:    { name: 'Brute',        hp: 160,  speed: 19, dmg: 12, cd: 1.8, wallDmg: 20, r: 17, xp: 14,  cost: 4.5, hitH: 40 },
    wolf:     { name: 'Gaunt Wolf',   hp: 32,   speed: 78, dmg: 4,  cd: 0.8, wallDmg: 2,  r: 12, xp: 5,   cost: 1.1, hitH: 15 },
    moth:     { name: 'Ash Moth',     hp: 16,   speed: 46, dmg: 0,  cd: 1.0, wallDmg: 0,  r: 10, xp: 3,   cost: 0.9, hitH: 0, flying: true, drain: 1.8 },
    colossus: { name: 'Ash Colossus', hp: 1100, speed: 13, dmg: 24, cd: 2.2, wallDmg: 90, r: 30, xp: 150, cost: 14,  hitH: 70, boss: true },
  };

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
    { id: 'deeppockets',  icon: '🎒', name: 'Deep Pockets',   desc: 'Expeditions bring back +30% loot.' },
    { id: 'thickskin',    icon: '🛡️', name: 'Thick Skin',     desc: 'Survivors have +20% max health.' },
    { id: 'eagleeye',     icon: '🎯', name: 'Eagle Eye',      desc: '+25% arrow damage, towers see farther.' },
    { id: 'rationing',    icon: '🥫', name: 'Rationing',      desc: 'The camp eats 30% less food.' },
    { id: 'quickhands',   icon: '🔨', name: 'Quick Hands',    desc: 'Building and repairing is 50% faster.' },
    { id: 'fletcher',     icon: '🏹', name: 'Fletcher',       desc: 'The Workshop makes 50% more arrows.' },
    { id: 'secondwind',   icon: '💚', name: 'Second Wind',    desc: 'Everyone heals 25% at every dawn.' },
    { id: 'steelnerves',  icon: '⚔️', name: 'Steel Nerves',   desc: '+20% melee damage.' },
    { id: 'warmhearth',   icon: '🏕️', name: 'Warm Hearth',    desc: 'The fire holds 30% more fuel.' },
    { id: 'lucky',        icon: '🍀', name: 'Lucky Stars',    desc: 'Expeditions are 35% less dangerous.' },
    { id: 'ironpalisade', icon: '🧱', name: 'Iron Palisade',  desc: 'The wall and gate are 30% tougher.' },
    { id: 'lumberjack',   icon: '🌲', name: 'Timber!',        desc: '+2 wood on every Lumber Mill trip.' },
    { id: 'stonecutter',  icon: '🪨', name: 'Stonecutter',    desc: '+2 stone on every Quarry trip.' },
    { id: 'greenthumb',   icon: '🌱', name: 'Green Thumb',    desc: 'Farms grow 30% more food (and a little in winter).' },
    { id: 'swift',        icon: '💨', name: 'Fleet Feet',     desc: 'Survivors move 25% faster and attack 15% faster.' },
  ];

  LC.META_UPG = [
    { id: 'settlers',  name: 'Seasoned Settlers', desc: 'Start with +1 survivor (Fighter, then Medic).', max: 2, cost: (l) => 15 + l * 20 },
    { id: 'stockpile', name: 'Stockpile',         desc: 'Start with +15 wood, +10 stone, +8 food.',      max: 3, cost: (l) => 10 + l * 12 },
    { id: 'quiver',    name: 'Full Quiver',       desc: 'Start with +25 arrows.',                         max: 2, cost: (l) => 8 + l * 10 },
    { id: 'hearth',    name: 'Hearthstone',       desc: 'The fire holds +15% fuel.',                      max: 3, cost: (l) => 12 + l * 15 },
    { id: 'fortified', name: 'Fortified',         desc: 'The palisade and gate are +15% tougher.',        max: 3, cost: (l) => 12 + l * 15 },
    { id: 'veterans',  name: 'Veterans',          desc: 'Survivors start at level 2.',                    max: 1, cost: () => 40 },
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
        const free = G.freeBeds(run) > 0;
        return {
          title: 'A Stranger at the Gate', person: s,
          text: 'A ' + LC.ROLES[role].name.toLowerCase() + ' named ' + s.name + ' steps out of the treeline with raised hands. "Please... I can pull my weight."',
          options: [
            { label: 'Let ' + s.name + ' in', sub: free ? '+1 survivor (' + LC.ROLES[role].name + ', Lv ' + s.lvl + ')' : 'No free bed. Build or upgrade a House first.', enabled: free,
              act() { G.addSurvivor(run, s); return s.name + ' joins the camp.'; } },
            { label: 'Share a meal, then send them away', sub: '-3 food', enabled: run.res.food >= 3,
              act() { run.res.food -= 3; return s.name + ' thanks you and disappears into the trees.'; } },
            { label: 'Turn them away', sub: '', enabled: true, act() { return 'The stranger walks off down the old road.'; } },
          ],
        };
      },
    },
    {
      id: 'trader', w: 2.5,
      make(run) {
        const deals = U.shuffle([
          { give: { wood: 15 }, get: { meds: 2 } },
          { give: { scrap: 5 }, get: { ammo: 25 } },
          { give: { food: 10 }, get: { scrap: 5 } },
          { give: { wood: 20 }, get: { stone: 15 } },
          { give: { stone: 15 }, get: { food: 12 } },
          { give: { meds: 1 }, get: { wood: 20 } },
          { give: { scrap: 8 }, get: { meds: 3 } },
          { give: { ammo: 20 }, get: { food: 8 } },
        ]).slice(0, 2);
        return {
          title: "A Trader's Cart",
          text: 'Wheels creak on the old road. A hooded trader raises a lantern: "Fair deals, before the dark comes."',
          options: deals.map((d) => ({
            label: 'Trade ' + fmt(d.give) + ' → ' + fmt(d.get), sub: canPay(run, d.give) ? '' : 'Not enough supplies', enabled: canPay(run, d.give),
            act() {
              for (const k in d.give) run.res[k] -= d.give[k];
              for (const k in d.get) LC.Game.addRes(run, k, d.get[k]);
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
            { label: 'Let them rest it off', sub: s.name + ' loses ' + loss + ' health', enabled: true, act() { s.hp = Math.max(1, s.hp - loss); return s.name + ' suffers through the day.'; } },
          ],
        };
      },
    },
    {
      id: 'cache', w: 1.6,
      make(run) {
        const keys = U.shuffle(['scrap', 'food', 'ammo', 'wood', 'stone']).slice(0, 2);
        const amt = { scrap: U.randi(3, 7), food: U.randi(4, 8), ammo: U.randi(8, 16), wood: U.randi(6, 12), stone: U.randi(6, 12) };
        const loot = {};
        for (const k of keys) loot[k] = amt[k];
        return {
          title: 'Hidden Cache',
          text: 'Under a loose floorboard of an old hunting blind, someone finds a sealed tin box.',
          options: [{ label: 'Open it', sub: fmt(loot), enabled: true, act() { for (const k in loot) LC.Game.addRes(run, k, loot[k]); return 'Found ' + fmt(loot) + '.'; } }],
        };
      },
    },
    {
      id: 'raiders', w: 1.5, cond: (run) => run.night >= 3,
      make(run) {
        const toll = 5 + Math.floor(run.night / 2);
        return {
          title: 'Raiders',
          text: 'Three armed figures stop at the treeline. "' + toll + ' food, and we lead the dead away from you tonight. Refuse, and we ring the old church bells."',
          options: [
            { label: 'Pay ' + toll + ' food', sub: run.res.food >= toll ? '' : 'Not enough food', enabled: run.res.food >= toll, act() { run.res.food -= toll; return 'They take the food and vanish.'; } },
            { label: 'Refuse', sub: 'Tonight is more dangerous', enabled: true, act() { run.flags.raiders = true; return 'Distant bells ring out. The dead will come in greater numbers tonight.'; } },
          ],
        };
      },
    },
    {
      id: 'storm', w: 1.4,
      make(run) {
        const lose = Math.ceil(run.res.wood * 0.25);
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
            { label: 'Hunt the pack', sub: '+10 food, someone may get hurt', enabled: true,
              act() {
                const s = U.pick(al);
                LC.Game.addRes(run, 'food', 10);
                if (U.chance(0.6)) { const d = U.randi(15, 35); s.hp = Math.max(1, s.hp - d); return s.name + ' brings back meat, but got mauled (-' + d + ' health).'; }
                return s.name + ' brings back meat without a scratch.';
              } },
            { label: 'Leave them be', sub: 'Tonight: extra wolves', enabled: true, act() { run.flags.wolves = 2; return 'You hear howling in the distance.'; } },
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
        const need = Math.max(4, al.length * 2);
        return {
          title: 'A Quiet Day',
          text: 'For once the forest is silent. Someone suggests a proper feast around the fire tonight.',
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
