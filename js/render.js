/* Last Camp — world rendering, lighting, particles, weather */
(function (LC) {
  'use strict';
  const U = LC.U, C = LC.C, D = LC.Draw, Geo = LC.Geo, G = LC.Game;
  const TAU = Math.PI * 2;

  // ---------- particles & floating text ----------
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
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
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
      const a = U.clamp(p.life / p.max, 0, 1) * (p.alpha || 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      if (p.plus) { ctx.fillRect(p.x - p.size, p.y - 0.6, p.size * 2, 1.2); ctx.fillRect(p.x - 0.6, p.y - p.size, 1.2, p.size * 2); }
      else if (p.rect) ctx.fillRect(p.x - p.size, p.y - p.size * 0.4, p.size * 2, p.size * 0.8);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };

  // ---------- renderer ----------
  const R = (LC.Render = { scale: 1, lights: [], weather: [], wkind: null });

  R.init = function (cv) {
    R.cv = cv;
    R.ctx = cv.getContext('2d');
    R.dark = document.createElement('canvas');
    R.dark.width = C.W / 2; R.dark.height = C.H / 2;
    R.dctx = R.dark.getContext('2d');
    buildScene();
  };

  R.resize = function (cssScale) {
    const dpr = window.devicePixelRatio || 1;
    R.scale = U.clamp(cssScale * dpr, 0.5, 2.5);
    R.cv.width = Math.round(C.W * R.scale);
    R.cv.height = Math.round(C.H * R.scale);
    D.R = R.scale;
    R.gkey = null;
  };

  function buildScene() {
    const rnd = U.seeded(1337);
    const trees = [];
    let tries = 0;
    while (trees.length < 64 && tries < 6000) {
      tries++;
      const x = rnd() * (C.W + 60) - 30, y = rnd() * (C.H + 30) + 15;
      if (Geo.d(x, y) < 1.5) continue;
      if (trees.some((t) => Math.hypot(t.x - x, (t.y - y) * 1.4) < 44)) continue;
      trees.push({ x, y, k: 0.85 + rnd() * 0.6, kind: rnd() < 0.68 ? 'pine' : 'oak', seed: rnd() });
    }
    R.trees = trees;
  }

  const PAL = [
    { base: '#3b3a25', dirt: '#5b4630', tuft: ['#5a5a2e', '#6b5e2c', '#4a4a26'], spot: ['#7a4a1e', '#9a5a20', '#6e3a1a', '#b0702a'] },
    { base: '#c9d1d8', dirt: '#8f8a82', tuft: ['#e9eef2', '#b8c0c6', '#aab3ba'], spot: ['#ffffff', '#dfe7ec'] },
    { base: '#3d5a2b', dirt: '#5a4a34', tuft: ['#4f7a34', '#5f8c3c', '#3f6a2c'], spot: ['#ece6f2', '#f2d65a', '#b98ad8'] },
    { base: '#56622e', dirt: '#6a5434', tuft: ['#6b7a32', '#7a8a3a', '#5a6a2a'], spot: ['#f2e05a', '#ecece2'] },
  ];

  R.ground = function (si) {
    const key = si + '_' + R.scale.toFixed(2);
    if (R.gkey === key && R.gcv) return R.gcv;
    const cv = document.createElement('canvas');
    const sc = Math.min(R.scale, 2);
    cv.width = Math.round(C.W * sc); cv.height = Math.round(C.H * sc);
    const g = cv.getContext('2d');
    g.scale(sc, sc);
    paintGround(g, si);
    R.gkey = key; R.gcv = cv;
    return cv;
  };

  function paintGround(g, si) {
    const P = PAL[si];
    const rnd = U.seeded(4242);
    g.fillStyle = P.base; g.fillRect(0, 0, C.W, C.H);
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * C.W, y = rnd() * C.H, r = 4 + rnd() * 24;
      g.globalAlpha = 0.32;
      g.fillStyle = U.shade(P.base, (rnd() - 0.5) * 0.2);
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // trampled clearing
    g.save();
    g.translate(C.CX, C.CY + 8);
    g.scale(1, C.RY / C.RX);
    const gr = g.createRadialGradient(0, 0, C.RX * 0.2, 0, 0, C.RX * 1.38);
    gr.addColorStop(0, U.rgba(P.dirt, 1));
    gr.addColorStop(0.62, U.rgba(P.dirt, 0.92));
    gr.addColorStop(1, U.rgba(P.dirt, 0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, C.RX * 1.38, 0, TAU); g.fill();
    g.restore();
    // path out of camp
    g.strokeStyle = U.rgba(P.dirt, 0.7); g.lineWidth = 40; g.lineCap = 'round';
    g.beginPath(); g.moveTo(C.CX, C.CY + C.RY * 0.9); g.bezierCurveTo(C.CX + 30, C.CY + C.RY + 60, C.CX - 70, C.H - 50, C.CX - 40, C.H + 40); g.stroke();
    // dirt texture
    for (let i = 0; i < 700; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * 1.15;
      const p = Geo.pt(a, d);
      g.globalAlpha = 0.25;
      g.fillStyle = U.shade(P.dirt, (rnd() - 0.5) * 0.3);
      g.beginPath(); g.ellipse(p.x, p.y, 2 + rnd() * 7, 1 + rnd() * 3, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // pebbles
    for (let i = 0; i < 180; i++) {
      const x = rnd() * C.W, y = rnd() * C.H, r = 0.8 + rnd() * 2.2;
      g.fillStyle = U.pick(['#6f6a64', '#807a72', '#5e5a55']);
      g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, TAU); g.fill();
    }
    // grass tufts outside the camp
    for (let i = 0; i < 1300; i++) {
      const x = rnd() * C.W, y = rnd() * C.H;
      if (Geo.d(x, y) < 1.1) continue;
      g.strokeStyle = P.tuft[Math.floor(rnd() * P.tuft.length)];
      g.lineWidth = 1.1;
      g.globalAlpha = 0.75;
      g.beginPath();
      for (let k = 0; k < 4; k++) { g.moveTo(x + k * 1.5 - 2, y); g.lineTo(x + k * 1.5 - 2 + (rnd() - 0.5) * 3.5, y - 4 - rnd() * 5); }
      g.stroke();
    }
    // leaves / flowers / sparkles
    for (let i = 0; i < 420; i++) {
      const x = rnd() * C.W, y = rnd() * C.H;
      if (si !== 0 && Geo.d(x, y) < 1.12) continue;
      g.globalAlpha = si === 1 ? 0.6 : 0.85;
      g.fillStyle = P.spot[Math.floor(rnd() * P.spot.length)];
      g.beginPath(); g.ellipse(x, y, si === 0 ? 2.2 : 1.2, si === 0 ? 1.2 : 1.2, rnd() * 3, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // scorched earth around the fire
    const sg = g.createRadialGradient(C.CX, C.CY, 10, C.CX, C.CY, 60);
    sg.addColorStop(0, 'rgba(20,14,10,0.55)'); sg.addColorStop(1, 'rgba(20,14,10,0)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(C.CX, C.CY, 60, 30, 0, 0, TAU); g.fill();
  }

  const TENT_COLORS = ['#6d6a4a', '#5b4e3a', '#4f5a46', '#665240', '#5a5e66', '#6a4a3e'];

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

  function survOpts(s, S, x, y) {
    let pose = null;
    if (s.alive && s.aimT > 0 && s.role === 'hunter' || (s.onTower && s.aimT > 0)) pose = 'bow';
    else if (s.working) pose = 'work';
    const tool = (s.onTower || (pose === 'bow')) ? 'bow' : LC.ROLES[s.role].tool;
    return {
      x, y, face: s.face, phase: s.phase, moving: s.moving, look: s.look, role: s.role, tool,
      atk: s.atk || 0, hurt: s.hurt || 0, pose, time: S.time, seed: s.id * 1.7,
      dead: s.alive ? 0 : Math.min(1, (s.deathT || 0) * 3),
    };
  }

  R.draw = function (S) {
    const ctx = R.ctx;
    const run = S.run || S.demo;
    if (!run) return;
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    D.eyes.length = 0;
    R.lights.length = 0;
    const si = G.season(run).idx;
    const st = run.phase === 'night' || run.phase === 'gameover' ? S.night : null;
    const t = S.time;
    const fmax = G.fireMax(run);
    const frac = U.clamp(run.fireFuel / fmax, 0, 1);

    ctx.drawImage(R.ground(si), 0, 0, C.W, C.H);

    // ground markers under sprites
    if (S.sel && run.phase === 'night') {
      const s = run.survivors.find((o) => o.id === S.sel && o.alive);
      if (s) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255,210,122,0.55)'; ctx.lineWidth = 1.2;
        if (s.tower < 0) {
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.postX, s.postY); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(s.postX, s.postY, 10, 4, 0, 0, TAU); ctx.stroke();
        }
        ctx.setLineDash([]);
        const by = s.onTower ? s.y - D.TOWER_H - 5 : s.y;
        ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.ellipse(s.x, by, 17, 6, 0, 0, TAU); ctx.stroke();
        ctx.restore();
        // tower hints
        for (let i = 0; i < run.towers; i++) {
          const p = Geo.towerPos(i);
          ctx.strokeStyle = 'rgba(255,210,122,0.35)'; ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 22, 8, 0, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // ---- depth-sorted sprites ----
    const list = [];
    for (const tr of R.trees) {
      list.push({ y: tr.y, f: () => (tr.kind === 'pine' ? D.pine(ctx, tr.x, tr.y, tr.k, si) : D.oak(ctx, tr.x, tr.y, tr.k, si, tr.seed)) });
    }
    for (let i = 0; i < Math.min(run.tents, LC.TENT_SLOTS.length); i++) {
      const [dx, dy] = LC.TENT_SLOTS[i];
      list.push({ y: C.CY + dy, f: () => D.tent(ctx, C.CX + dx, C.CY + dy, TENT_COLORS[i]) });
    }
    const P = LC.PROPS;
    list.push({ y: C.CY + P.woodpile[1], f: () => D.woodpile(ctx, C.CX + P.woodpile[0], C.CY + P.woodpile[1], run.res.wood) });
    list.push({ y: C.CY + P.crates[1], f: () => D.crates(ctx, C.CX + P.crates[0], C.CY + P.crates[1]) });
    list.push({ y: C.CY + P.barrel[1], f: () => D.barrel(ctx, C.CX + P.barrel[0], C.CY + P.barrel[1]) });
    if (run.armory > 0) list.push({ y: C.CY + P.armory[1], f: () => D.armory(ctx, C.CX + P.armory[0], C.CY + P.armory[1], run.armory) });
    list.push({ y: C.CY, f: () => D.fire(ctx, C.CX, C.CY, frac, t, run.fireLvl) });

    // palisade
    const wmax = G.wallMax(run);
    const logH = 24 + 4 * run.wallLvl;
    for (let sgi = 0; sgi < C.SEG; sgi++) {
      const broken = run.wallBroken[sgi];
      const dmg = 1 - U.clamp(run.wallHp[sgi] / wmax, 0, 1);
      for (let k = 0; k < C.LOGS; k++) {
        const a = (sgi + (k + 0.5) / C.LOGS) / C.SEG * TAU;
        const p = Geo.pt(a, 1);
        const idx = sgi * C.LOGS + k;
        list.push({ y: p.y, f: () => D.log(ctx, p.x, p.y, logH, run.wallLvl, dmg, idx, broken) });
      }
    }
    // traps
    for (let i = 0; i < run.traps; i++) {
      const p = Geo.trapPos(i);
      list.push({ y: p.y - 4, f: () => D.trap(ctx, p.x, p.y, run.trapLvl, LC.TRAP_ANGLES[i]) });
    }
    // towers (with their archers)
    for (let i = 0; i < run.towers; i++) {
      const p = Geo.towerPos(i);
      const occ = run.survivors.find((s) => s.alive && s.onTower && s.tower === i);
      list.push({ y: p.y + 2, f: () => D.tower(ctx, p.x, p.y, run.towerLvl, t, occ ? (ox, oy) => D.human(ctx, survOpts(occ, S, ox, oy)) : null) });
      R.lights.push({ x: p.x + 19, y: p.y - D.TOWER_H - 20, r: 95, a: 0.9, warm: 0.5 });
    }
    // survivors
    for (const s of run.survivors) {
      if (s.onTower && s.alive) continue;
      if (!s.alive && run.phase !== 'night' && run.phase !== 'gameover') continue;
      list.push({ y: s.y, f: () => D.human(ctx, survOpts(s, S, s.x, s.y)) });
    }
    // enemies and corpses
    if (st) {
      for (const e of st.enemies) list.push({ y: e.y + (e.type === 'moth' ? 40 : 0), f: () => drawEnemy(ctx, e, t, 0) });
      for (const c of st.corpses) {
        const alpha = 1 - U.clamp((c.t - 1.8) / 1.2, 0, 1);
        list.push({ y: c.y - 1, f: () => drawEnemy(ctx, Object.assign({ moving: false, atk: 0, hurt: 0, phase: 0 }, c), t, Math.min(1, c.t * 3), alpha) });
      }
    }
    list.sort((a, b) => a.y - b.y);
    for (const it of list) it.f();

    // arrows
    if (st) {
      ctx.lineCap = 'round';
      for (const p of st.proj) {
        const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
        ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(p.x - dx * 11, p.y - dy * 11); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - dx * 11, p.y - dy * 11); ctx.lineTo(p.x - dx * 14 - dy * 2, p.y - dy * 14 + dx * 2); ctx.moveTo(p.x - dx * 11, p.y - dy * 11); ctx.lineTo(p.x - dx * 14 + dy * 2, p.y - dy * 14 - dx * 2); ctx.stroke();
      }
    }
    FX.draw(ctx, false);

    // ---- lighting ----
    const amb = S.amb;
    const flick = 0.96 + 0.05 * U.noise1(t * 6);
    const fireR = (130 + 300 * frac) * (1 + 0.08 * (run.fireLvl - 1)) * flick;
    if (frac > 0) R.lights.push({ x: C.CX, y: C.CY - 12, r: fireR, a: 1, warm: frac });
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
        const gr = d.createRadialGradient(L.x * k, L.y * k, 0, L.x * k, L.y * k, L.r * k);
        gr.addColorStop(0, 'rgba(0,0,0,' + L.a + ')');
        gr.addColorStop(0.45, 'rgba(0,0,0,' + (L.a * 0.78) + ')');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr;
        d.beginPath(); d.arc(L.x * k, L.y * k, L.r * k, 0, TAU); d.fill();
      }
      d.globalCompositeOperation = 'source-over';
      ctx.drawImage(R.dark, 0, 0, C.W, C.H);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const L of R.lights) {
        if (!L.warm) continue;
        const gr = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.7);
        gr.addColorStop(0, 'rgba(255,140,50,' + (0.2 * L.warm * amb) + ')');
        gr.addColorStop(1, 'rgba(255,110,30,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(L.x, L.y, L.r * 0.7, 0, TAU); ctx.fill();
      }
      // glowing eyes in the dark
      for (const e of D.eyes) {
        const gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.6);
        gr.addColorStop(0, U.rgba(e.c, 0.85 * Math.max(0.35, amb)));
        gr.addColorStop(1, U.rgba(e.c, 0));
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    FX.draw(ctx, true);

    drawWeather(ctx, si, amb, run);
    overlays(ctx, S, run, st);
  };

  // ---------- weather ----------
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
      if (kind === 'fireflies') { p.vx += U.rand(-20, 20) * dt; p.vy += U.rand(-20, 20) * dt; p.vx = U.clamp(p.vx, -14, 14); p.vy = U.clamp(p.vy, -14, 14); }
      if (p.y > C.H + 10 || p.x < -20 || p.x > C.W + 20 || (kind === 'fireflies' && p.y < -10)) Object.assign(p, newDrop(kind, false));
    }
  };
  function newDrop(kind, anywhere) {
    const x = U.rand(-10, C.W + 10), y = anywhere ? U.rand(0, C.H) : -10;
    switch (kind) {
      case 'snow': return { x, y, vx: U.rand(-12, -4), vy: U.rand(22, 48), r: U.rand(0.8, 2.2), t: U.rand(0, 9), w: U.rand(1, 2.5) };
      case 'rain': return { x, y, vx: -60, vy: U.rand(520, 640), r: 1, t: 0, w: 0 };
      case 'leaves': return { x, y, vx: U.rand(-25, -8), vy: U.rand(18, 36), r: U.rand(1.6, 2.6), t: U.rand(0, 9), w: U.rand(1.5, 3), c: U.pick(['#b85a2a', '#d99036', '#8e3b22']) };
      default: {
        let fx, fy;
        do { fx = U.rand(0, C.W); fy = U.rand(0, C.H); } while (Geo.d(fx, fy) < 1.15);
        return { x: fx, y: fy, vx: U.rand(-8, 8), vy: U.rand(-8, 8), r: 1.4, t: U.rand(0, 9), w: U.rand(1, 3) };
      }
    }
  }
  function drawWeather(ctx, si, amb) {
    const kind = R.wkind;
    if (!kind) return;
    if (kind === 'snow') {
      ctx.fillStyle = 'rgba(240,246,250,' + (0.85 - amb * 0.35) + ')';
      for (const p of R.weather) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    } else if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(180,200,220,' + (0.35 - amb * 0.15) + ')'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of R.weather) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1.2, p.y - 11); }
      ctx.stroke();
    } else if (kind === 'leaves') {
      for (const p of R.weather) {
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.9 - amb * 0.4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.6, p.r * 0.8, p.t * 2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'fireflies' && amb > 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of R.weather) {
        const a = (0.4 + 0.6 * Math.abs(Math.sin(p.t * p.w))) * (amb - 0.4) * 1.6;
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        gr.addColorStop(0, 'rgba(220,255,120,' + a + ')'); gr.addColorStop(1, 'rgba(220,255,120,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- overlays: health bars, names, floating text ----------
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
  function overlays(ctx, S, run, st) {
    if (run.phase === 'night' && st) {
      const wmax = G.wallMax(run);
      for (let i = 0; i < C.SEG; i++) {
        const p = Geo.pt(Geo.segMid(i), 1);
        if (run.wallBroken[i]) label(ctx, p.x, p.y - 12, 'BREACH', '#ff6a55');
        else if (run.wallHp[i] < wmax) bar(ctx, p.x, p.y - 40 - run.wallLvl * 4, 22, run.wallHp[i] / wmax, '#d9a441');
      }
      for (const e of st.enemies) {
        if (e.hp < e.maxHp && !e.flee) {
          const def = LC.ENEMIES[e.type];
          const h = e.type === 'moth' ? e.alt + 20 : (e.type === 'wolf' ? 34 : def.hitH * 1.9 + 8) * D.FIG;
          bar(ctx, e.x, e.y - h, e.type === 'colossus' ? 60 : 20, e.hp / e.maxHp, '#d9483a');
        }
      }
      for (const s of run.survivors) {
        if (!s.alive) continue;
        const y = s.onTower ? s.y - D.TOWER_H - 5 : s.y;
        bar(ctx, s.x, y - 68, 24, s.hp / G.maxHp(run, s), s.hp / G.maxHp(run, s) < 0.35 ? '#e0483a' : '#6cc070');
        if (s.id === S.sel || s.id === S.hover) label(ctx, s.x, y - 73, s.name, '#ffd27a');
      }
    } else if (run.phase === 'day' || run.phase === 'dusk') {
      for (const s of run.survivors) {
        if (!s.alive) continue;
        if (s.id === S.hover) label(ctx, s.x, s.y - 64, s.name + ' · ' + LC.ROLES[s.role].name, '#ffd27a');
      }
    }
    for (const tx of FX.texts) {
      ctx.globalAlpha = U.clamp(2.2 - tx.t, 0, 1);
      label(ctx, tx.x, tx.y, tx.str, tx.color);
    }
    ctx.globalAlpha = 1;
  }
})(window.LC);
