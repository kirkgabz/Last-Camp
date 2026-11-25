/* Last Camp — procedural drawing of people, creatures and the camp */
(function (LC) {
  'use strict';
  const U = LC.U;
  const TAU = Math.PI * 2;
  const D = (LC.Draw = { R: 1, eyes: [], FIG: 1.3 });

  const col = (c, fl) => (fl > 0 ? U.mix(c, '#ffffff', Math.min(0.7, fl * 0.7)) : c);

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  D.rr = rr;

  // two-segment limb; angle measured from straight down, positive = forward (+x)
  function limb2(ctx, x, y, a, len, bend, w, color) {
    const kx = x + Math.sin(a) * len * 0.5, ky = y + Math.cos(a) * len * 0.5;
    const a2 = a + bend;
    const ex = kx + Math.sin(a2) * len * 0.5, ey = ky + Math.cos(a2) * len * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(kx, ky);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    return [ex, ey, a2];
  }

  function pushEye(ctx, px, py, r, c) {
    const m = ctx.getTransform();
    D.eyes.push({ x: (m.a * px + m.c * py + m.e) / D.R, y: (m.b * px + m.d * py + m.f) / D.R, r, c });
  }

  function tool(ctx, kind, x, y, a, fl, draw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-a);
    ctx.lineCap = 'round';
    const wood = col('#6b4a2b', fl), steel = col('#a9b0b6', fl), dark = col('#3b3f44', fl);
    switch (kind) {
      case 'axe':
        ctx.strokeStyle = wood; ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 14); ctx.stroke();
        ctx.fillStyle = steel;
        ctx.beginPath(); ctx.moveTo(-0.8, 9.5); ctx.lineTo(5.5, 7.5); ctx.quadraticCurveTo(7.4, 11.5, 5.8, 15.2); ctx.lineTo(-0.8, 13.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col('#d8dde2', fl); ctx.fillRect(5, 8.2, 1.2, 6.4);
        break;
      case 'hammer':
        ctx.strokeStyle = wood; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 12); ctx.stroke();
        ctx.fillStyle = dark; ctx.fillRect(-3.2, 10, 8, 4.2);
        ctx.fillStyle = col('#5a5f66', fl); ctx.fillRect(-3.2, 10, 8, 1.3);
        break;
      case 'crowbar':
        ctx.strokeStyle = col('#7c2f2a', fl); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 13); ctx.quadraticCurveTo(0, 16, 3, 15.5); ctx.stroke();
        break;
      case 'knife':
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 2); ctx.stroke();
        ctx.strokeStyle = steel; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0.6, 8.5); ctx.stroke();
        break;
      case 'bow': {
        const pull = draw || 0;
        ctx.strokeStyle = col('#7a5232', fl); ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.moveTo(-11, -1.5); ctx.quadraticCurveTo(0, 7, 11, -1.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,220,200,0.85)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(-11, -1.5); ctx.lineTo(0, -1.5 - pull * 7); ctx.lineTo(11, -1.5); ctx.stroke();
        if (pull > 0.2) {
          ctx.strokeStyle = col('#c9b28a', fl); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -1.5 - pull * 7); ctx.lineTo(0, 9); ctx.stroke();
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  function hair(ctx, L, hx, hy, r, colr, fl, isEnemy) {
    const st = L.hairStyle;
    ctx.fillStyle = colr;
    const cap = () => {
      ctx.beginPath();
      ctx.arc(hx, hy, r + 0.5, Math.PI * 0.92, Math.PI * 1.92);
      ctx.quadraticCurveTo(hx + 1, hy - r * 0.55, hx - r * 0.35, hy - r * 0.15);
      ctx.quadraticCurveTo(hx - r * 0.55, hy + r * 0.45, hx - r * 0.6, hy + r * 0.75);
      ctx.closePath();
      ctx.fill();
    };
    switch (st) {
      case 'short': cap(); break;
      case 'long':
        cap();
        ctx.beginPath();
        ctx.moveTo(hx - r * 1.02, hy - r * 0.2);
        ctx.quadraticCurveTo(hx - r * 1.25, hy + r * 1.1, hx - r * 1.05, hy + r * 1.75);
        ctx.lineTo(hx - r * 0.2, hy + r * 1.5);
        ctx.quadraticCurveTo(hx - r * 0.3, hy + r * 0.5, hx - r * 0.1, hy + r * 0.2);
        ctx.closePath(); ctx.fill();
        break;
      case 'ponytail':
        cap();
        ctx.beginPath(); ctx.ellipse(hx - r * 1.25, hy + r * 0.35, r * 0.38, r * 0.7, 0.35, 0, TAU); ctx.fill();
        break;
      case 'bun':
        cap();
        ctx.beginPath(); ctx.arc(hx - r * 0.75, hy - r * 0.85, r * 0.45, 0, TAU); ctx.fill();
        break;
      case 'beanie': {
        ctx.fillStyle = col(L.hat || '#8a2d2d', fl);
        ctx.beginPath(); ctx.arc(hx, hy - 0.2, r + 0.7, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col(U.shade(L.hat || '#8a2d2d', -0.2), fl);
        ctx.fillRect(hx - r - 0.7, hy - 1.6, (r + 0.7) * 2, 2.2);
        ctx.beginPath(); ctx.arc(hx - 0.5, hy - r - 1.1, 1.4, 0, TAU); ctx.fill();
        break;
      }
      case 'cap': {
        const c = col(L.hat || '#2d4a6a', fl);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(hx, hy - 0.4, r + 0.5, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col(U.shade(L.hat || '#2d4a6a', -0.25), fl);
        ctx.beginPath(); ctx.moveTo(hx + r * 0.4, hy - 1.4); ctx.lineTo(hx + r + 4, hy - 0.6); ctx.lineTo(hx + r + 3.5, hy + 0.4); ctx.lineTo(hx + r * 0.3, hy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = colr;
        ctx.fillRect(hx - r * 0.95, hy - 0.6, r * 0.5, 2.6);
        break;
      }
      case 'stringy':
        ctx.strokeStyle = colr; ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI * (1.05 + i * 0.15);
          const sx = hx + Math.cos(a) * r, sy = hy + Math.sin(a) * r;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx - 2.5, sy + 3, sx - 3.2 + i * 0.3, sy + 7 + (i % 2) * 2);
        }
        ctx.stroke();
        break;
      case 'bald':
        if (!isEnemy) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.beginPath(); ctx.ellipse(hx - 1, hy - r * 0.55, r * 0.45, r * 0.25, -0.3, 0, TAU); ctx.fill();
        }
        break;
      default: cap();
    }
  }

  function antlers(ctx, hx, hy, r) {
    ctx.strokeStyle = '#d8cab0';
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = hx + side * r * 0.45 - 0.5, by = hy - r * 0.8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      const tx = bx + side * 5 - 2, ty = by - 13;
      ctx.quadraticCurveTo(bx + side * 1.5, by - 7, tx, ty);
      ctx.moveTo(bx + side * 1 - 0.3, by - 5); ctx.lineTo(bx + side * 5.5, by - 8);
      ctx.moveTo(bx + side * 2 - 1, by - 9.5); ctx.lineTo(bx - side * 1.5 - 1, by - 14.5);
      ctx.moveTo(tx, ty); ctx.lineTo(tx + side * 3, ty - 3);
      ctx.stroke();
    }
  }

  /*
   * D.human(ctx, o) — upright 3/4-view person (survivors and humanoid enemies)
   * o: x,y (feet), face(1|-1), phase, moving, look, tool, role, scale, width, lean,
   *    atk(0..1), hurt(0..1), pose('bow'|'work'), time, seed, dead(0..1), alpha,
   *    armsForward, ragged, brute, antlers, cracks, glowEyes, eyeR, headScale, stride, noShadow
   */
  D.human = function (ctx, o) {
    const s = (o.scale || 1) * D.FIG, f = o.face < 0 ? -1 : 1, w = o.width || 1, fl = o.hurt || 0, t = o.time || 0, seed = o.seed || 0;
    const dead = o.dead || 0;
    const mv = !!o.moving && !dead;
    const ph = o.phase || 0;
    const sw = mv ? Math.sin(ph) : 0;
    const L = o.look;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= Math.max(0, o.alpha);
    if (!o.noShadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(dead ? -18 * s * f * Math.min(1, dead) : 0, 0, (11 + 12 * Math.min(1, dead)) * s * w, 4 * s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.scale(f * s, s);
    if (dead) ctx.rotate(-Math.PI / 2 * Math.min(1, dead));

    const bob = mv ? -Math.abs(Math.cos(ph)) * 1.3 : Math.sin(t * 2.2 + seed) * 0.35;
    const hipY = -18 + bob * 0.4, shY = -32 + bob, hdY = -39.5 + bob * 1.1;
    const skin = col(L.skin, fl), shirt = col(L.shirt, fl), pants = col(L.pants, fl), boots = col(L.boots || '#2a2018', fl);
    const coat = L.coat && !o.ragged ? col(L.coat, fl) : null;
    const hairC = col(L.hair || '#2a1d14', fl);
    const stride = o.stride || 1;
    const la = sw * 0.55 * stride;
    const legW = 4.4 * Math.max(0.85, w * 0.92);

    // legs
    const backLeg = limb2(ctx, -1.2 * w, hipY, -la, 18, -la < 0 ? -la * 0.9 : 0, legW, U.shade(pants, -0.25));
    ctx.fillStyle = U.shade(boots, -0.2);
    ctx.beginPath(); ctx.ellipse(backLeg[0] + 1.6, backLeg[1] - 0.4, 3 * Math.min(1.4, w), 1.8, 0, 0, TAU); ctx.fill();
    const frontLeg = limb2(ctx, 1.2 * w, hipY, la, 18, la < 0 ? la * 0.9 : 0, legW, pants);
    ctx.fillStyle = boots;
    ctx.beginPath(); ctx.ellipse(frontLeg[0] + 1.6, frontLeg[1] - 0.4, 3 * Math.min(1.4, w), 1.8, 0, 0, TAU); ctx.fill();

    // upper body
    const lean = (o.lean || 0) + (o.ragged ? (o.atk || 0) * 0.18 : 0);
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    ctx.translate(0, -hipY);

    let aB = -sw * 0.55 * stride, aF = sw * 0.55 * stride, bB = 0.35, bF = 0.35;
    if (o.armsForward) {
      aB = 1.25 + Math.sin(t * 2.6 + seed) * 0.12; aF = 1.4 + Math.sin(t * 2.6 + seed + 1.3) * 0.12; bB = 0.15; bF = 0.1;
    }
    let bowDraw = 0;
    if (o.pose === 'bow') { aF = 1.5; bF = 0.05; aB = 1.1; bB = 1.25; bowDraw = o.atk > 0 ? 0 : 0.9; }
    else if (o.pose === 'work') { const k = Math.abs(Math.sin(t * 7 + seed)); aF = -0.4 + k * 1.6; bF = 0.6; }
    if (o.atk > 0 && o.pose !== 'bow') {
      const p = 1 - o.atk;
      if (p < 0.3) aF = U.lerp(aF, -2.3, p / 0.3);
      else aF = U.lerp(-2.3, 1.45, Math.min(1, (p - 0.3) / 0.45));
      bF = 0.25;
      if (o.armsForward) aB = aF - 0.25;
    }

    const tw = 5.6 * w, top = shY - 1.5, bot = hipY + 2;
    const role = o.role;

    // things carried on the back
    if (role === 'scavenger') {
      ctx.fillStyle = col('#5a4630', fl);
      rr(ctx, -tw - 4.5, shY + 0.5, 6, 11, 2); ctx.fill();
      ctx.fillStyle = col('#46361f', fl); ctx.fillRect(-tw - 4.5, shY + 4, 6, 1.4);
    } else if (role === 'hunter') {
      ctx.save(); ctx.translate(-tw - 1, shY + 6); ctx.rotate(-0.35);
      ctx.fillStyle = col('#6b4428', fl); rr(ctx, -2, -7, 4, 13, 1.5); ctx.fill();
      ctx.strokeStyle = col('#ddd2bd', fl); ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 1.1, -7); ctx.lineTo(i * 1.4, -10.5); } ctx.stroke();
      ctx.restore();
    }

    // back arm
    const coatOrShirt = coat || shirt;
    const ab = limb2(ctx, -1.6 * w, shY + 1.6, aB, 14 * (o.armLen || 1), bB, 3.7 * Math.max(0.85, w * 0.9), U.shade(coatOrShirt, -0.25));
    ctx.fillStyle = U.shade(skin, -0.15);
    ctx.beginPath(); ctx.arc(ab[0], ab[1], 1.9 * Math.min(1.4, w), 0, TAU); ctx.fill();

    // torso
    ctx.fillStyle = shirt;
    rr(ctx, -tw, top, tw * 2, bot - top, 3.2 * Math.min(1, w)); ctx.fill();
    ctx.fillStyle = U.shade(shirt, -0.22);
    ctx.fillRect(-tw + 0.6, top + 2, tw * 0.65, bot - top - 3);
    if (coat) {
      ctx.fillStyle = coat;
      rr(ctx, -tw - 0.6, top - 0.4, tw * 2 + 1.2, bot - top + 4.5, 3); ctx.fill();
      ctx.fillStyle = U.shade(coat, -0.22);
      ctx.fillRect(-tw, top + 2, tw * 0.7, bot - top + 1.5);
      ctx.fillStyle = shirt;
      ctx.fillRect(tw * 0.3, top + 1.5, tw * 0.45, bot - top + 1);
      ctx.fillStyle = U.shade(coat, 0.12);
      ctx.beginPath(); ctx.moveTo(tw * 0.1, top); ctx.lineTo(tw * 0.9, top); ctx.lineTo(tw * 0.35, top + 4); ctx.closePath(); ctx.fill();
    }
    if (o.brute) {
      ctx.strokeStyle = U.shade(shirt, -0.35); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(tw * 0.2, top + 5); ctx.lineTo(tw * 0.9, top + 5.5); ctx.moveTo(tw * 0.2, top + 8.5); ctx.lineTo(tw * 0.85, top + 9); ctx.stroke();
      ctx.strokeStyle = col('#3a2a1e', fl); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-tw, top + 1); ctx.lineTo(tw, bot - 2); ctx.stroke();
    }
    if (o.ragged) {
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.moveTo(-tw, bot - 1);
      for (let i = 0; i <= 6; i++) ctx.lineTo(-tw + i * (tw * 2 / 6), bot - 1 + (i % 2 ? 4 : 1.2));
      ctx.lineTo(tw, bot - 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = U.shade(shirt, -0.45); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(tw * 0.1, top + 4); ctx.lineTo(tw * 0.6, top + 8); ctx.moveTo(-tw * 0.4, top + 9); ctx.lineTo(0, top + 12); ctx.stroke();
      ctx.fillStyle = col('#4a1f1a', fl);
      ctx.beginPath(); ctx.ellipse(tw * 0.35, top + 6.5, 1.4, 1, 0, 0, TAU); ctx.fill();
    }
    if (o.cracks) {
      ctx.save();
      ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 0.9; ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(-tw * 0.3, top + 2); ctx.lineTo(tw * 0.1, top + 6); ctx.lineTo(-tw * 0.1, top + 10); ctx.lineTo(tw * 0.4, bot - 2);
      ctx.moveTo(tw * 0.6, top + 3); ctx.lineTo(tw * 0.3, top + 7);
      ctx.stroke();
      ctx.restore();
    }
    // belt
    if (!o.ragged) {
      ctx.fillStyle = col('#2a1f16', fl);
      ctx.fillRect(-tw, hipY - 1.2, tw * 2, 2.2);
      ctx.fillStyle = col('#b8954a', fl);
      ctx.fillRect(tw * 0.45, hipY - 1, 1.6, 1.8);
      if (role === 'builder') { ctx.fillStyle = col('#6b4a2b', fl); rr(ctx, -tw * 0.6, hipY - 0.5, 3.6, 4, 1); ctx.fill(); }
    }
    if (role === 'medic') {
      ctx.fillStyle = col('#c62f2f', fl);
      ctx.fillRect(tw * 0.15 - 1.8, shY + 4.6, 3.6, 1.2);
      ctx.fillRect(tw * 0.15 - 0.6, shY + 3.4, 1.2, 3.6);
    }

    // neck and head
    const hs = o.headScale || 1;
    const hr = 5.6 * hs, hx = 1.3, hy = hdY + (1 - hs) * 4;
    ctx.fillStyle = U.shade(skin, -0.12);
    ctx.fillRect(-1.6, shY - 3.6, 3.4, 3.8);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(hx, hy, hr, hr * (o.ragged ? 1.06 : 1), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = U.shade(skin, -0.16);
    ctx.beginPath(); ctx.ellipse(hx - hr * 0.3, hy + 0.6, hr * 0.24, hr * 0.32, 0, 0, TAU); ctx.fill(); // ear
    // nose
    ctx.fillStyle = U.shade(skin, -0.08);
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.9, hy - 0.3); ctx.lineTo(hx + hr * 1.18, hy + hr * 0.3); ctx.lineTo(hx + hr * 0.9, hy + hr * 0.4); ctx.closePath(); ctx.fill();
    if (L.beard) {
      ctx.fillStyle = hairC;
      ctx.beginPath(); ctx.arc(hx + 0.6, hy + 0.6, hr * 0.98, -0.1, Math.PI * 0.72); ctx.lineTo(hx + 0.2, hy + 1.6); ctx.closePath(); ctx.fill();
    }
    hair(ctx, L, hx, hy, hr, hairC, fl, !!o.ragged || !!o.cracks);
    if (o.antlers) antlers(ctx, hx, hy, hr);
    // eye & mouth
    const ex = hx + hr * 0.55, ey = hy - hr * 0.08;
    if (o.glowEyes) {
      ctx.fillStyle = o.eyeColor || '#ff6a2a';
      ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, TAU); ctx.fill();
      if (!dead) pushEye(ctx, ex, ey, (o.eyeR || 3.2) * s, o.eyeColor || '#ff5a1a');
      ctx.fillStyle = '#1a0c0a';
      ctx.beginPath(); ctx.ellipse(hx + hr * 0.62, hy + hr * 0.55, 1.3, 0.9 + (o.atk || 0) * 0.8, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#1d1410';
      ctx.beginPath(); ctx.arc(ex, ey, dead ? 0.5 : 0.85, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.shade(L.hair || '#2a1d14', -0.1); ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(ex - 1.2, ey - 1.6); ctx.lineTo(ex + 1.3, ey - 1.8); ctx.stroke();
    }

    // front arm + tool
    const af = limb2(ctx, 1.6 * w, shY + 1.6, aF, 14 * (o.armLen || 1), bF, 3.7 * Math.max(0.85, w * 0.9), coatOrShirt);
    if (role === 'medic') {
      ctx.fillStyle = col('#ffffff', fl);
      const mx = 1.6 * w + Math.sin(aF) * 3.5, my = shY + 1.6 + Math.cos(aF) * 3.5;
      ctx.beginPath(); ctx.arc(mx, my, 1.7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c62f2f'; ctx.fillRect(mx - 1, my - 0.3, 2, 0.6); ctx.fillRect(mx - 0.3, my - 1, 0.6, 2);
    }
    if (o.tool) tool(ctx, o.tool, af[0], af[1], af[2], fl, bowDraw);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(af[0], af[1], 1.95 * Math.min(1.4, w), 0, TAU); ctx.fill();

    ctx.restore(); // lean
    ctx.restore();
  };

  // ---------- wolf ----------
  D.wolf = function (ctx, o) {
    const s = (o.scale || 1) * D.FIG, f = o.face < 0 ? -1 : 1, fl = o.hurt || 0, t = o.time || 0;
    const dead = o.dead || 0;
    const g = o.moving && !dead ? Math.sin(o.phase || 0) : 0;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= Math.max(0, o.alpha);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 17 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
    ctx.scale(f * s, s);
    if (dead) { ctx.translate(0, -2); ctx.scale(1, 1 - 0.45 * Math.min(1, dead)); }
    const lunge = o.atk > 0 ? Math.sin((1 - o.atk) * Math.PI) * 5 : 0;
    ctx.translate(lunge, 0);
    const fur = col('#5d5852', fl), dark = col('#3b3733', fl), light = col('#8c857a', fl);
    const leg = (x, a, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + Math.sin(a) * 4, -5); ctx.lineTo(x + Math.sin(a) * 7, -0.8); ctx.stroke();
    };
    leg(9, -g * 0.7, dark); leg(-9, g * 0.7, dark);
    // tail
    ctx.strokeStyle = fur; ctx.lineWidth = 4.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, -15); ctx.quadraticCurveTo(-21, -15, -26, -9 + Math.sin(t * 6 + (o.seed || 0)) * 1.6); ctx.stroke();
    ctx.strokeStyle = light; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-23.5, -10.5 + Math.sin(t * 6 + (o.seed || 0)) * 1.2); ctx.lineTo(-26, -9 + Math.sin(t * 6 + (o.seed || 0)) * 1.6); ctx.stroke();
    // body
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(0, -13.5, 15, 6.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-1, -17, 12, 2.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(1, -9.8, 10, 2.2, 0, 0, TAU); ctx.fill();
    // ribs (gaunt)
    ctx.strokeStyle = U.shade('#5d5852', -0.3); ctx.lineWidth = 0.6;
    ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-1 + i * 3, -15); ctx.lineTo(0 + i * 3, -11); } ctx.stroke();
    // neck, chest
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(11, -16, 6.6, 6.2, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(13.5, -13.5, 3.2, 4.2, 0.2, 0, TAU); ctx.fill();
    // head
    const jaw = o.atk > 0 ? Math.sin((1 - o.atk) * Math.PI) * 2.4 : 0;
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(18, -20, 5.6, 4.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20.5, -22.6); ctx.lineTo(28.6, -20); ctx.lineTo(28.2, -18.4); ctx.lineTo(21, -17.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade('#5d5852', -0.15);
    ctx.beginPath(); ctx.moveTo(21, -17.6); ctx.lineTo(27.6, -18.2 + jaw); ctx.lineTo(21, -15.8 + jaw * 0.5); ctx.closePath(); ctx.fill();
    if (jaw > 0.5) { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(24, -18.4, 0.8, 1.2); ctx.fillRect(26, -18.2, 0.8, 1.1); }
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(28.6, -19.4, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(14.6, -23.4); ctx.lineTo(16.2, -29.4); ctx.lineTo(18.6, -23.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(17.6, -23.6); ctx.lineTo(19.6, -28.8); ctx.lineTo(21.2, -23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc04a';
    ctx.beginPath(); ctx.arc(21.4, -21.2, 0.95, 0, TAU); ctx.fill();
    if (o.glow && !dead) pushEye(ctx, 21.4, -21.2, 2.8 * s, '#ffb02a');
    leg(11, g * 0.7, fur); leg(-7, -g * 0.7, fur);
    ctx.restore();
  };

  // ---------- ash moth (seen from above, hovering) ----------
  D.moth = function (ctx, o) {
    const s = (o.scale || 1) * D.FIG, fl = o.hurt || 0, t = o.time || 0;
    const dead = o.dead || 0;
    const alt = (o.alt || 30) * (1 - Math.min(1, dead * 1.5));
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= Math.max(0, o.alpha);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.25 - alt * 0.003) + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, 11 * s, 3.4 * s, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -alt + Math.sin(t * 5 + (o.seed || 0)) * 2);
    ctx.rotate((o.ang || 0) + Math.PI / 2);
    ctx.scale(s, s);
    const flap = dead ? 0.6 : 0.25 + 0.75 * Math.abs(Math.sin(t * 16 + (o.seed || 0)));
    const c1 = col('#cbbd9b', fl), c2 = col('#8d7d5f', fl), c3 = col('#4e4030', fl);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * flap, 1);
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(10, -15, 19, -9); ctx.quadraticCurveTo(17, -1, 2, 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(1, 1); ctx.quadraticCurveTo(14, 2, 13, 9); ctx.quadraticCurveTo(6, 11, 0, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c3; ctx.beginPath(); ctx.arc(11, -7, 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = col('#e9b86a', fl); ctx.beginPath(); ctx.arc(11, -7, 1.1, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = c3;
    ctx.beginPath(); ctx.ellipse(0, 1, 2.4, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(0, -4, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = c3; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-0.6, -7); ctx.quadraticCurveTo(-3, -11, -5, -13.5); ctx.moveTo(0.6, -7); ctx.quadraticCurveTo(3, -11, 5, -13.5); ctx.stroke();
    ctx.restore();
  };

  // ---------- trees ----------
  D.pine = function (ctx, x, y, k, si) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(7, 1, 23, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a3322'; ctx.fillRect(-3, -16, 6, 17);
    ctx.fillStyle = '#35241a'; ctx.fillRect(0.6, -16, 2.4, 17);
    const dark = ['#1f3a27', '#1c3325', '#24452c', '#264a2d'][si], light = ['#2e5436', '#2a4a30', '#3a6a3f', '#3e6c3c'][si];
    for (let i = 0; i < 4; i++) {
      const by = -12 - i * 13, wd = 27 - i * 5.5, ht = 25;
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-wd, by); ctx.lineTo(0, by - ht); ctx.lineTo(0, by + 3); ctx.quadraticCurveTo(-wd * 0.5, by + 3, -wd, by); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.moveTo(wd, by); ctx.lineTo(0, by - ht); ctx.lineTo(0, by + 3); ctx.quadraticCurveTo(wd * 0.5, by + 3, wd, by); ctx.fill();
      if (si === 1) {
        ctx.fillStyle = '#eaf0f4';
        ctx.beginPath();
        ctx.moveTo(-wd * 0.62, by - ht * 0.38); ctx.lineTo(0, by - ht); ctx.lineTo(wd * 0.62, by - ht * 0.38);
        ctx.lineTo(wd * 0.25, by - ht * 0.48); ctx.lineTo(0, by - ht * 0.36); ctx.lineTo(-wd * 0.3, by - ht * 0.5);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  };

  D.oak = function (ctx, x, y, k, si, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(8, 1, 26, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4b3527';
    ctx.beginPath(); ctx.moveTo(-4.5, 0); ctx.lineTo(-3, -26); ctx.lineTo(3, -26); ctx.lineTo(4.5, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a281d'; ctx.fillRect(0.5, -26, 2.6, 26);
    ctx.strokeStyle = '#4b3527'; ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-11, -38); ctx.moveTo(0, -24); ctx.lineTo(10, -40); ctx.moveTo(0, -25); ctx.lineTo(1, -48); ctx.stroke();
    if (si === 1) {
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-11, -38); ctx.lineTo(-17, -46); ctx.moveTo(-11, -38); ctx.lineTo(-8, -50);
      ctx.moveTo(10, -40); ctx.lineTo(17, -47); ctx.moveTo(10, -40); ctx.lineTo(7, -52);
      ctx.moveTo(1, -48); ctx.lineTo(-3, -58); ctx.moveTo(1, -48); ctx.lineTo(6, -57);
      ctx.stroke();
      ctx.strokeStyle = '#eef3f6'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-1, -23); ctx.lineTo(-10.5, -38.5); ctx.moveTo(1, -25); ctx.lineTo(9.5, -40.5); ctx.stroke();
      ctx.restore();
      return;
    }
    const P = [['#8e3b22', '#b85a2a', '#d99036'], null, ['#4f8a38', '#62a046', '#80bd5c'], ['#355e2a', '#43722f', '#5a8a3c']][si];
    const cl = [[-12, -37, 13], [11, -39, 13], [0, -51, 14], [-17, -27, 9], [16, -28, 9], [-2, -34, 12]];
    for (const [cx, cy, r] of cl) {
      ctx.fillStyle = P[0]; ctx.beginPath(); ctx.arc(cx + 2, cy + 2, r, 0, TAU); ctx.fill();
      ctx.fillStyle = P[1]; ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, TAU); ctx.fill();
      ctx.fillStyle = P[2]; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.5, 0, TAU); ctx.fill();
    }
    if (si === 2) {
      const rnd = U.seeded(Math.floor(seed * 1000) + 7);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = rnd() < 0.5 ? '#f4e8f0' : '#f2b8cf';
        ctx.beginPath(); ctx.arc(-22 + rnd() * 44, -62 + rnd() * 42, 1.2, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  // ---------- camp structures ----------
  D.tent = function (ctx, x, y, c) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(4, 1, 31, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = U.shade(c, -0.3);
    ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(0, -28); ctx.lineTo(0, -46); ctx.lineTo(-25, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade(c, 0.1);
    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(0, -28); ctx.lineTo(0, -46); ctx.lineTo(25, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba(U.shade(c, -0.4), 0.5); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(12, -13); ctx.lineTo(12, -32); ctx.moveTo(-12, -13); ctx.lineTo(-12, -32); ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(0, -28); ctx.lineTo(25, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#16100b';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -17); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = U.shade(c, -0.12);
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(8, 0); ctx.lineTo(13, -1.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.shade(c, -0.45); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -46); ctx.moveTo(0, -28); ctx.lineTo(0, -32); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,180,140,0.75)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-33, 4); ctx.moveTo(25, 0); ctx.lineTo(33, 4); ctx.moveTo(-25, -18); ctx.lineTo(-32, -17); ctx.moveTo(25, -18); ctx.lineTo(32, -17); ctx.stroke();
    ctx.restore();
  };

  D.woodpile = function (ctx, x, y, amount) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(-4, 1, 32, 7, 0, 0, TAU); ctx.fill();
    // chopping block with axe
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(-36, -9, 12, 9);
    ctx.fillStyle = '#b98a55'; ctx.beginPath(); ctx.ellipse(-30, -9, 6, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-31, -10); ctx.lineTo(-38, -22); ctx.stroke();
    ctx.fillStyle = '#9aa0a6'; ctx.beginPath(); ctx.moveTo(-32, -11); ctx.lineTo(-27, -12); ctx.lineTo(-28, -8); ctx.closePath(); ctx.fill();
    const n = U.clamp(Math.ceil(amount / 3), 0, 15);
    const rows = [5, 4, 3, 2, 1];
    let i = 0;
    for (let r = 0; r < rows.length && i < n; r++) {
      const cnt = Math.min(rows[r], n - i);
      const ly = -4 - r * 6.4;
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(-rows[r] * 3.8, ly - 8.5, cnt * 7.6, 5.5);
      for (let c = 0; c < cnt; c++) {
        const lx = (c - (rows[r] - 1) / 2) * 7.6;
        ctx.fillStyle = '#5a3d24'; ctx.beginPath(); ctx.arc(lx, ly, 3.8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9955a'; ctx.beginPath(); ctx.arc(lx, ly, 2.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#9c6e3e'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(lx, ly, 1.5, 0, TAU); ctx.stroke();
        i++;
      }
    }
    ctx.restore();
  };

  D.crates = function (ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(4, 1, 22, 6, 0, 0, TAU); ctx.fill();
    const box = (bx, by, s) => {
      ctx.fillStyle = '#7d5f36'; ctx.fillRect(bx - 9 * s, by - 14 * s, 18 * s, 14 * s);
      ctx.fillStyle = '#9b7a48';
      ctx.beginPath(); ctx.moveTo(bx - 9 * s, by - 14 * s); ctx.lineTo(bx + 9 * s, by - 14 * s); ctx.lineTo(bx + 12 * s, by - 18 * s); ctx.lineTo(bx - 6 * s, by - 18 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5d4426';
      ctx.beginPath(); ctx.moveTo(bx + 9 * s, by); ctx.lineTo(bx + 12 * s, by - 4 * s); ctx.lineTo(bx + 12 * s, by - 18 * s); ctx.lineTo(bx + 9 * s, by - 14 * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx - 9 * s, by - 14 * s); ctx.lineTo(bx + 9 * s, by); ctx.moveTo(bx + 9 * s, by - 14 * s); ctx.lineTo(bx - 9 * s, by); ctx.stroke();
      ctx.strokeRect(bx - 9 * s, by - 14 * s, 18 * s, 14 * s);
    };
    box(-6, 0, 1);
    box(13, 2, 0.8);
    box(-3, -14, 0.75);
    ctx.restore();
  };

  D.barrel = function (ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(3, 1, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4528';
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-9, -9, -7, -18); ctx.lineTo(7, -18); ctx.quadraticCurveTo(9, -9, 7, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7d5532'; ctx.fillRect(-2, -18, 5, 18);
    ctx.fillStyle = '#3e3e40'; ctx.fillRect(-8.3, -15, 16.6, 1.8); ctx.fillRect(-8.3, -4.5, 16.6, 1.8);
    ctx.fillStyle = '#4a2f1c'; ctx.beginPath(); ctx.ellipse(0, -18, 7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2d4a5e'; ctx.beginPath(); ctx.ellipse(0, -18, 5.5, 1.8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  D.armory = function (ctx, x, y, lvl) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 1, 24, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-18, -26); ctx.moveTo(18, 0); ctx.lineTo(18, -26); ctx.moveTo(-20, -22); ctx.lineTo(20, -22); ctx.stroke();
    const n = Math.min(5, lvl + 1);
    for (let i = 0; i < n; i++) {
      const wx = -13 + i * 6.5;
      ctx.strokeStyle = '#7a5232'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(wx, -1); ctx.lineTo(wx + 2, -30); ctx.stroke();
      ctx.fillStyle = '#aab1b8';
      if (i % 2) { ctx.beginPath(); ctx.moveTo(wx + 2, -30); ctx.lineTo(wx + 0.5, -36); ctx.lineTo(wx + 3.5, -30); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(wx + 1.8, -27); ctx.lineTo(wx + 6.5, -29); ctx.lineTo(wx + 6, -24); ctx.lineTo(wx + 1.6, -24.5); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  };

  // one upright palisade log
  D.log = function (ctx, x, y, h, lvl, dmg, idx, broken) {
    const r = 4.6;
    if (broken) {
      ctx.fillStyle = '#3e2c1d';
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x - r, y - 6 - (idx % 3) * 2); ctx.lineTo(x - 1, y - 9 - (idx % 2) * 3); ctx.lineTo(x + 1.5, y - 5);
      ctx.lineTo(x + r, y - 8 + (idx % 3)); ctx.lineTo(x + r, y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 2, y - 1); ctx.lineTo(x - 8 + (idx % 4) * 4, y + 3); ctx.stroke();
      return;
    }
    ctx.save();
    const tilt = dmg > 0.45 ? (((idx * 37) % 7) - 3) * 0.025 * dmg : 0;
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 0.5, 6, 2, 0, 0, TAU); ctx.fill();
    const base = U.mix('#7a5434', '#3b2a1c', Math.min(0.75, dmg * 0.75));
    ctx.fillStyle = base; ctx.fillRect(-r, -h, r * 2, h);
    ctx.fillStyle = U.shade(base, 0.13); ctx.fillRect(-r, -h, r * 0.75, h);
    ctx.fillStyle = U.shade(base, -0.28); ctx.fillRect(r * 0.3, -h, r * 0.7, h);
    ctx.fillStyle = lvl >= 4 ? '#8d939a' : U.shade(base, 0.25);
    ctx.beginPath(); ctx.moveTo(-r, -h); ctx.lineTo(0, -h - 7); ctx.lineTo(r, -h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba('#2a1c12', 0.5); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-1.5, -h + 4 + (idx % 5) * 2); ctx.lineTo(-1, -h + 12 + (idx % 5) * 2); ctx.moveTo(1.5, -8 - (idx % 3) * 3); ctx.lineTo(1.2, -3 - (idx % 3) * 3); ctx.stroke();
    if (lvl >= 3) {
      ctx.fillStyle = '#5d6166';
      ctx.fillRect(-r, -h * 0.8, r * 2, 2); ctx.fillRect(-r, -h * 0.32, r * 2, 2);
    }
    if (lvl >= 5) { ctx.fillStyle = '#77736d'; ctx.fillRect(-r - 0.8, -6, r * 2 + 1.6, 6); ctx.fillStyle = '#8c8882'; ctx.fillRect(-r - 0.8, -6, r * 2 + 1.6, 1.4); }
    if (dmg > 0.6) {
      ctx.strokeStyle = '#1e140d'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-2, -h * 0.6); ctx.lineTo(1, -h * 0.5); ctx.lineTo(-1, -h * 0.38); ctx.stroke();
    }
    ctx.restore();
  };

  D.tower = function (ctx, x, y, lvl, t, occupant) {
    const Hh = 48;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(6, 1, 26, 8, 0, 0, TAU); ctx.fill();
    const post = '#5a3d24', dark = '#3f2a18';
    ctx.lineCap = 'round';
    ctx.strokeStyle = dark; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(-12, -Hh - 9); ctx.moveTo(12, -9); ctx.lineTo(12, -Hh - 9); ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(15, -Hh + 6); ctx.moveTo(15, -4); ctx.lineTo(-15, -Hh + 6); ctx.stroke();
    ctx.strokeStyle = post; ctx.lineWidth = 3.8;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-15, -Hh); ctx.moveTo(15, 0); ctx.lineTo(15, -Hh); ctx.stroke();
    ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -Hh); ctx.moveTo(4, 0); ctx.lineTo(4, -Hh);
    for (let i = 6; i < Hh; i += 6) { ctx.moveTo(-4, -i); ctx.lineTo(4, -i); }
    ctx.stroke();
    // platform
    ctx.fillStyle = '#7a5a38';
    ctx.beginPath(); ctx.moveTo(-18, -Hh); ctx.lineTo(18, -Hh); ctx.lineTo(14, -Hh - 11); ctx.lineTo(-14, -Hh - 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5e4429'; ctx.lineWidth = 0.7;
    ctx.beginPath(); for (let i = -12; i <= 12; i += 6) { ctx.moveTo(i * 1.2, -Hh); ctx.lineTo(i, -Hh - 11); } ctx.stroke();
    // back rail
    ctx.strokeStyle = post; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-14, -Hh - 11); ctx.lineTo(-14, -Hh - 22); ctx.moveTo(14, -Hh - 11); ctx.lineTo(14, -Hh - 22); ctx.moveTo(-14, -Hh - 21); ctx.lineTo(14, -Hh - 21); ctx.stroke();
    if (occupant) occupant(0, -Hh - 5);
    ctx.fillStyle = '#5e4429'; ctx.fillRect(-18, -Hh, 36, 4);
    // front rail
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -Hh); ctx.lineTo(-18, -Hh - 12); ctx.moveTo(18, -Hh); ctx.lineTo(18, -Hh - 12);
    ctx.moveTo(-18, -Hh - 11); ctx.lineTo(18, -Hh - 11); ctx.moveTo(-18, -Hh - 6); ctx.lineTo(18, -Hh - 6); ctx.stroke();
    if (lvl >= 2) {
      ctx.strokeStyle = post; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-17, -Hh - 11); ctx.lineTo(-16, -Hh - 34); ctx.moveTo(17, -Hh - 11); ctx.lineTo(16, -Hh - 34); ctx.stroke();
      ctx.fillStyle = '#8a7240';
      ctx.beginPath(); ctx.moveTo(-23, -Hh - 31); ctx.lineTo(23, -Hh - 31); ctx.lineTo(0, -Hh - 50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6e5a30';
      ctx.beginPath(); ctx.moveTo(-23, -Hh - 31); ctx.lineTo(0, -Hh - 50); ctx.lineTo(-4, -Hh - 31); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5a4a28'; ctx.lineWidth = 0.6;
      ctx.beginPath(); for (let i = -18; i <= 18; i += 4) { ctx.moveTo(i, -Hh - 31); ctx.lineTo(i * 0.4, -Hh - 44); } ctx.stroke();
    }
    if (lvl >= 4) {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -Hh - 50); ctx.lineTo(0, -Hh - 62); ctx.stroke();
      ctx.fillStyle = '#9a2a22';
      ctx.beginPath(); ctx.moveTo(0, -Hh - 62); ctx.lineTo(10 + Math.sin(t * 4) * 1.5, -Hh - 59); ctx.lineTo(0, -Hh - 56); ctx.closePath(); ctx.fill();
    }
    // torch
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(18, -Hh - 12); ctx.lineTo(19, -Hh - 17); ctx.stroke();
    const fh = 5 + Math.sin(t * 13 + x) * 1.2;
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath(); ctx.moveTo(16.8, -Hh - 17); ctx.quadraticCurveTo(19, -Hh - 17 - fh * 1.3, 21.2, -Hh - 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.moveTo(18, -Hh - 17); ctx.quadraticCurveTo(19, -Hh - 17 - fh * 0.7, 20, -Hh - 17); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  D.TOWER_H = 48;

  D.trap = function (ctx, x, y, lvl, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(20,14,10,0.75)';
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 1, 12, 4.5, 0, 0, TAU); ctx.fill();
    const n = 6 + lvl;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + 0.3;
      const bx = Math.cos(a) * 11, by = Math.sin(a) * 4.5;
      const tx = Math.cos(a) * 15 + Math.cos(ang) * 3, ty = Math.sin(a) * 6 - 10;
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = lvl >= 3 ? '#a9b0b6' : '#c9a070'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bx + (tx - bx) * 0.75, by + (ty - by) * 0.75); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.restore();
  };

  D.fire = function (ctx, x, y, frac, t, lvl) {
    const k = 1 + 0.08 * (lvl - 1);
    ctx.save();
    ctx.translate(x, y);
    const stones = 12;
    const stone = (i) => {
      const a = i / stones * TAU;
      const sx = Math.cos(a) * 27 * k, sy = Math.sin(a) * 12 * k;
      ctx.fillStyle = ['#6d6a66', '#5d5a56', '#7a7672'][i % 3];
      ctx.beginPath(); ctx.ellipse(sx, sy - 2, 5.4 * k, 3.8 * k, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.ellipse(sx - 1, sy - 3.5, 2.6 * k, 1.4 * k, 0, 0, TAU); ctx.fill();
    };
    for (let i = 0; i < stones; i++) if (Math.sin(i / stones * TAU) < 0) stone(i);
    ctx.fillStyle = '#231d19';
    ctx.beginPath(); ctx.ellipse(0, -1, 21 * k, 8.5 * k, 0, 0, TAU); ctx.fill();
    if (frac > 0) {
      ctx.fillStyle = 'rgba(255,110,30,' + (0.35 + 0.35 * frac) + ')';
      ctx.beginPath(); ctx.ellipse(0, -1, 15 * k, 6 * k, 0, 0, TAU); ctx.fill();
    }
    const logc = ['#4a3020', '#55382a', '#3f2a1c'];
    [[-0.45, 0], [0.45, 0], [0.05, -2]].forEach(([a, oy], i) => {
      ctx.save(); ctx.translate(0, -3 + oy); ctx.rotate(a);
      ctx.fillStyle = logc[i]; rr(ctx, -16 * k, -3, 32 * k, 6, 3); ctx.fill();
      ctx.fillStyle = '#1d1410'; ctx.fillRect(-4, -3, 8, 6);
      ctx.restore();
    });
    if (frac > 0.005) {
      const H = (14 + 36 * Math.min(1, frac)) * k;
      const tongues = 5;
      const layers = [['#ff5a12', 1, 1], ['#ffa22e', 0.72, 0.75], ['#ffe7a0', 0.42, 0.45]];
      for (const [c, ws, hs] of layers) {
        ctx.fillStyle = c;
        for (let i = 0; i < tongues; i++) {
          const off = (i - 2) * 5.6 * k;
          const hh = H * (0.55 + 0.45 * (1 - Math.abs(i - 2) / 2.5)) * (0.78 + 0.4 * U.noise1(t * 7 + i * 3.1)) * hs;
          const ww = (6 + 3 * Math.min(1, frac)) * k * ws;
          const sway = (U.noise1(t * 5 + i * 7.7) - 0.5) * 9;
          ctx.beginPath();
          ctx.moveTo(off - ww, -3);
          ctx.quadraticCurveTo(off - ww * 0.9, -3 - hh * 0.55, off + sway, -3 - hh);
          ctx.quadraticCurveTo(off + ww * 0.9, -3 - hh * 0.55, off + ww, -3);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    for (let i = 0; i < stones; i++) if (Math.sin(i / stones * TAU) >= 0) stone(i);
    ctx.restore();
  };

  // head-and-shoulders portrait for the UI
  D.portrait = function (cv, s, opts) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.35, 2, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, '#3a2a1c'); g.addColorStop(1, '#130e0a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const k = W / 48;
    ctx.scale(k, k);
    const saveEyes = D.eyes.length;
    const R = D.R, FIG = D.FIG; D.R = k; D.FIG = 1;
    D.human(ctx, { x: 22, y: 80, scale: 1.85, face: 1, look: s.look, role: s.role, tool: null, time: 0, seed: 0, noShadow: true, hurt: 0, dead: 0 });
    D.R = R; D.FIG = FIG;
    D.eyes.length = saveEyes;
    if (opts && opts.dead) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(10,6,4,0.55)'; ctx.fillRect(0, 0, W, H);
    }
  };
})(window.LC);
