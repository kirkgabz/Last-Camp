/* Last Camp — utilities, storage and synthesized audio */
window.LC = window.LC || {};
(function (LC) {
  'use strict';

  const U = (LC.U = {});
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  U.weighted = (items) => {
    let total = 0;
    for (const it of items) total += it.w;
    let r = Math.random() * total;
    for (const it of items) { r -= it.w; if (r <= 0) return it.v; }
    return items[items.length - 1].v;
  };
  U.roman = (n) => {
    const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    if (n >= 40) return String(n);
    for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
    return out;
  };
  U.seeded = (seed) => {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  };
  U.noise1 = (x) => {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { const s = Math.sin(n * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };
    const u = f * f * (3 - 2 * f);
    return h(i) * (1 - u) + h(i + 1) * u;
  };
  U.fmtTime = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- colours ----
  const cache = new Map();
  function parse(hex) {
    let v = cache.get(hex);
    if (v) return v;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16) || 0;
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    if (cache.size > 6000) cache.clear();
    cache.set(hex, v);
    return v;
  }
  U.mix = (a, b, t) => {
    const A = parse(a), B = parse(b);
    const r = Math.round(A[0] + (B[0] - A[0]) * t);
    const g = Math.round(A[1] + (B[1] - A[1]) * t);
    const bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };
  U.shade = (hex, amt) => (amt >= 0 ? U.mix(hex, '#ffffff', amt) : U.mix(hex, '#000000', -amt));
  U.rgba = (hex, a) => { const c = parse(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  // ---- storage (never throws) ----
  U.store = {
    get(k, def) {
      try { const s = window.localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch (e) { return def; }
    },
    set(k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del(k) {
      try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
    },
  };

  // ---- audio: everything is synthesized, no files needed ----
  const A = (LC.Audio = { ctx: null, master: null, muted: false, last: {} });
  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.muted ? 0 : 0.45;
      A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate;
      const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noiseBuf = buf;
    } catch (e) {
      A.ctx = null;
    }
  };
  A.setMuted = function (m) {
    A.muted = !!m;
    if (A.master) A.master.gain.value = A.muted ? 0 : 0.45;
    U.store.set('lastcamp.muted', A.muted);
  };
  function env(g, t0, attack, dur, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
  }
  A.noise = function (dur, freq, q, vol, type, attack) {
    if (!A.ctx || A.muted || !A.noiseBuf) return;
    try {
      const t = A.ctx.currentTime;
      const src = A.ctx.createBufferSource();
      src.buffer = A.noiseBuf;
      const f = A.ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = A.ctx.createGain();
      env(g, t, attack || 0.005, dur, vol);
      src.connect(f); f.connect(g); g.connect(A.master);
      src.start(t, Math.random() * 0.4);
      src.stop(t + (attack || 0.005) + dur + 0.05);
    } catch (e) { /* ignore */ }
  };
  A.tone = function (freq, dur, type, vol, slideTo, attack) {
    if (!A.ctx || A.muted) return;
    try {
      const t = A.ctx.currentTime;
      const o = A.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + (attack || 0.01) + dur);
      const g = A.ctx.createGain();
      env(g, t, attack || 0.01, dur, vol || 0.15);
      o.connect(g); g.connect(A.master);
      o.start(t);
      o.stop(t + (attack || 0.01) + dur + 0.05);
    } catch (e) { /* ignore */ }
  };
  A.play = function (name) {
    if (!A.ctx || A.muted) return;
    const now = performance.now();
    if (A.last[name] && now - A.last[name] < 55) return;
    A.last[name] = now;
    switch (name) {
      case 'hit': A.noise(0.07, 900, 1.2, 0.22); A.tone(130, 0.07, 'triangle', 0.1, 60); break;
      case 'hurt': A.noise(0.12, 500, 1, 0.25); A.tone(200, 0.15, 'sawtooth', 0.05, 120); break;
      case 'chop': A.noise(0.1, 380, 2, 0.22); A.tone(85, 0.08, 'square', 0.04, 50); break;
      case 'arrow': A.noise(0.1, 2600, 3, 0.1, 'bandpass', 0.02); break;
      case 'horn': A.tone(110, 1.5, 'sawtooth', 0.1, 98, 0.35); A.tone(165, 1.5, 'sawtooth', 0.05, 147, 0.35); break;
      case 'boss': A.tone(55, 2.4, 'sawtooth', 0.16, 41, 0.5); A.noise(1.6, 140, 0.6, 0.3, 'lowpass', 0.4); break;
      case 'break': A.noise(0.45, 260, 0.8, 0.4); A.tone(70, 0.35, 'square', 0.08, 38); break;
      case 'death': A.tone(240, 0.7, 'triangle', 0.14, 110, 0.02); break;
      case 'enemyDie': A.noise(0.16, 420, 1, 0.14, 'lowpass'); break;
      case 'stoke': A.noise(0.5, 700, 0.6, 0.22, 'lowpass', 0.05); break;
      case 'build':
        A.noise(0.09, 600, 1, 0.2); A.tone(180, 0.08, 'square', 0.05);
        setTimeout(() => { A.noise(0.09, 500, 1, 0.2); A.tone(240, 0.08, 'square', 0.05); }, 110);
        break;
      case 'click': A.tone(620, 0.04, 'sine', 0.05); break;
      case 'deny': A.tone(180, 0.12, 'square', 0.05, 140); break;
      case 'level': [523, 659, 784].forEach((f, i) => setTimeout(() => A.tone(f, 0.16, 'triangle', 0.09), i * 90)); break;
      case 'crackle': A.noise(0.025, U.rand(1500, 4200), 4, U.rand(0.02, 0.06), 'bandpass', 0.002); break;
      case 'warn': A.tone(880, 0.1, 'square', 0.05); setTimeout(() => A.tone(880, 0.1, 'square', 0.05), 160); break;
      case 'dawn': [392, 494, 587, 784].forEach((f, i) => setTimeout(() => A.tone(f, 0.5, 'sine', 0.08), i * 140)); break;
      case 'gameover': A.tone(196, 1.6, 'triangle', 0.14, 92, 0.05); A.tone(147, 1.8, 'sine', 0.1, 70, 0.1); break;
      case 'howl': A.tone(380, 0.5, 'sine', 0.05, 620, 0.25); setTimeout(() => A.tone(620, 0.9, 'sine', 0.05, 330, 0.05), 750); break;
      default: break;
    }
  };
})(window.LC);
