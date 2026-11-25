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
      case 'hoe':
        ctx.strokeStyle = wood; ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 15); ctx.stroke();
        ctx.fillStyle = steel;
        ctx.beginPath(); ctx.moveTo(-0.5, 13.5); ctx.lineTo(6.5, 14.5); ctx.lineTo(6.2, 17); ctx.lineTo(-0.5, 15.6); ctx.closePath(); ctx.fill();
        break;
      case 'pickaxe':
        ctx.strokeStyle = wood; ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 14); ctx.stroke();
        ctx.strokeStyle = steel; ctx.lineWidth = 2.1;
        ctx.beginPath(); ctx.moveTo(-6.5, 11); ctx.quadraticCurveTo(0, 15.5, 6.5, 11); ctx.stroke();
        ctx.fillStyle = col('#d8dde2', fl); ctx.fillRect(-7.2, 10.2, 1.4, 1.4); ctx.fillRect(5.8, 10.2, 1.4, 1.4);
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
    else if (o.pose === 'hoe') { const k = Math.abs(Math.sin(t * 3.2 + seed)); aF = 0.5 + k * 0.9; bF = 0.2; aB = aF - 0.35; bB = 0.3; }
    else if (o.pose === 'carry') { aF = -2.55; bF = -0.5; aB = -2.4; bB = -0.6; }
    else if (o.pose === 'chop' || o.pose === 'mine') { aF = 1.25; bF = 0.15; aB = 1.05; bB = 0.3; }
    if (o.atk > 0 && o.pose !== 'bow' && o.pose !== 'carry') {
      const p = 1 - o.atk;
      const end = o.pose === 'chop' ? 1.75 : o.pose === 'mine' ? 1.2 : 1.45;
      if (p < 0.3) aF = U.lerp(aF, -2.3, p / 0.3);
      else aF = U.lerp(-2.3, end, Math.min(1, (p - 0.3) / 0.45));
      bF = 0.25;
      if (o.armsForward || o.pose === 'chop' || o.pose === 'mine') { aB = aF - 0.25; bB = 0.25; }
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
    if (o.tool && o.pose !== 'carry') tool(ctx, o.tool, af[0], af[1], af[2], fl, bowDraw);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(af[0], af[1], 1.95 * Math.min(1.4, w), 0, TAU); ctx.fill();
    if (o.pose === 'carry') D.load(ctx, o.carryKind, 0, shY - 7, fl);

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
    if (lvl >= 3) {
      const sh = lvl >= 5 ? 26 : 14;
      ctx.fillStyle = '#6f6b66'; ctx.fillRect(-18, -sh, 36, sh);
      ctx.fillStyle = '#86817b'; ctx.fillRect(-18, -sh, 36, 2.5);
      ctx.strokeStyle = 'rgba(40,36,32,0.6)'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let yy = -sh + 6; yy < 0; yy += 6) { ctx.moveTo(-18, yy); ctx.lineTo(18, yy); }
      for (let xx = -12; xx < 18; xx += 9) { ctx.moveTo(xx, -sh + 2.5); ctx.lineTo(xx, -sh + 6); ctx.moveTo(xx + 4, -sh + 6); ctx.lineTo(xx + 4, -sh + 12); }
      ctx.stroke();
    }
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
    if (lvl >= 5) {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-18, -Hh - 12); ctx.lineTo(-19, -Hh - 17); ctx.stroke();
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath(); ctx.moveTo(-21.2, -Hh - 17); ctx.quadraticCurveTo(-19, -Hh - 17 - fh * 1.3, -16.8, -Hh - 17); ctx.closePath(); ctx.fill();
    }
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

  // ================= town buildings =================
  const shadow = (ctx, w, h, ox) => { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ox || 4, 2, w, h, 0, 0, TAU); ctx.fill(); };
  const roofCol = (lvl) => (lvl >= 5 ? '#8e3b2e' : lvl >= 3 ? '#6b4a3a' : '#a08850');
  const lines = (ctx, color, lw, segs) => { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); for (const s of segs) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); } ctx.stroke(); };

  function logWall(ctx, x, y, w, h, lvl) {
    ctx.fillStyle = '#7a5434'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(40,26,14,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let yy = y + 4.5; yy < y + h; yy += 4.5) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); } ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,170,0.08)'; ctx.fillRect(x, y, w, 2);
    if (lvl >= 4) { ctx.fillStyle = '#d6cbb4'; ctx.fillRect(x, y, w, h * 0.45); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6; ctx.strokeRect(x + 0.8, y + 0.8, w - 1.6, h * 0.45); ctx.beginPath(); ctx.moveTo(x + w / 3, y); ctx.lineTo(x + w / 3, y + h * 0.45); ctx.moveTo(x + 2 * w / 3, y); ctx.lineTo(x + 2 * w / 3, y + h * 0.45); ctx.stroke(); }
  }
  function foundation(ctx, w, lvl) {
    if (lvl < 3) return;
    ctx.fillStyle = '#6f6b66'; ctx.fillRect(-w / 2 - 2, -6, w + 4, 6);
    ctx.fillStyle = '#86817b'; ctx.fillRect(-w / 2 - 2, -6, w + 4, 1.5);
    ctx.strokeStyle = 'rgba(40,36,32,0.5)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); for (let xx = -w / 2 + 4; xx < w / 2; xx += 8) { ctx.moveTo(xx, -6); ctx.lineTo(xx, 0); } ctx.stroke();
  }
  function gableRoof(ctx, w, top, rh, color) {
    ctx.fillStyle = U.shade(color, -0.25);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 6, top + 3); ctx.lineTo(w / 2 + 6, top + 3); ctx.lineTo(w / 2 - 8, top - rh); ctx.lineTo(-w / 2 + 8, top - rh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 6, top + 3); ctx.lineTo(w / 2 + 6, top + 3); ctx.lineTo(w / 2 - 8, top - rh * 0.55); ctx.lineTo(-w / 2 + 8, top - rh * 0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba(U.shade(color, -0.45), 0.55); ctx.lineWidth = 0.7;
    ctx.beginPath(); for (let xx = -w / 2; xx <= w / 2; xx += 6) { ctx.moveTo(xx * 1.08, top + 3); ctx.lineTo(xx * 0.86, top - rh); } ctx.stroke();
    ctx.strokeStyle = U.shade(color, -0.5); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 8, top - rh); ctx.lineTo(w / 2 - 8, top - rh); ctx.stroke();
  }
  function windowLit(ctx, x, y, s, lit) {
    ctx.fillStyle = '#3a2614'; ctx.fillRect(x - s / 2 - 1.2, y - s / 2 - 1.2, s + 2.4, s + 2.4);
    ctx.fillStyle = lit ? '#ffcf70' : '#2a2a30'; ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y - s / 2); ctx.lineTo(x, y + s / 2); ctx.moveTo(x - s / 2, y); ctx.lineTo(x + s / 2, y); ctx.stroke();
  }
  function door(ctx, x, w, h) {
    ctx.fillStyle = '#3a2614'; ctx.fillRect(x - w / 2 - 1.5, -h - 1.5, w + 3, h + 1.5);
    ctx.fillStyle = '#5d3d22'; ctx.fillRect(x - w / 2, -h, w, h);
    ctx.strokeStyle = 'rgba(30,18,8,0.6)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, 0); ctx.stroke();
    ctx.fillStyle = '#c9a050'; ctx.beginPath(); ctx.arc(x + w * 0.3, -h * 0.5, 0.9, 0, TAU); ctx.fill();
  }
  function smoke(ctx, x, y, t, seed) {
    for (let i = 0; i < 3; i++) {
      const p = ((t * 0.35 + i / 3 + seed) % 1);
      ctx.fillStyle = 'rgba(180,175,170,' + (0.35 * (1 - p)) + ')';
      ctx.beginPath(); ctx.arc(x + Math.sin(t + i * 2 + seed * 9) * 4 + p * 6, y - p * 26, 2.5 + p * 5, 0, TAU); ctx.fill();
    }
  }

  D.house = function (ctx, x, y, lvl, t, lit, seed) {
    const w = 56 + lvl * 6, h = 24 + lvl * 2;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.62, 10);
    foundation(ctx, w, lvl);
    const base = lvl >= 3 ? -6 : 0;
    logWall(ctx, -w / 2, base - h, w, h, lvl);
    if (lvl >= 5) { ctx.fillStyle = '#7f7a73'; ctx.fillRect(-w / 2, base - h * 0.4, w, h * 0.4); ctx.strokeStyle = 'rgba(40,36,32,0.5)'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let xx = -w / 2 + 5; xx < w / 2; xx += 9) { ctx.moveTo(xx, base - h * 0.4); ctx.lineTo(xx, base); } ctx.stroke(); }
    ctx.save(); ctx.translate(0, base); door(ctx, -w * 0.12, 11, 17); ctx.restore();
    windowLit(ctx, w * 0.24, base - h * 0.55, 8, lit);
    if (lvl >= 2) windowLit(ctx, -w * 0.36, base - h * 0.55, 7, lit);
    if (lvl >= 2) {
      ctx.fillStyle = '#6f6b66'; ctx.fillRect(w * 0.22, base - h - 26, 8, 18);
      ctx.fillStyle = '#5a5650'; ctx.fillRect(w * 0.22 - 1, base - h - 27, 10, 3);
      smoke(ctx, w * 0.22 + 4, base - h - 28, t, seed || 0);
    }
    gableRoof(ctx, w, base - h, 18 + lvl * 2, roofCol(lvl));
    if (lvl >= 4) { ctx.fillStyle = '#6b8a3a'; ctx.fillRect(w * 0.18, base - h * 0.55 + 5, 12, 3); }
    ctx.restore();
  };

  D.farm = function (ctx, x, y, lvl, si, t) {
    const w = 72 + lvl * 8, d = 34 + lvl * 2;
    ctx.save(); ctx.translate(x, y);
    // soil
    ctx.fillStyle = si === 1 ? '#c9cfd4' : '#5d4129';
    ctx.beginPath(); ctx.moveTo(-w / 2, 12); ctx.lineTo(w / 2, 12); ctx.lineTo(w / 2 - 8, 12 - d); ctx.lineTo(-w / 2 + 8, 12 - d); ctx.closePath(); ctx.fill();
    const rows = 3 + lvl;
    for (let r = 0; r < rows; r++) {
      const ry = 12 - d + (r + 0.6) * d / rows;
      const inset = 8 * (1 - (ry - (12 - d)) / d);
      ctx.strokeStyle = si === 1 ? '#aab3ba' : '#45301d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w / 2 + inset + 3, ry); ctx.lineTo(w / 2 - inset - 3, ry); ctx.stroke();
      if (si === 1) continue;
      for (let cx = -w / 2 + inset + 6; cx < w / 2 - inset - 4; cx += 7) {
        const sway = Math.sin(t * 2 + cx * 0.3 + r) * 0.8;
        if (si === 2) { ctx.fillStyle = '#6fb04a'; ctx.beginPath(); ctx.ellipse(cx, ry - 2, 1.6, 2.4, 0, 0, TAU); ctx.fill(); }
        else {
          const tall = si === 3 ? 9 : 7;
          ctx.strokeStyle = si === 0 ? '#c9a43a' : '#4f8a2e'; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx + sway, ry - tall); ctx.stroke();
          ctx.fillStyle = si === 0 ? '#e0bf55' : '#e8d65a';
          ctx.beginPath(); ctx.ellipse(cx + sway, ry - tall, 1.3, 2.4, 0, 0, TAU); ctx.fill();
        }
      }
    }
    // fence
    ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let fx = -w / 2; fx <= w / 2 + 0.1; fx += w / 8) { ctx.moveTo(fx, 14); ctx.lineTo(fx, 7); }
    ctx.moveTo(-w / 2, 9.5); ctx.lineTo(w / 2, 9.5);
    ctx.moveTo(-w / 2, 14); ctx.lineTo(-w / 2 + 8, 12 - d); ctx.moveTo(w / 2, 14); ctx.lineTo(w / 2 - 8, 12 - d);
    ctx.stroke();
    if (lvl >= 2) { // tool shed
      ctx.save(); ctx.translate(-w / 2 + 2, 12 - d + 2);
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-12, -16, 18, 16);
      ctx.fillStyle = roofCol(lvl); ctx.beginPath(); ctx.moveTo(-14, -15); ctx.lineTo(8, -15); ctx.lineTo(4, -23); ctx.lineTo(-10, -23); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2614'; ctx.fillRect(-6, -9, 6, 9);
      ctx.restore();
    }
    if (lvl >= 3 && si !== 1) { // scarecrow
      ctx.save(); ctx.translate(w * 0.18, 12 - d * 0.55);
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -16); ctx.moveTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
      ctx.fillStyle = '#8a3b2e'; ctx.fillRect(-4, -13, 8, 9);
      ctx.fillStyle = '#d9b77a'; ctx.beginPath(); ctx.arc(0, -17, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.moveTo(-5, -18.5); ctx.lineTo(5, -18.5); ctx.lineTo(0, -23); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (lvl >= 4) { D.barrel(ctx, w / 2 - 4, 4); }
    if (lvl >= 5) { // well
      ctx.save(); ctx.translate(w / 2 - 22, 12 - d + 6);
      ctx.fillStyle = '#77736d'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, TAU); ctx.fill(); ctx.fillRect(-7, -6, 14, 6);
      ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-6, -16); ctx.moveTo(6, -6); ctx.lineTo(6, -16); ctx.moveTo(-8, -16); ctx.lineTo(8, -16); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  D.mill = function (ctx, x, y, lvl, wood, t) {
    const w = 64 + lvl * 6;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.6, 9);
    foundation(ctx, w, lvl);
    const base = lvl >= 3 ? -6 : 0, H = 30 + lvl * 2;
    // back wall
    ctx.fillStyle = '#5d3f25'; ctx.fillRect(-w / 2 + 3, base - H, w - 6, H * 0.75);
    lines(ctx, 'rgba(30,18,8,0.4)', 0.7, [[-w / 2 + 3, base - H * 0.5, w / 2 - 3, base - H * 0.5]]);
    // log stack inside
    const n = U.clamp(Math.ceil(wood / 8), 1, 12);
    let k = 0;
    for (let r = 0; r < 3 && k < n; r++) for (let c = 0; c < 5 - r && k < n; c++, k++) {
      const lx = -w / 2 + 12 + c * 7.6 + r * 3.8, ly = base - 5 - r * 6.4;
      ctx.fillStyle = '#5a3d24'; ctx.beginPath(); ctx.arc(lx, ly, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9955a'; ctx.beginPath(); ctx.arc(lx, ly, 2.8, 0, TAU); ctx.fill();
    }
    // sawhorse with a log
    ctx.save(); ctx.translate(w * 0.2, base);
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.moveTo(4, 0); ctx.lineTo(8, -9); ctx.lineTo(12, 0); ctx.stroke();
    ctx.fillStyle = '#7a5434'; D.rr(ctx, -12, -13, 26, 5, 2.5); ctx.fill();
    ctx.strokeStyle = '#a9b0b6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -20); ctx.lineTo(4 + Math.sin(t * 6) * 2, -9); ctx.stroke();
    ctx.restore();
    // posts & roof
    lines(ctx, '#5a3d24', 3, [[-w / 2, base, -w / 2, base - H], [w / 2, base, w / 2, base - H]]);
    ctx.fillStyle = roofCol(lvl);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 6, base - H + 2); ctx.lineTo(w / 2 + 6, base - H + 2); ctx.lineTo(w / 2, base - H - 14); ctx.lineTo(-w / 2, base - H - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.rgba(U.shade(roofCol(lvl), -0.45), 0.6); ctx.lineWidth = 0.7;
    ctx.beginPath(); for (let xx = -w / 2; xx <= w / 2; xx += 6) { ctx.moveTo(xx, base - H + 2); ctx.lineTo(xx * 0.95, base - H - 14); } ctx.stroke();
    // sign
    ctx.fillStyle = '#7a5434'; ctx.fillRect(-12, base - H - 2, 24, 8);
    lines(ctx, '#d8c4a2', 1.2, [[-6, base - H + 4, 6, base - H - 1], [-6, base - H - 1, 6, base - H + 4]]);
    if (lvl >= 4) { ctx.fillStyle = '#5a3d24'; ctx.fillRect(-w / 2 - 14, base - 14, 12, 14); ctx.fillStyle = roofCol(lvl); ctx.fillRect(-w / 2 - 16, base - 18, 16, 4); }
    ctx.restore();
  };

  D.quarry = function (ctx, x, y, lvl, stone, t) {
    const w = 64 + lvl * 6;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.6, 9);
    // gravel yard
    ctx.fillStyle = '#7c776f'; ctx.beginPath(); ctx.ellipse(0, -2, w / 2, 12, 0, 0, TAU); ctx.fill();
    // stacked stone blocks
    const n = U.clamp(Math.ceil(stone / 8), 1, 12);
    let k = 0;
    for (let r = 0; r < 3 && k < n; r++) for (let c = 0; c < 5 - r && k < n; c++, k++) {
      const bx = -w / 2 + 8 + c * 10 + r * 5, by = -4 - r * 7;
      ctx.fillStyle = ['#9a958d', '#8a857e', '#a7a39b'][(c + r) % 3]; ctx.fillRect(bx, by - 7, 9, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, by - 7, 9, 1.4);
    }
    // hut
    ctx.save(); ctx.translate(w * 0.2, -2);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-12, -20, 24, 20);
    ctx.fillStyle = '#3a2614'; ctx.fillRect(-4, -12, 8, 12);
    ctx.fillStyle = roofCol(lvl); ctx.beginPath(); ctx.moveTo(-15, -19); ctx.lineTo(15, -19); ctx.lineTo(10, -29); ctx.lineTo(-10, -29); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (lvl >= 2) { // crane / pulley
      ctx.save(); ctx.translate(-w * 0.1, -6);
      lines(ctx, '#5a3d24', 2.2, [[-10, 0, 0, -38], [10, 0, 0, -38], [0, -38, 18, -32]]);
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(16, -32); ctx.lineTo(16, -16 + Math.sin(t * 1.5) * 3); ctx.stroke();
      ctx.fillStyle = '#8a857e'; ctx.fillRect(12, -16 + Math.sin(t * 1.5) * 3, 8, 6);
      ctx.restore();
    }
    if (lvl >= 3) { // ore cart
      ctx.save(); ctx.translate(-w * 0.35, 6);
      ctx.fillStyle = '#5a5650'; ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(7, -2); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a7a39b'; ctx.beginPath(); ctx.arc(-3, -11, 3, 0, TAU); ctx.arc(3, -11.5, 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(-5, -1, 2, 0, TAU); ctx.arc(5, -1, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (lvl >= 5) { ctx.fillStyle = '#9a2a22'; ctx.fillRect(w * 0.2 + 10, -48, 8, 5); lines(ctx, '#3a2a1a', 1, [[w * 0.2 + 10, -29, w * 0.2 + 10, -48]]); }
    ctx.restore();
  };

  D.storehouse = function (ctx, x, y, lvl, t) {
    const w = 66 + lvl * 7, h = 30 + lvl * 3;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.62, 10);
    foundation(ctx, w, lvl);
    const base = lvl >= 3 ? -6 : 0;
    ctx.fillStyle = '#8a3b2e'; ctx.fillRect(-w / 2, base - h, w, h);
    ctx.strokeStyle = 'rgba(40,14,8,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let xx = -w / 2 + 5; xx < w / 2; xx += 5) { ctx.moveTo(xx, base - h); ctx.lineTo(xx, base); } ctx.stroke();
    // big double door
    ctx.fillStyle = '#5a2a20'; ctx.fillRect(-13, base - h * 0.72, 26, h * 0.72);
    lines(ctx, '#e8dcc4', 1.4, [[-13, base - h * 0.72, 13, base], [13, base - h * 0.72, -13, base], [0, base - h * 0.72, 0, base]]);
    ctx.strokeStyle = '#e8dcc4'; ctx.lineWidth = 1.4; ctx.strokeRect(-13, base - h * 0.72, 26, h * 0.72);
    // roof
    gableRoof(ctx, w, base - h, 20 + lvl * 2, lvl >= 3 ? '#4d4d55' : '#6b4a3a');
    // hay door
    ctx.fillStyle = '#5a2a20'; ctx.fillRect(-6, base - h - 12, 12, 9);
    // crates and barrels around
    D.crates(ctx, -w / 2 - 6, 6);
    if (lvl >= 2) D.barrel(ctx, w / 2 + 6, 6);
    if (lvl >= 4) D.barrel(ctx, w / 2 - 6, 10);
    ctx.restore();
  };

  D.workshop = function (ctx, x, y, lvl, t, working) {
    const w = 62 + lvl * 6, H = 28 + lvl * 2;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.6, 9);
    foundation(ctx, w, lvl);
    const base = lvl >= 3 ? -6 : 0;
    ctx.fillStyle = '#5d3f25'; ctx.fillRect(-w / 2 + 3, base - H, w - 6, H);
    // tools on the wall
    lines(ctx, '#a9b0b6', 1.2, [[-w / 2 + 12, base - H + 6, -w / 2 + 12, base - H + 16], [-w / 2 + 18, base - H + 6, -w / 2 + 20, base - H + 15]]);
    ctx.fillStyle = '#a9b0b6'; ctx.fillRect(-w / 2 + 9, base - H + 5, 6, 3);
    // workbench with arrows
    ctx.fillStyle = '#7a5434'; ctx.fillRect(-w / 2 + 8, base - 12, w * 0.5, 4);
    lines(ctx, '#5a3d24', 1.6, [[-w / 2 + 10, base - 8, -w / 2 + 10, base], [-w / 2 + 6 + w * 0.5, base - 8, -w / 2 + 6 + w * 0.5, base]]);
    ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = 0.8; ctx.beginPath();
    for (let i = 0; i < 5; i++) { ctx.moveTo(-w / 2 + 12 + i * 3, base - 12); ctx.lineTo(-w / 2 + 14 + i * 3, base - 22); }
    ctx.stroke();
    // forge
    if (lvl >= 3) {
      ctx.fillStyle = '#6f6b66'; ctx.fillRect(w * 0.12, base - 16, 18, 16);
      ctx.fillStyle = working ? '#ff8a2a' : '#5a2a1a'; ctx.fillRect(w * 0.12 + 4, base - 12, 10, 5);
      ctx.fillStyle = '#5a5650'; ctx.fillRect(w * 0.12 + 5, base - H - 20, 8, H + 4);
      if (working) smoke(ctx, w * 0.12 + 9, base - H - 22, t, 0.3);
    }
    // anvil
    ctx.fillStyle = '#3b3f44'; ctx.beginPath(); ctx.moveTo(w * 0.32, base - 8); ctx.lineTo(w * 0.32 + 14, base - 8); ctx.lineTo(w * 0.32 + 10, base - 4); ctx.lineTo(w * 0.32 + 4, base - 4); ctx.closePath(); ctx.fill(); ctx.fillRect(w * 0.32 + 5, base - 4, 4, 4);
    lines(ctx, '#5a3d24', 3, [[-w / 2, base, -w / 2, base - H - 2], [w / 2, base, w / 2, base - H - 2]]);
    ctx.fillStyle = roofCol(lvl);
    ctx.beginPath(); ctx.moveTo(-w / 2 - 6, base - H); ctx.lineTo(w / 2 + 6, base - H); ctx.lineTo(w / 2, base - H - 15); ctx.lineTo(-w / 2, base - H - 15); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  D.armoryB = function (ctx, x, y, lvl, t) {
    const w = 60 + lvl * 6, h = 28 + lvl * 2;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.6, 9);
    ctx.fillStyle = '#7a756e'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = 'rgba(40,36,32,0.5)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let yy = -h + 6; yy < 0; yy += 6) { ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); }
    for (let r = 0, yy = -h; yy < 0; yy += 6, r++) for (let xx = -w / 2 + (r % 2 ? 5 : 0); xx < w / 2; xx += 10) { ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(0, yy + 6)); }
    ctx.stroke();
    door(ctx, 0, 13, 18);
    gableRoof(ctx, w, -h, 16 + lvl * 2, lvl >= 3 ? '#4d4d55' : '#6b4a3a');
    // crossed swords sign
    ctx.save(); ctx.translate(0, -h + 6);
    ctx.fillStyle = '#5d3d22'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    lines(ctx, '#d8dde2', 1.3, [[-4, 4, 4, -4], [4, 4, -4, -4]]);
    ctx.restore();
    D.armory(ctx, w / 2 + 14, 4, lvl);
    if (lvl >= 3) { lines(ctx, '#3a2a1a', 1, [[-w / 2 + 4, -h - 4, -w / 2 + 4, -h - 26]]); ctx.fillStyle = '#9a2a22'; ctx.beginPath(); ctx.moveTo(-w / 2 + 4, -h - 26); ctx.lineTo(-w / 2 + 16 + Math.sin(t * 4) * 1.5, -h - 23); ctx.lineTo(-w / 2 + 4, -h - 19); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };

  D.infirmary = function (ctx, x, y, lvl, t, lit) {
    const w = 60 + lvl * 7;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.62, 10);
    if (lvl >= 3) {
      const h = 26 + lvl * 2;
      foundation(ctx, w, lvl);
      ctx.fillStyle = '#e8e2d4'; ctx.fillRect(-w / 2, -6 - h, w, h);
      lines(ctx, 'rgba(120,110,90,0.4)', 0.7, [[-w / 2, -6 - h * 0.5, w / 2, -6 - h * 0.5]]);
      ctx.save(); ctx.translate(0, -6); door(ctx, 0, 12, 17); ctx.restore();
      windowLit(ctx, -w * 0.3, -6 - h * 0.55, 8, lit); windowLit(ctx, w * 0.3, -6 - h * 0.55, 8, lit);
      gableRoof(ctx, w, -6 - h, 18 + lvl * 2, '#6b4a3a');
      ctx.fillStyle = '#c62f2f'; ctx.fillRect(-2.5, -6 - h - 14, 5, 13); ctx.fillRect(-6.5, -6 - h - 10, 13, 5);
    } else {
      const k = w / 50;
      ctx.scale(k, k);
      ctx.fillStyle = '#b8b0a0';
      ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(0, -28); ctx.lineTo(0, -46); ctx.lineTo(-25, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e2d4';
      ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(0, -28); ctx.lineTo(0, -46); ctx.lineTo(25, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8d0c0';
      ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(0, -28); ctx.lineTo(25, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lit ? '#5a4020' : '#1a120c';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -17); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c62f2f'; ctx.fillRect(9, -16, 3, 9); ctx.fillRect(6, -13, 9, 3);
    }
    ctx.restore();
  };

  D.scout = function (ctx, x, y, lvl, t) {
    const w = 46 + lvl * 5;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, w * 0.62, 9);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-w / 2, -22, w * 0.6, 22);
    door(ctx, -w / 2 + w * 0.3, 9, 14);
    ctx.fillStyle = roofCol(lvl); ctx.beginPath(); ctx.moveTo(-w / 2 - 4, -21); ctx.lineTo(-w / 2 + w * 0.6 + 4, -21); ctx.lineTo(-w / 2 + w * 0.5, -33); ctx.lineTo(-w / 2 + w * 0.1, -33); ctx.closePath(); ctx.fill();
    // lookout pole with flag
    const ph = 50 + lvl * 6;
    lines(ctx, '#5a3d24', 2.4, [[w * 0.3, 0, w * 0.3, -ph]]);
    lines(ctx, '#5a3d24', 1.2, [[w * 0.3 - 6, 0, w * 0.3, -ph * 0.5], [w * 0.3 + 6, 0, w * 0.3, -ph * 0.5]]);
    ctx.fillStyle = '#2f5d50';
    ctx.beginPath(); ctx.moveTo(w * 0.3, -ph); ctx.lineTo(w * 0.3 + 14 + Math.sin(t * 4) * 2, -ph + 4); ctx.lineTo(w * 0.3, -ph + 9); ctx.closePath(); ctx.fill();
    if (lvl >= 2) { ctx.fillStyle = '#7a5434'; ctx.fillRect(w * 0.3 - 7, -ph * 0.62, 14, 3); }
    // map table and packs
    ctx.fillStyle = '#7a5434'; ctx.fillRect(w * 0.02, -9, 14, 3);
    ctx.fillStyle = '#e8dcc4'; ctx.fillRect(w * 0.02 + 2, -11, 10, 2);
    ctx.fillStyle = '#5a4630'; D.rr(ctx, -w / 2 - 8, -9, 7, 9, 2); ctx.fill();
    ctx.restore();
  };

  // wooden scaffolding shown while something is being built or upgraded
  D.scaffold = function (ctx, x, y, w, h, prog, newBuild) {
    ctx.save(); ctx.translate(x, y);
    if (newBuild) {
      ctx.fillStyle = 'rgba(90,64,40,0.55)'; ctx.fillRect(-w / 2, -4, w, 4);
      ctx.fillStyle = 'rgba(122,84,52,0.9)';
      const fh = h * U.clamp(prog, 0, 1);
      ctx.fillRect(-w / 2 + 4, -fh, w - 8, fh);
      ctx.strokeStyle = 'rgba(40,26,14,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let yy = -4.5; yy > -fh; yy -= 4.5) { ctx.moveTo(-w / 2 + 4, yy); ctx.lineTo(w / 2 - 4, yy); } ctx.stroke();
    }
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const px of [-w / 2 - 3, 0, w / 2 + 3]) { ctx.moveTo(px, 2); ctx.lineTo(px, -h - 10); }
    for (let yy = -10; yy > -h - 10; yy -= 14) { ctx.moveTo(-w / 2 - 5, yy); ctx.lineTo(w / 2 + 5, yy); }
    ctx.moveTo(-w / 2 - 3, 0); ctx.lineTo(0, -h * 0.6); ctx.moveTo(w / 2 + 3, 0); ctx.lineTo(0, -h * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#a07a4a';
    for (let yy = -10; yy > -h - 10; yy -= 28) ctx.fillRect(-w / 2 - 5, yy - 1.5, w + 10, 3);
    ctx.restore();
  };

  // the gate in the south wall; open in daytime, closed at night
  D.gate = function (ctx, x, y, lvl, open, dmg, broken, t) {
    const half = 70, H = 34 + lvl * 3;
    ctx.save(); ctx.translate(x, y);
    shadow(ctx, half + 14, 7, 0);
    const postC = lvl >= 5 ? '#7a756e' : '#5a3d24';
    const post = (px, wd) => {
      ctx.fillStyle = postC; ctx.fillRect(px - wd / 2, -H - 12, wd, H + 12);
      ctx.fillStyle = U.shade(postC, 0.15); ctx.fillRect(px - wd / 2, -H - 12, wd * 0.35, H + 12);
      ctx.fillStyle = lvl >= 4 ? '#8d939a' : U.shade(postC, 0.25);
      ctx.beginPath(); ctx.moveTo(px - wd / 2 - 1, -H - 12); ctx.lineTo(px, -H - 22); ctx.lineTo(px + wd / 2 + 1, -H - 12); ctx.closePath(); ctx.fill();
    };
    // doors
    const doorC = U.mix('#7a5434', '#3b2a1c', Math.min(0.7, dmg * 0.7));
    const leaf = (sx, dir) => {
      if (broken) {
        ctx.fillStyle = '#3e2c1d';
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, -10); ctx.lineTo(sx + dir * 20, -16); ctx.lineTo(sx + dir * 34, -6); ctx.lineTo(sx + dir * 40, 0); ctx.closePath(); ctx.fill();
        return;
      }
      const wd = open ? 12 : half - 6;
      ctx.fillStyle = doorC; ctx.fillRect(dir > 0 ? sx : sx - wd, -H, wd, H);
      ctx.strokeStyle = 'rgba(30,18,8,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let k = 1; k < 6; k++) { const xx = dir > 0 ? sx + wd * k / 6 : sx - wd * k / 6; ctx.moveTo(xx, -H); ctx.lineTo(xx, 0); } ctx.stroke();
      if (!open) {
        ctx.strokeStyle = lvl >= 3 ? '#5d6166' : '#5a3d24'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(dir > 0 ? sx : sx - wd, -H * 0.25); ctx.lineTo(dir > 0 ? sx + wd : sx, -H * 0.25); ctx.moveTo(dir > 0 ? sx : sx - wd, -H * 0.75); ctx.lineTo(dir > 0 ? sx + wd : sx, -H * 0.75); ctx.stroke();
        ctx.strokeStyle = U.shade(doorC, -0.3); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(dir > 0 ? sx : sx - wd, -H * 0.25); ctx.lineTo(dir > 0 ? sx + wd : sx, -H * 0.75); ctx.stroke();
      }
    };
    leaf(-half + 6, 1);
    leaf(half - 6, -1);
    post(-half, 12); post(half, 12);
    // crossbeam and roof
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(-half - 6, -H - 14, half * 2 + 12, 6);
    if (lvl >= 2) {
      ctx.fillStyle = lvl >= 4 ? '#4d4d55' : '#8a7240';
      ctx.beginPath(); ctx.moveTo(-half - 12, -H - 12); ctx.lineTo(half + 12, -H - 12); ctx.lineTo(half - 4, -H - 26); ctx.lineTo(-half + 4, -H - 26); ctx.closePath(); ctx.fill();
    }
    // lanterns
    for (const sx of [-half, half]) {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx - 2, -H - 6, 4, 6);
      ctx.fillStyle = '#ffcf70'; ctx.fillRect(sx - 1.4, -H - 5, 2.8, 3.6);
    }
    ctx.restore();
  };

  D.rock = function (ctx, x, y, k, shake, seed) {
    ctx.save(); ctx.translate(x + (shake > 0 ? Math.sin(shake * 80) * 1.2 : 0), y); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(4, 2, 24, 7, 0, 0, TAU); ctx.fill();
    const blob = (bx, by, r, c) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.quadraticCurveTo(bx - r, by - r * 1.2, bx - r * 0.2, by - r * 1.3); ctx.quadraticCurveTo(bx + r * 0.9, by - r * 1.2, bx + r, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.ellipse(bx - r * 0.3, by - r * 0.95, r * 0.35, r * 0.18, -0.3, 0, TAU); ctx.fill();
    };
    blob(-9, 1, 10, '#7c776f');
    blob(8, 2, 9, '#6e6a63');
    blob(0, -2, 13, '#8a857e');
    ctx.strokeStyle = 'rgba(40,36,32,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(1, -6); ctx.lineTo(-1, -2); ctx.stroke();
    ctx.fillStyle = 'rgba(90,120,60,0.6)'; ctx.beginPath(); ctx.ellipse(-12, -1, 4, 1.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // what a worker carries on the shoulder
  D.load = function (ctx, kind, x, y, fl) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 'wood') {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = col('#6b4a2b', fl); D.rr(ctx, -13 + i * 1.5, -i * 3.6, 24, 4, 2); ctx.fill();
        ctx.fillStyle = col('#c9955a', fl); ctx.beginPath(); ctx.ellipse(11 + i * 1.5, 2 - i * 3.6, 1.6, 2, 0, 0, TAU); ctx.fill();
      }
    } else if (kind === 'stone') {
      ctx.fillStyle = col('#6a5a44', fl); D.rr(ctx, -8, -8, 16, 11, 4); ctx.fill();
      ctx.fillStyle = col('#9a958d', fl); ctx.beginPath(); ctx.arc(-3, -8, 3.4, 0, TAU); ctx.arc(3, -9, 3.8, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = col('#5a4630', fl); D.rr(ctx, -7, -9, 14, 12, 4); ctx.fill();
      ctx.fillStyle = col('#46361f', fl); ctx.fillRect(-7, -4, 14, 1.6);
    }
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
