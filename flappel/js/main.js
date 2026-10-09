'use strict';
// Flappel · hoofdlus en opstarten
// Laadt als laatste: invoer, de hoofdlus met een vaste stap en het opstarten.

// ---- invoer: één knop (tik, klik of spatie) ----
function inputInit() {
  window.addEventListener('pointerdown', e => {
    audioInit();
    if (e.target.closest && e.target.closest('button, a, input, .card')) return;
    if (S.mode === 'ready' || S.mode === 'play') { e.preventDefault(); flap(); }
  }, { passive: false });
  window.addEventListener('keydown', e => {
    const k = e.key;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;
      audioInit();
      if (S.mode === 'ready' || S.mode === 'play') flap();
      else if (S.mode === 'pause') resumeGame();
      else if (curScreen === 'menu') startGame();
      else if (curScreen === 'over' && performance.now() - overAt > 600) startGame();
    } else if (k === 'Escape' || k === 'p' || k === 'P') {
      if (S.mode === 'play' || S.mode === 'ready') pauseGame();
      else if (S.mode === 'pause') resumeGame();
      else if (k === 'Escape' && curScreen && curScreen !== 'menu' && curScreen !== 'over') showScreen(curScreen === 'shop' ? shopBack : 'menu');
    }
  });
  // tab weg = pauze
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play') pauseGame(); });
  window.addEventListener('resize', viewResize);
}

// ---- hoofdlus: simulatie in vaste stapjes, tekenen zo vaak als het scherm ververst ----
const STEP = 1 / 120;
let last = performance.now(), acc = 0;
// te traag beeld (bijv. een grote 4K-monitor zonder grafische versnelling): resolutie wat omlaag
const perf = { t: 0, n: 0, slow: 0 };
function perfCheck(ms) {
  if (ms > 250 || document.hidden) return;
  perf.t += ms; perf.n++; if (ms > 24) perf.slow++;
  if (perf.t < 2500) return;
  if (perf.slow / perf.n > 0.35 && dprK > 0.55) { dprK *= 0.8; viewResize(); }
  perf.t = perf.n = perf.slow = 0;
}
function frame(now) {
  const ms = now - last; last = now;
  perfCheck(ms);
  acc += Math.min(ms / 1000, 0.1);
  let n = 0;
  while (acc >= STEP && n < 8) { step(STEP); acc -= STEP; n++; }
  if (n === 8) acc = 0;
  render();
  if (curScreen === 'skins') drawSkinPreviews();
  requestAnimationFrame(frame);
}

// ---- opstarten ----
viewResize();
inputInit();
uiInit();
accountInit();
lbInit();
newRun(true);
Music.setTheme(curTheme());
requestAnimationFrame(frame);
// lettertype geladen: sprites met tekst opnieuw tekenen is niet nodig, maar de HUD wel meteen goed
if (document.fonts && document.fonts.load) document.fonts.load('40px "Lilita One"').catch(() => { /* */ });
// testhaak voor de rooktest en de console
window.__flappel = { S, V: () => V, step, flap, startGame, newRun, nextTheme, givePower, save: () => save, THEMES, setTheme };
