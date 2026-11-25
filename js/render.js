/* Last Camp — world rendering with a movable camera, lighting, particles, weather, labels */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, D = LC.Draw, Geo = LC.Geo, G = LC.Game, B = LC.Bld;
  const TAU = Math.PI * 2;

  // ---------- particles & floating text (world coordinates) ----------
  const FX = (LC.FX = { parts: [], texts: [] });
  FX.burst = function (x, y, kind, n) {
    for (let i = 0; i < n; i++) {
      let p;
      switch (kind) {
        case 'spark': p = { x: x + U.rand(-8, 8), y, vx: U.rand(-18, 18), vy: U.rand(-90, -40), g: -10, life: U.rand(0.6, 1.4), size: U.rand(0.8, 1.8), c: U.pick(['#ffb347', '#ffd27a', '#ff7a2a']), glow: true }; break;
        case 'smoke': p = { x: x + U.rand(-6, 6), y, vx: U.rand(-8, 8), vy: U.rand(-28, -14), g: 0, life: U.rand(1.4, 2.6), size: U.rand(4, 8), c: '#5a5550', grow: 6, alpha: 0.35 }; break;
        case 'ichor': p = { x, y, vx: U.rand(-55, 55), vy: U.rand(-70, -10), g: 220, gy: y + U.rand(18, 30), life: U.rand(0.5, 1.2), size: U.rand(1, 2.2), c: U.pick(['#3a1712', '#2b1410', '#4d2216']) }; break;
        case 'blood': p = { x, y, vx: U.rand(-45, 45), vy: U.rand(-60, -10), g: 220, gy: y + U.rand(20, 28), life: U.rand(0.5, 1.1), size: U.rand(1, 2), c: U.pick(['#9a1f1a', '#7a1712', '#b02a22']) }; break;
        case 'splinter': p = { x, y, vx: U.rand(-50, 50), vy: U.rand(-70, -20), g: 240, gy: y + U.rand(12, 22), life: U.rand(0.6, 1.2), size: U.rand(1.2, 2.4), c: U.pick(['#8a6440', '#6b4a2b', '#a87c50']), rect: true }; break;
        case 'chip': p = { x, y, vx: U.rand(-60, 60), vy: U.rand(-80, -30), g: 260, gy: y + U.rand(14, 24), life: U.rand(0.5, 1.0), size: U.rand(1, 2), c: U.pick(['#d9b07a', '#c9955a', '#e8c890']), rect: true }; break;
        case 'rockchip': p = { x, y, vx: U.rand(-60, 60), vy: U.rand(-70, -25), g: 260, gy: y + U.rand(10, 20), life: U.rand(0.5, 1.0), size: U.rand(0.9, 1.8), c: U.pick(['#a7a39b', '#8a857e', '#c8c4bc']) }; break;
        case 'dust': p = { x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), vx: U.rand(-25, 25), vy: U.rand(-10, 30), g: 20, life: U.rand(0.6, 1.2), size: U.rand(0.8, 1.6), c: '#d8c8a2' }; break;
        case 'heal': p = { x: x + U.rand(-8, 8), y, vx: 0, vy: -22, g: 0, life: 0.9, size: 3, c: '#7fe07a', plus: true }; break;
        default: p = { x, y, vx: 0, vy: -10, g: 0, life: 0.5, size: 1, c: '#fff' };
      }
      p.max = p.life;
      FX.parts.push(p);
    }
    if (FX.parts.length > 900) FX.parts.splice(0, FX.parts.length - 900);
  };
  FX.text = (x, y, str, color) => { FX.texts.push({ x, y, str, color: color || '#fff', t: 0 }); if (FX.texts.length > 30) FX.texts.shift(); };
  FX.update = function (dt) {
    for (const p of FX.parts) {
      p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.gy !== undefined && p.y >= p.gy) { p.y = p.gy; p.vx = 0; p.vy = 0; p.g = 0; }
      if (p.grow) p.size += p.grow * dt;
    }
    FX.parts = FX.parts.filter((p) => p.life > 0);
    for (const t of FX.texts) { t.t += dt; t.y -= 16 * dt; }
    FX.texts = FX.texts.filter((t) => t.t < 2.2);
  };
  FX.clear = () => { FX.parts.length = 0; FX.texts.length = 0; };
  FX.draw = function (ctx, glowPass) {
    for (const p of FX.parts) {
      if (!!p.glow !== glowPass) continue;
      ctx.globalAlpha = U.clamp(p.life / p.max, 0, 1) * (p.alpha || 1);
      ctx.fillStyle = p.c;
      if (p.plus) { ctx.fillRect(p.x - p.size, p.y - 0.6, p.size * 2, 1.2); ctx.fillRect(p.x - 0.6, p.y - p.size, 1.2, p.size * 2); }
      else if (p.rect) ctx.fillRect(p.x - p.size, p.y - p.size * 0.4, p.size * 2, p.size * 0.8);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };

  // ---------- renderer ----------
  const R = (LC.Render = { scale: 1, lights: [], weather: [], wkind: null, cam: { x: 0, y: 0, z: 1 } });

  R.init = function (cv) {
    R.cv = cv;
    R.ctx = cv.getContext('2d');
    R.dark = document.createElement('canvas');
    R.dark.width = C.W / 2; R.dark.height = C.H / 2;
    R.dctx = R.dark.getContext('2d');
    R.resetCamera();
  };
  R.resize = function (cssScale) {
    const dpr = window.devicePixelRatio || 1;
    R.scale = U.clamp(cssScale * dpr, 0.5, 2.5);
    R.cv.width = Math.round(C.W * R.scale);
    R.cv.height = Math.round(C.H * R.scale);
    D.R = R.scale;
    R.gkey = null;
  };

  // ---------- camera ----------
  R.minZoom = () => Math.max(C.W / C.WW, C.H / C.WH);
  R.clampCam = function () {
    const cam = R.cam;
    cam.z = U.clamp(cam.z, R.minZoom(), 1.8);
    cam.x = U.clamp(cam.x, 0, C.WW - C.W / cam.z);
    cam.y = U.clamp(cam.y, 0, C.WH - C.H / cam.z);
  };
  R.resetCamera = function () {
    R.cam.z = 0.92;
    R.cam.x = C.CX - C.W / 2 / R.cam.z;
    R.cam.y = C.CY - 40 - C.H / 2 / R.cam.z;
    R.clampCam();
  };
  R.zoomAt = function (sx, sy, factor) {
    const cam = R.cam;
    const wx = sx / cam.z + cam.x, wy = sy / cam.z + cam.y;
    cam.z = U.clamp(cam.z * factor, R.minZoom(), 1.8);
    cam.x = wx - sx / cam.z; cam.y = wy - sy / cam.z;
    R.clampCam();
  };
  R.pan = function (dx, dy) { R.cam.x += dx / R.cam.z; R.cam.y += dy / R.cam.z; R.clampCam(); };
  R.s2w = (sx, sy) => ({ x: sx / R.cam.z + R.cam.x, y: sy / R.cam.z + R.cam.y });
  R.w2s = (x, y) => ({ x: (x - R.cam.x) * R.cam.z, y: (y - R.cam.y) * R.cam.z });
  R.onScreen = (x, y, m) => { const p = R.w2s(x, y); m = m || 60; return p.x > -m && p.x < C.W + m && p.y > -m && p.y < C.H + m; };

  // ---------- ground ----------
  const PAL = [
    { base: '#3b3a25', dirt: '#5b4630', tuft: ['#5a5a2e', '#6b5e2c', '#4a4a26'], spot: ['#7a4a1e', '#9a5a20', '#6e3a1a', '#b0702a'] },
    { base: '#c9d1d8', dirt: '#8f8a82', tuft: ['#e9eef2', '#b8c0c6', '#aab3ba'], spot: ['#ffffff', '#dfe7ec'] },
    { base: '#3d5a2b', dirt: '#5a4a34', tuft: ['#4f7a34', '#5f8c3c', '#3f6a2c'], spot: ['#ece6f2', '#f2d65a', '#b98ad8'] },
    { base: '#56622e', dirt: '#6a5434', tuft: ['#6b7a32', '#7a8a3a', '#5a6a2a'], spot: ['#f2e05a', '#ecece2'] },
  ];
  R.ground = function (si) {
    const sc = Math.min(R.scale, 1.6);
    const key = si + '_' + sc.toFixed(2);
    if (R.gkey === key && R.gcv) return R.gcv;
    const cv = document.createElement('canvas');
    cv.width = Math.round(C.WW * sc); cv.height = Math.round(C.WH * sc);
    const g = cv.getContext('2d');
    g.scale(sc, sc);
    paintGround(g, si);
    R.gkey = key; R.gcv = cv;
    return cv;
  };
  function paintGround(g, si) {
    const P = PAL[si];
    const rnd = U.seeded(4242);
    g.fillStyle = P.base; g.fillRect(0, 0, C.WW, C.WH);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH, r = 4 + rnd() * 26;
      g.globalAlpha = 0.3; g.fillStyle = U.shade(P.base, (rnd() - 0.5) * 0.2);
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.save(); g.translate(C.CX, C.CY + 8); g.scale(1, C.RY / C.RX);
    const gr = g.createRadialGradient(0, 0, C.RX * 0.2, 0, 0, C.RX * 1.3);
    gr.addColorStop(0, U.rgba(P.dirt, 1)); gr.addColorStop(0.68, U.rgba(P.dirt, 0.9)); gr.addColorStop(1, U.rgba(P.dirt, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, C.RX * 1.3, 0, TAU); g.fill();
    g.restore();
    // roads: gate to the fire, and out of the gate to the south
    g.strokeStyle = U.rgba(U.shade(P.dirt, -0.12), 0.85); g.lineCap = 'round';
    g.lineWidth = 46;
    g.beginPath(); g.moveTo(C.CX, C.CY + 40); g.lineTo(C.CX, C.CY + C.RY); g.stroke();
    g.beginPath(); g.moveTo(C.CX, C.CY + C.RY); g.bezierCurveTo(C.CX + 20, C.CY + C.RY + 90, C.CX - 60, C.WH - 90, C.CX - 30, C.WH + 40); g.stroke();
    for (let i = 0; i < 1100; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 1.12, p = Geo.pt(a, d);
      g.globalAlpha = 0.25; g.fillStyle = U.shade(P.dirt, (rnd() - 0.5) * 0.3);
      g.beginPath(); g.ellipse(p.x, p.y, 2 + rnd() * 7, 1 + rnd() * 3, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 320; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH, r = 0.8 + rnd() * 2.2;
      g.fillStyle = ['#6f6a64', '#807a72', '#5e5a55'][Math.floor(rnd() * 3)];
      g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill();
    }
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH;
      if (Geo.d(x, y) < 1.08) continue;
      g.strokeStyle = P.tuft[Math.floor(rnd() * P.tuft.length)]; g.lineWidth = 1.1; g.globalAlpha = 0.75;
      g.beginPath();
      for (let k = 0; k < 4; k++) { g.moveTo(x + k * 1.5 - 2, y); g.lineTo(x + k * 1.5 - 2 + (rnd() - 0.5) * 3.5, y - 4 - rnd() * 5); }
      g.stroke();
    }
    for (let i = 0; i < 800; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH;
      if (si !== 0 && Geo.d(x, y) < 1.1) continue;
      g.globalAlpha = si === 1 ? 0.6 : 0.85;
      g.fillStyle = P.spot[Math.floor(rnd() * P.spot.length)];
      g.beginPath(); g.ellipse(x, y, si === 0 ? 2.2 : 1.2, 1.2, rnd() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    const sg = g.createRadialGradient(C.CX, C.CY, 10, C.CX, C.CY, 64);
    sg.addColorStop(0, 'rgba(20,14,10,0.55)'); sg.addColorStop(1, 'rgba(20,14,10,0)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(C.CX, C.CY, 64, 32, 0, 0, TAU); g.fill();
  }

  // ---------- characters ----------
  function enemyStyle(type) {
    switch (type) {
      case 'runner': return { lean: 0.5, ragged: true, scale: 0.95, width: 0.82, stride: 1.35 };
      case 'brute': return { lean: 0.18, armsForward: true, ragged: true, brute: true, scale: 1.55, width: 1.45, headScale: 0.85, stride: 0.8, eyeR: 3.2 };
      case 'colossus': return { lean: 0.12, armsForward: true, antlers: true, cracks: true, scale: 2.7, width: 1.5, headScale: 0.8, stride: 0.7, eyeR: 6, armLen: 1.25 };
      default: return { lean: 0.28, armsForward: true, ragged: true, scale: 1, width: 1, stride: 0.7 };
    }
  }
  function drawEnemy(ctx, e, time, deadT, alpha) {
    const base = { x: e.x, y: e.y, face: e.face, phase: e.phase, moving: e.moving && !deadT, atk: e.atk || 0, hurt: e.hurt || 0, time, seed: e.seed, dead: deadT || 0, alpha };
    if (e.type === 'wolf') D.wolf(ctx, Object.assign(base, { glow: true }));
    else if (e.type === 'moth') D.moth(ctx, Object.assign(base, { alt: e.alt, ang: e.ang }));
    else D.human(ctx, Object.assign(base, enemyStyle(e.type), { look: e.look, glowEyes: true, tool: null }));
  }
  const WORK_TOOL = { chop: 'axe', mine: 'pickaxe', farm: 'hoe', build: 'hammer', repair: 'hammer', workshop: 'knife', armory: 'hammer', infirmary: 'knife' };
  function survOpts(s, S, x, y) {
    let pose = null, tool = LC.ROLES[s.role].tool;
    if (s.carry) pose = 'carry';
    else if ((s.aimT > 0 && s.role === 'archer') || (s.onTower && s.aimT > 0)) { pose = 'bow'; tool = 'bow'; }
    else if (s.working === 'chop' || s.working === 'mine') { pose = s.working; tool = WORK_TOOL[s.working]; }
    else if (s.working === 'farm') { pose = 'hoe'; tool = 'hoe'; }
    else if (s.working === 'build' || s.working === 'repair' || s.working === 'workshop' || s.working === 'armory' || s.working === 'heal' || s.working === 'infirmary') { pose = 'work'; tool = WORK_TOOL[s.working] || tool; }
    if (s.onTower) tool = 'bow';
    return {
      x, y, face: s.face, phase: s.phase, moving: s.moving, look: Object.assign({ coat: LC.ROLES[s.role].coat }, s.look), role: s.role, tool,
      atk: s.atk || 0, hurt: s.hurt || 0, pose, carryKind: s.carry ? s.carry.k : null, time: S.time, seed: s.id * 1.7,
      dead: s.alive ? 0 : Math.min(1, (s.deathT || 0) * 3),
    };
  }
  R.survOpts = survOpts;

  // ---------- buildings ----------
  const BS = 1.3; // building scale
  R.BS = BS;
  const SIZE = { house: [80, 60], farm: [100, 40], mill: [90, 55], quarry: [90, 50], storehouse: [95, 70], workshop: [85, 55], armory: [80, 55], infirmary: [85, 60], expedition: [70, 60], tower: [44, 70], trap: [34, 12], fire: [70, 20], gate: [150, 50], wall: [0, 0] };
  R.SIZE = SIZE;
  R.topOf = function (b) {
    const p = B.pos(b);
    const t = b.type;
    if (t === 'tower') return { x: p.x, y: p.y - 130 };
    if (t === 'trap') return { x: p.x, y: p.y - 22 };
    if (t === 'fire') return { x: p.x, y: p.y - 70 };
    if (t === 'gate') return { x: p.x, y: p.y - 80 };
    if (t === 'wall') { const w = Geo.pt(Math.PI, 1); return { x: w.x, y: w.y - 62 }; }
    const lvl = Math.max(1, b.lvl);
    const H = { house: 48 + lvl * 4, farm: 34, mill: 50 + lvl * 2, quarry: 46, storehouse: 56 + lvl * 5, workshop: 48 + lvl * 2, armory: 48 + lvl * 4, infirmary: 50 + lvl * 4, expedition: 58 + lvl * 6 }[t] || 60;
    return { x: p.x, y: p.y - (H + 6) * BS };
  };
  R.hitBuilding = function (run, wx, wy) {
    let best = null, bd = Infinity, wallHit = null;
    for (const b of run.buildings) {
      const p = B.pos(b);
      let hit = false;
      switch (b.type) {
        case 'wall': {
          const d = Geo.d(wx, wy - 14);
          if (Math.abs(d - 1) < 0.06 && !Geo.isGate(Geo.seg(wx, wy - 14))) wallHit = b;
          continue;
        }
        case 'gate': hit = Math.abs(wx - p.x) < 80 && wy > p.y - 70 && wy < p.y + 10; break;
        case 'tower': hit = Math.abs(wx - p.x) < 24 && wy > p.y - 115 && wy < p.y + 12; break;
        case 'trap': hit = Math.hypot(wx - p.x, (wy - p.y) * 1.8) < 22; break;
        case 'fire': hit = Math.hypot(wx - p.x, (wy - p.y + 12) * 1.3) < 40; break;
        default: { const s = SIZE[b.type]; hit = Math.abs(wx - p.x) < s[0] * BS / 2 + 6 && wy > p.y - (s[1] + 30) * BS && wy < p.y + 18; }
      }
      if (hit) { const d = Math.abs(wy - p.y); if (d < bd) { bd = d; best = b; } }
    }
    return best || wallHit;
  };

  function drawBuilding(ctx, b, run, S, lit) {
    const p = B.pos(b);
    const t = S.time;
    const si = G.season(run).idx;
    const lvl = b.lvl;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(BS, BS);
    if (lvl > 0) {
      switch (b.type) {
        case 'house': D.house(ctx, 0, 0, lvl, t, lit, b.id * 0.37); break;
        case 'farm': D.farm(ctx, 0, 0, lvl, si, t); break;
        case 'mill': D.mill(ctx, 0, 0, lvl, run.res.wood, t); break;
        case 'quarry': D.quarry(ctx, 0, 0, lvl, run.res.stone, t); break;
        case 'storehouse': D.storehouse(ctx, 0, 0, lvl, t); break;
        case 'workshop': D.workshop(ctx, 0, 0, lvl, t, B.active(run, b) && G.phase(run) !== 'night'); break;
        case 'armory': D.armoryB(ctx, 0, 0, lvl, t); break;
        case 'infirmary': D.infirmary(ctx, 0, 0, lvl, t, lit); break;
        case 'expedition': D.scout(ctx, 0, 0, lvl, t); break;
        default: break;
      }
    }
    if (b.target && SIZE[b.type]) {
      const s = SIZE[b.type];
      D.scaffold(ctx, 0, 0, s[0] * 0.8, s[1] * 0.8, b.progress / Math.max(0.01, b.need), lvl === 0);
    }
    ctx.restore();
  }

  // ---------- main draw ----------
  R.draw = function (S) {
    const ctx = R.ctx;
    const run = S.run || S.demo;
    if (!run) return;
    const cam = R.cam;
    D.eyes.length = 0;
    R.lights.length = 0;
    const si = G.season(run).idx;
    const st = S.night;
    const t = S.time;
    const fmax = G.fireMax(run);
    const frac = U.clamp(run.fireFuel / fmax, 0, 1);
    const amb = S.amb;
    const lit = amb > 0.35;
    const phase = G.phase(run);
    const isNight = !!st;

    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    ctx.fillStyle = '#0b0d0a';
    ctx.fillRect(0, 0, C.W, C.H);
    const z = cam.z;
    ctx.setTransform(R.scale * z, 0, 0, R.scale * z, -cam.x * R.scale * z, -cam.y * R.scale * z);
    ctx.drawImage(R.ground(si), 0, 0, C.WW, C.WH);
    const view = { x0: cam.x - 140, y0: cam.y - 80, x1: cam.x + C.W / z + 140, y1: cam.y + C.H / z + 200 };
    const vis = (x, y) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1;

    // footprints of buildings
    for (const b of run.buildings) {
      if (B.def(b.type).place !== 'plot') continue;
      const p = B.pos(b);
      ctx.fillStyle = 'rgba(70,52,34,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, SIZE[b.type][0] * 0.6 * BS, 22 * BS, 0, 0, TAU); ctx.fill();
    }

    // placement mode: highlight free spots
    if (S.place) {
      const d = B.def(S.place.type);
      const spots = R.freeSpots(run, S.place.type);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      for (const sp of spots) {
        const hov = S.place.hover === sp.id;
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = hov ? '#ffd27a' : 'rgba(255,210,122,' + (0.45 + 0.35 * pulse) + ')';
        ctx.fillStyle = hov ? 'rgba(255,200,110,0.28)' : 'rgba(255,200,110,0.08)';
        ctx.beginPath();
        if (d.place === 'plot') ctx.ellipse(sp.x, sp.y, 46 * BS, 24 * BS, 0, 0, TAU);
        else ctx.ellipse(sp.x, sp.y, 22, 10, 0, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // selection marker under the selected building / survivor
    if (S.selB) {
      const b = B.byId(run, S.selB);
      if (b && b.type !== 'wall') {
        const p = B.pos(b);
        const w = b.type === 'gate' ? 90 : SIZE[b.type] ? SIZE[b.type][0] * 0.6 * (B.def(b.type).place === 'plot' ? BS : 1) : 30;
        ctx.strokeStyle = 'rgba(255,210,122,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, Math.max(22, w), Math.max(9, w * 0.3), 0, 0, TAU); ctx.stroke();
      }
    }
    if (S.sel) {
      const s = run.survivors.find((o) => o.id === S.sel && o.alive && !o.hidden);
      if (s) {
        const by = s.onTower ? s.y - D.TOWER_H - 5 : s.y;
        if (isNight && s.tower < 0) {
          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,210,122,0.55)'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.postX, s.postY); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(s.postX, s.postY, 10, 4, 0, 0, TAU); ctx.stroke(); ctx.restore();
        }
        ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(s.x, by, 17, 6, 0, 0, TAU); ctx.stroke();
      }
    }

    // ---- depth-sorted sprites ----
    const list = [];
    for (const tr of LC.Scene.trees) {
      if (!vis(tr.x, tr.y)) continue;
      const shake = tr.shake > 0 ? Math.sin(t * 60) * tr.shake * 6 : 0;
      list.push({ y: tr.y, f: () => (tr.kind === 'pine' ? D.pine(ctx, tr.x + shake, tr.y, tr.k, si) : D.oak(ctx, tr.x + shake, tr.y, tr.k, si, tr.seed)) });
    }
    for (const r of LC.Scene.rocks) if (vis(r.x, r.y)) list.push({ y: r.y, f: () => D.rock(ctx, r.x, r.y, r.k, r.shake, r.seed) });
    const P = LC.PROPS;
    list.push({ y: C.CY + P.woodpile[1], f: () => D.woodpile(ctx, C.CX + P.woodpile[0], C.CY + P.woodpile[1], run.res.wood) });
    list.push({ y: C.CY + P.crates[1], f: () => D.crates(ctx, C.CX + P.crates[0], C.CY + P.crates[1]) });
    list.push({ y: C.CY, f: () => D.fire(ctx, C.CX, C.CY, isNight ? frac : Math.min(frac, 0.35), t, G.fireLvl(run)) });

    for (const b of run.buildings) {
      const d = B.def(b.type);
      if (b.type === 'fire' || b.type === 'wall') continue;
      const p = B.pos(b);
      if (!vis(p.x, p.y)) continue;
      if (b.type === 'gate') {
        const gmax = G.segMax(run, C.GATE_SEGS[0]);
        const hp = (run.wallHp[C.GATE_SEGS[0]] + run.wallHp[C.GATE_SEGS[1]]) / 2;
        const broken = run.wallBroken[C.GATE_SEGS[0]] || run.wallBroken[C.GATE_SEGS[1]];
        const open = !isNight && (phase === 'day' || phase === 'dusk');
        list.push({ y: p.y + 1, f: () => { D.gate(ctx, p.x, p.y - 4, Math.max(1, b.lvl), open, 1 - hp / gmax, broken, t); if (b.target) D.scaffold(ctx, p.x, p.y, 140, 40, b.progress / b.need, false); } });
        R.lights.push({ x: p.x - 70, y: p.y - 44, r: 70, a: 0.8, warm: 0.3 }, { x: p.x + 70, y: p.y - 44, r: 70, a: 0.8, warm: 0.3 });
        continue;
      }
      if (b.type === 'tower') {
        const occ = run.survivors.find((s) => s.alive && s.onTower && s.tower === b.id);
        list.push({ y: p.y + 2, f: () => {
          if (b.lvl > 0) D.tower(ctx, p.x, p.y, b.lvl, t, occ ? (ox, oy) => D.human(ctx, survOpts(occ, S, ox, oy)) : null);
          if (b.target) D.scaffold(ctx, p.x, p.y, 36, 56, b.progress / b.need, b.lvl === 0);
        } });
        if (b.lvl > 0) R.lights.push({ x: p.x + 19, y: p.y - D.TOWER_H - 20, r: 95, a: 0.9, warm: 0.5 });
        continue;
      }
      if (b.type === 'trap') {
        list.push({ y: p.y - 4, f: () => { if (b.lvl > 0) D.trap(ctx, p.x, p.y, b.lvl, LC.TRAP_ANGLES[b.slot]); if (b.target) D.scaffold(ctx, p.x, p.y, 26, 10, b.progress / b.need, b.lvl === 0); } });
        continue;
      }
      list.push({ y: p.y, f: () => drawBuilding(ctx, b, run, S, lit) });
      if (lit && b.lvl > 0 && (b.type === 'house' || b.type === 'infirmary')) R.lights.push({ x: p.x, y: p.y - 22, r: 70, a: 0.55, warm: 0.25 });
    }

    // palisade logs (gate segments are drawn by the gate)
    const wb = B.get(run, 'wall');
    const wlvl = Math.max(1, wb ? wb.lvl : 1);
    const logH = 24 + 4 * wlvl;
    for (let sgi = 0; sgi < C.SEG; sgi++) {
      if (Geo.isGate(sgi)) continue;
      const broken = run.wallBroken[sgi];
      const dmg = 1 - U.clamp(run.wallHp[sgi] / G.segMax(run, sgi), 0, 1);
      for (let k = 0; k < C.LOGS; k++) {
        const a = (sgi + (k + 0.5) / C.LOGS) / C.SEG * TAU;
        const p = Geo.pt(a, 1);
        if (!vis(p.x, p.y)) continue;
        const idx = sgi * C.LOGS + k;
        list.push({ y: p.y, f: () => D.log(ctx, p.x, p.y, logH, wlvl, dmg, idx, broken) });
      }
    }
    if (wb && wb.target) for (let sgi = 1; sgi < C.SEG; sgi += 5) { if (Geo.isGate(sgi)) continue; const p = Geo.pt(Geo.segMid(sgi), 1); list.push({ y: p.y + 1, f: () => D.scaffold(ctx, p.x, p.y, 30, 30, 0, false) }); }

    // survivors
    for (const s of run.survivors) {
      if (s.hidden || (s.onTower && s.alive)) continue;
      if (!s.alive && !isNight) continue;
      if (!vis(s.x, s.y)) continue;
      list.push({ y: s.y, f: () => D.human(ctx, survOpts(s, S, s.x, s.y)) });
    }
    if (st) {
      for (const e of st.enemies) if (vis(e.x, e.y)) list.push({ y: e.y + (e.type === 'moth' ? 40 : 0), f: () => drawEnemy(ctx, e, t, 0) });
      for (const c of st.corpses) {
        const alpha = 1 - U.clamp((c.t - 1.8) / 1.2, 0, 1);
        list.push({ y: c.y - 1, f: () => drawEnemy(ctx, Object.assign({ moving: false, atk: 0, hurt: 0, phase: 0 }, c), t, Math.min(1, c.t * 3), alpha) });
      }
    }
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();

    if (st) {
      ctx.lineCap = 'round';
      for (const p of st.proj) {
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(p.x - dx * 11, p.y - dy * 11); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
    FX.draw(ctx, false);

    // ---- lighting (screen space) ----
    const flick = 0.96 + 0.05 * U.noise1(t * 6);
    const fireR = (isNight ? 140 + 320 * frac : 130) * (B.stat('fire', 'light', G.fireLvl(run)) / 100) * flick;
    if (frac > 0) R.lights.push({ x: C.CX, y: C.CY - 12, r: fireR, a: 1, warm: isNight ? frac : 0.5 });
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    if (amb > 0.02) {
      const d = R.dctx, k = R.dark.width / C.W;
      d.setTransform(1, 0, 0, 1, 0, 0);
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, R.dark.width, R.dark.height);
      const m = U.clamp((amb - 0.3) / 0.6, 0, 1);
      const cr = Math.round(U.lerp(46, 6, m)), cg = Math.round(U.lerp(24, 9, m)), cb = Math.round(U.lerp(40, 26, m));
      d.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.8 * amb) + ')';
      d.fillRect(0, 0, R.dark.width, R.dark.height);
      d.globalCompositeOperation = 'destination-out';
      for (const L of R.lights) {
        const sp = R.w2s(L.x, L.y), r = L.r * z;
        const gr = d.createRadialGradient(sp.x * k, sp.y * k, 0, sp.x * k, sp.y * k, r * k);
        gr.addColorStop(0, 'rgba(0,0,0,' + L.a + ')'); gr.addColorStop(0.45, 'rgba(0,0,0,' + (L.a * 0.78) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr; d.beginPath(); d.arc(sp.x * k, sp.y * k, r * k, 0, TAU); d.fill();
      }
      d.globalCompositeOperation = 'source-over';
      ctx.drawImage(R.dark, 0, 0, C.W, C.H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const L of R.lights) {
        if (!L.warm) continue;
        const sp = R.w2s(L.x, L.y), r = L.r * z * 0.7;
        const gr = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r);
        gr.addColorStop(0, 'rgba(255,140,50,' + (0.2 * L.warm * amb) + ')'); gr.addColorStop(1, 'rgba(255,110,30,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, TAU); ctx.fill();
      }
      for (const e of D.eyes) {
        const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.6);
        gr.addColorStop(0, U.rgba(e.c, 0.85 * Math.max(0.35, amb))); gr.addColorStop(1, U.rgba(e.c, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.setTransform(R.scale * z, 0, 0, R.scale * z, -cam.x * R.scale * z, -cam.y * R.scale * z);
    FX.draw(ctx, true);
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    drawWeather(ctx, amb);
    overlays(ctx, S, run, st);
  };

  R.freeSpots = function (run, type) {
    const d = B.def(type);
    const out = [];
    if (d.place === 'plot') { const used = B.usedPlots(run); LC.PLOTS.forEach((_, i) => { if (!used.has(i)) { const p = Geo.plotPos(i); out.push({ id: i, x: p.x, y: p.y }); } }); }
    else if (d.place === 'tower') { const used = B.usedSlots(run, 'tower'); LC.TOWER_ANGLES.forEach((_, i) => { if (!used.has(i)) { const p = Geo.towerPos(i); out.push({ id: i, x: p.x, y: p.y }); } }); }
    else if (d.place === 'trap') { const used = B.usedSlots(run, 'trap'); LC.TRAP_ANGLES.forEach((_, i) => { if (!used.has(i)) { const p = Geo.trapPos(i); out.push({ id: i, x: p.x, y: p.y }); } }); }
    return out;
  };

  // ---------- weather (screen space) ----------
  R.updateWeather = function (dt, run, amb) {
    const si = G.season(run).idx;
    const raining = si === 2 && run.night % 2 === 0;
    const kind = si === 1 ? 'snow' : raining ? 'rain' : si === 0 ? 'leaves' : 'fireflies';
    if (R.wkind !== kind) {
      R.wkind = kind;
      R.weather = [];
      const n = kind === 'snow' ? 150 : kind === 'rain' ? 140 : kind === 'leaves' ? 26 : 34;
      for (let i = 0; i < n; i++) R.weather.push(newDrop(kind, true));
    }
    for (const p of R.weather) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
      if (kind === 'snow' || kind === 'leaves') p.x += Math.sin(p.t * p.w) * 12 * dt;
      if (kind === 'fireflies') { p.vx = U.clamp(p.vx + U.rand(-20, 20) * dt, -14, 14); p.vy = U.clamp(p.vy + U.rand(-20, 20) * dt, -14, 14); }
      if (p.y > C.H + 10 || p.x < -20 || p.x > C.W + 20 || (kind === 'fireflies' && p.y < -10)) Object.assign(p, newDrop(kind, false));
    }
  };
  function newDrop(kind, anywhere) {
    const x = U.rand(-10, C.W + 10), y = anywhere ? U.rand(0, C.H) : -10;
    switch (kind) {
      case 'snow': return { x, y, vx: U.rand(-12, -4), vy: U.rand(22, 48), r: U.rand(0.8, 2.2), t: U.rand(0, 9), w: U.rand(1, 2.5) };
      case 'rain': return { x, y, vx: -60, vy: U.rand(520, 640), r: 1, t: 0, w: 0 };
      case 'leaves': return { x, y, vx: U.rand(-25, -8), vy: U.rand(18, 36), r: U.rand(1.6, 2.6), t: U.rand(0, 9), w: U.rand(1.5, 3), c: U.pick(['#b85a2a', '#d99036', '#8e3b22']) };
      default: return { x: U.rand(0, C.W), y: U.rand(0, C.H), vx: U.rand(-8, 8), vy: U.rand(-8, 8), r: 1.4, t: U.rand(0, 9), w: U.rand(1, 3) };
    }
  }
  function drawWeather(ctx, amb) {
    const kind = R.wkind;
    if (!kind) return;
    if (kind === 'snow') {
      ctx.fillStyle = 'rgba(240,246,250,' + (0.85 - amb * 0.35) + ')';
      for (const p of R.weather) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    } else if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(180,200,220,' + (0.35 - amb * 0.15) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); for (const p of R.weather) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1.2, p.y - 11); } ctx.stroke();
    } else if (kind === 'leaves') {
      for (const p of R.weather) { ctx.fillStyle = p.c; ctx.globalAlpha = 0.9 - amb * 0.4; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.8, p.t * 2, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else if (kind === 'fireflies' && amb > 0.4) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of R.weather) {
        const a = (0.4 + 0.6 * Math.abs(Math.sin(p.t * p.w))) * (amb - 0.4) * 1.6;
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        gr.addColorStop(0, 'rgba(220,255,120,' + a + ')'); gr.addColorStop(1, 'rgba(220,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- labels, badges, bars (screen space, constant size) ----------
  function bar(ctx, x, y, w, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * U.clamp(frac, 0, 1), 3);
  }
  function label(ctx, x, y, text, color) {
    ctx.font = '600 11px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#f3e6cf';
    ctx.fillText(text, x, y);
  }
  function badge(ctx, x, y, main, sub, subColor, selected) {
    ctx.font = '700 10.5px Inter, "Segoe UI", sans-serif';
    const w1 = ctx.measureText(main).width;
    ctx.font = '600 9.5px Inter, "Segoe UI", sans-serif';
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const w = Math.max(w1, w2) + 12, h = sub ? 27 : 16;
    ctx.fillStyle = selected ? 'rgba(80,52,20,0.92)' : 'rgba(16,12,9,0.8)';
    D.rr(ctx, x - w / 2, y - h, w, h, 5); ctx.fill();
    ctx.strokeStyle = selected ? '#ffd27a' : 'rgba(196,138,44,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '700 10.5px Inter, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffd690';
    ctx.fillText(main, x, y - h + 11.5);
    if (sub) { ctx.font = '600 9.5px Inter, "Segoe UI", sans-serif'; ctx.fillStyle = subColor || '#d8c4a2'; ctx.fillText(sub, x, y - 4.5); }
  }
  R.houseOccupancy = function (run) {
    let left = G.alive(run).length;
    const occ = {};
    for (const h of B.all(run, 'house').filter((b) => b.lvl > 0)) { const beds = B.stat('house', 'beds', h.lvl); occ[h.id] = [Math.min(beds, left), beds]; left = Math.max(0, left - beds); }
    return occ;
  };
  function overlays(ctx, S, run, st) {
    const z = R.cam.z;
    const occ = R.houseOccupancy(run);
    const builders = run.survivors.some((s) => s.alive && s.task === 'build');
    for (const b of (S.screen === 'menu' ? [] : run.buildings)) {
      const top = R.topOf(b);
      if (!R.onScreen(top.x, top.y, 40)) continue;
      const sp = R.w2s(top.x, top.y);
      const d = B.def(b.type);
      let main = (b.lvl > 0 ? 'Lv ' + b.lvl : 'New') + (b.type === 'wall' ? ' Palisade' : b.type === 'gate' ? ' Gate' : '');
      let sub = null, sc = null;
      if (b.target) { sub = '⚒ ' + Math.floor(b.progress / b.need * 100) + '%' + (builders ? '' : ' · needs builder'); sc = builders ? '#ffd27a' : '#ff8a75'; }
      else if (b.type === 'house') { const o = occ[b.id] || [0, 0]; sub = 'beds ' + o[0] + '/' + o[1]; sc = o[0] < o[1] ? '#9fd88e' : '#d8c4a2'; }
      else if (d.workers && b.lvl > 0) { const n = B.staff(run, b).length, m = B.slots(b); sub = '👷 ' + Math.min(n, m) + '/' + m; sc = n > 0 ? '#9fd88e' : '#ff8a75'; }
      else if (b.type === 'tower' && b.lvl > 0) { const g = b.guard && run.survivors.find((s) => s.id === b.guard && s.alive); sub = 'guard: ' + (g ? g.name : 'auto'); sc = g ? '#9fd88e' : '#d8c4a2'; }
      if (b.type === 'trap' && z < 0.8 && !b.target) continue;
      badge(ctx, sp.x, sp.y, main, sub, sc, S.selB === b.id);
    }
    if (st) {
      for (let i = 0; i < C.SEG; i++) {
        const max = G.segMax(run, i);
        const p = Geo.pt(Geo.segMid(i), 1);
        if (!R.onScreen(p.x, p.y)) continue;
        const sp = R.w2s(p.x, p.y);
        if (run.wallBroken[i]) label(ctx, sp.x, sp.y - 12 * z, Geo.isGate(i) ? 'GATE DOWN' : 'BREACH', '#ff6a55');
        else if (run.wallHp[i] < max) bar(ctx, sp.x, sp.y - (44 + (B.lvl(run, 'wall') || 1) * 4) * z, 22, run.wallHp[i] / max, '#d9a441');
      }
      for (const e of st.enemies) {
        if (e.hp < e.maxHp && !e.flee && R.onScreen(e.x, e.y)) {
          const def = LC.ENEMIES[e.type];
          const h = e.type === 'moth' ? e.alt + 20 : (e.type === 'wolf' ? 34 : def.hitH * 1.9 + 8) * D.FIG;
          const sp = R.w2s(e.x, e.y - h);
          bar(ctx, sp.x, sp.y, e.type === 'colossus' ? 60 : 20, e.hp / e.maxHp, '#d9483a');
        }
      }
    }
    for (const s of run.survivors) {
      if (!s.alive || s.hidden) continue;
      const by = s.onTower ? s.y - D.TOWER_H - 5 : s.y;
      if (!R.onScreen(s.x, by)) continue;
      const sp = R.w2s(s.x, by - 66);
      const f = s.hp / G.maxHp(run, s);
      if (st || f < 0.999) bar(ctx, sp.x, sp.y, 24, f, f < 0.35 ? '#e0483a' : '#6cc070');
      if (s.id === S.sel || s.id === S.hover) label(ctx, sp.x, sp.y - 5, s.name + (st ? '' : ' · ' + LC.ROLES[s.role].name), '#ffd27a');
    }
    for (const tx of FX.texts) {
      if (!R.onScreen(tx.x, tx.y)) continue;
      const sp = R.w2s(tx.x, tx.y);
      ctx.globalAlpha = U.clamp(2.2 - tx.t, 0, 1);
      label(ctx, sp.x, sp.y, tx.str, tx.color);
    }
    ctx.globalAlpha = 1;
  }
})(window.LC);
