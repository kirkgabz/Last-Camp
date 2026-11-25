/* Last Camp — online accounts and cloud saves (talks to our own /api backend).
 * Players sign in with email + password; their current run and permanent progress
 * (embers, best night, upgrades) are stored in the Neon database by /api/save.
 * Without an account (or offline) the game keeps working with a local save.
 */
(function (LC) {
  'use strict';
  const U = LC.U;

  // When the game is served by Vercel (or `npm run dev`) the API is on the same site.
  // When index.html is opened directly from disk, it uses the deployed site below.
  // After deploying, put your Vercel address here, e.g. 'https://last-camp.vercel.app'.
  const DEPLOYED_URL = '';
  const API_BASE = location.protocol === 'file:' ? (DEPLOYED_URL ? DEPLOYED_URL.replace(/\/+$/, '') : null) : '';

  const TOKEN_KEY = 'lastcamp.token';
  const USER_KEY = 'lastcamp.user';

  const Cloud = (LC.Cloud = {
    user: null,      // { id, email } when signed in
    status: 'off',   // off | syncing | saved | saving | offline
    ready: false,
    pending: false,
  });

  const listeners = [];
  Cloud.onChange = (fn) => listeners.push(fn);
  function emit() { for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } }
  function setStatus(s) { if (Cloud.status !== s) { Cloud.status = s; emit(); } }

  Cloud.uid = () => (Cloud.user ? Cloud.user.id : null);
  Cloud.available = () => API_BASE !== null;
  Cloud.key = (base) => (Cloud.user ? base + '.' + Cloud.user.id : base);

  const token = () => U.store.get(TOKEN_KEY, null);
  // set while this account has local progress the server has not received yet
  const dirtyKey = () => 'lastcamp.unsynced.' + Cloud.user.id;

  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  async function api(path, opts) {
    if (API_BASE === null) throw new ApiError('offline', 0);
    const o = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), o.timeout || 15000);
    let res;
    try {
      res = await fetch(API_BASE + path, { method: o.method || 'GET', headers, body: o.body ? JSON.stringify(o.body) : undefined, signal: ctrl.signal });
    } catch (e) {
      throw new ApiError('network', 0);
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) throw new ApiError((data && data.error) || ('HTTP ' + res.status), res.status);
    return data;
  }

  Cloud.friendlyError = function (err) {
    if (err && err.status === 0) return 'Cannot reach the server. Check your internet connection.';
    if (err && err.status === 404) return 'Online saving is not set up on this server yet.';
    return (err && err.message) || 'Something went wrong. Please try again.';
  };

  function forget() {
    U.store.del(TOKEN_KEY);
    U.store.del(USER_KEY);
    Cloud.user = null;
  }

  // ---------- start-up: restore the remembered sign-in ----------
  Cloud.init = async function () {
    const t = token();
    const u = U.store.get(USER_KEY, null);
    if (t && u && u.id) {
      Cloud.user = { id: u.id, email: u.email };
      await Cloud.pull();
    }
    Cloud.ready = true;
    emit();
    window.addEventListener('online', () => { if (Cloud.pending) Cloud.push(); });
  };

  function signedIn(data) {
    U.store.set(TOKEN_KEY, data.token);
    U.store.set(USER_KEY, { id: data.user.id, email: data.user.email });
    Cloud.user = { id: data.user.id, email: data.user.email };
  }

  // ---------- account actions ----------
  Cloud.signIn = async function (email, password) {
    const data = await api('/api/auth', { method: 'POST', body: { action: 'signin', email, password } });
    signedIn(data);
    await Cloud.pull({ adoptGuest: false });
    emit();
    return 'signed-in';
  };

  Cloud.signUp = async function (email, password) {
    const data = await api('/api/auth', { method: 'POST', body: { action: 'signup', email, password } });
    signedIn(data);
    await Cloud.pull({ adoptGuest: true });
    emit();
    return 'signed-in';
  };

  Cloud.signOut = async function () {
    if (Cloud.pending) await Cloud.push();
    try { await api('/api/auth', { method: 'POST', body: { action: 'signout' }, timeout: 6000 }); } catch (e) { /* sign out locally anyway */ }
    forget();
    setStatus('off');
    emit();
  };

  // ---------- data sync ----------
  // Download this player's save into the local cache (the online copy is the truth).
  // A brand-new account adopts the guest progress on this device, so nothing is lost.
  Cloud.pull = async function (opts) {
    if (!Cloud.user) return;
    const C = LC.C;
    setStatus('syncing');
    try {
      if (U.store.get(dirtyKey(), false)) { await Cloud.push(); return; } // newer progress on this device wins
      const data = await api('/api/save');
      if (data.exists) {
        if (data.run) U.store.set(Cloud.key(C.SAVE_KEY), data.run); else U.store.del(Cloud.key(C.SAVE_KEY));
        U.store.set(Cloud.key(C.META_KEY), data.meta || {});
        Cloud.pending = false;
        setStatus('saved');
      } else {
        if (opts && opts.adoptGuest) {
          const guestRun = U.store.get(C.SAVE_KEY, null);
          const guestMeta = U.store.get(C.META_KEY, null);
          if (guestRun) U.store.set(Cloud.key(C.SAVE_KEY), guestRun);
          if (guestMeta) U.store.set(Cloud.key(C.META_KEY), guestMeta);
        }
        await Cloud.push();
      }
    } catch (e) {
      if (e.status === 401) { forget(); setStatus('off'); return; }
      setStatus('offline'); // keep playing on this account's cached copy
    }
  };

  let pushTimer = null;
  let pushing = null;
  Cloud.queuePush = function () {
    if (!Cloud.user) return;
    Cloud.pending = true;
    U.store.set(dirtyKey(), true);
    setStatus('saving');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => Cloud.push(), 600);
  };

  Cloud.push = async function () {
    if (!Cloud.user) return;
    clearTimeout(pushTimer);
    if (pushing) await pushing;
    const C = LC.C;
    const body = { run: U.store.get(Cloud.key(C.SAVE_KEY), null), meta: U.store.get(Cloud.key(C.META_KEY), {}) || {} };
    const dk = dirtyKey();
    U.store.set(dk, true);
    Cloud.pending = false;
    setStatus('saving');
    pushing = (async () => {
      try {
        await api('/api/save', { method: 'PUT', body });
        if (!Cloud.pending) U.store.del(dk);
        setStatus(Cloud.pending ? 'saving' : 'saved');
      } catch (e) {
        Cloud.pending = true;
        if (e.status === 401) { forget(); setStatus('off'); if (LC.UI) LC.UI.toast('Your sign-in expired. Please sign in again; your progress is kept on this device.', 'bad'); return; }
        setStatus('offline');
      }
    })();
    await pushing;
    pushing = null;
  };

  Cloud.statusText = function () {
    switch (Cloud.status) {
      case 'syncing': return 'Loading your save…';
      case 'saving': return 'Saving online…';
      case 'saved': return 'Saved online';
      case 'offline': return 'Offline. Saved on this device and will upload later.';
      default: return Cloud.available() ? 'Playing as guest (saved on this device only)' : 'Offline mode (saved on this device only)';
    }
  };
})(window.LC);
