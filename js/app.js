/* Last Camp — installable app support: service worker, install prompt, landscape on phones */
(function (LC) {
  'use strict';

  const App = (LC.App = { deferred: null, listeners: [] });
  const ua = navigator.userAgent || '';
  App.isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  App.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  App.isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  App.onChange = (fn) => App.listeners.push(fn);
  const emit = () => App.listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });

  // can we offer an install button right now?
  App.installable = () => !App.isStandalone() && (!!App.deferred || App.isIOS);

  App.install = async function () {
    if (App.deferred) {
      const d = App.deferred;
      App.deferred = null;
      d.prompt();
      try { await d.userChoice; } catch (e) { /* ignore */ }
      emit();
      return 'prompted';
    }
    return App.isIOS ? 'ios' : 'unavailable';
  };

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { App.deferred = null; emit(); if (LC.UI) LC.UI.toast('Last Camp is installed! Open it from your home screen.', 'good'); });

  // offline support (only works when served over http/https)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // on phones: go fullscreen and lock to landscape when a game starts (browsers allow this only after a tap)
  App.goLandscape = function () {
    if (!App.isTouch || App.isStandalone()) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      const p = req && !document.fullscreenElement ? req.call(el, { navigationUI: 'hide' }) : null;
      Promise.resolve(p).then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
    } catch (e) { /* not supported: the rotate notice covers it */ }
  };

  // "turn your phone sideways" notice in portrait
  function checkOrientation() {
    const el = document.getElementById('rotate');
    if (!el) return;
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    el.classList.toggle('show', App.isTouch && portrait);
    if (LC.state && LC.state.screen === 'run' && App.isTouch && portrait && !LC.state.paused && LC.Flow) {
      LC.state.paused = true; App.autoPaused = true;
      if (LC.UI) LC.UI.syncSpeed();
    } else if (!portrait && App.autoPaused && LC.state && LC.state.screen === 'run') {
      App.autoPaused = false; LC.state.paused = false;
      if (LC.UI) LC.UI.syncSpeed();
    }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 200));
  document.addEventListener('DOMContentLoaded', checkOrientation);
  App.checkOrientation = checkOrientation;
})(window.LC = window.LC || {});
