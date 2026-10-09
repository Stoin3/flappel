'use strict';
// Flappel · spelverloop
// Fladderen, buizen en pitten maken, botsingen, power-ups, punten en stijlwissels.

// mode: 'demo' (achter het menu speelt de appel zelf), 'ready' (wacht op de eerste tik), 'play', 'dead', 'over', 'pause'
const S = {
  mode: 'demo', demo: true, rt: 0, t: 0, D: 0, speedNow: 0, tk: 1,
  n: 0, score: 0, coins: 0, perf: 0, pitStreak: 0, pitT: 0,
  A: null, pipes: [], pits: [], bubbles: [], parts: [], pops: [], trail: [],
  theme: 0, order: [0], oi: 0, trans: null, banner: null, demoT: 0,
  pow: {}, powMax: {}, shields: 0, revives: 0, inv: 0,
  shake: 0, flash: 0, flashC: '#fff', scorePop: 0, deadT: 0, nextId: 1, spawned: 0, nextX: 0, lastGy: 0,
  trailT: 0, blinkT: 2, record: false,
};
const appleX = () => clamp(V.w * 0.28, 110, 290);
const midY = () => V.gy * 0.48;
const gravity = () => GRAVITY * (S.demo ? 1 : upEff('float'));
const flapV = () => Math.sqrt(2 * gravity() * JUMP_H);
const skin = () => SKIN_BY_ID[S.demo ? demoSkin() : save.skin] || SKINS[0];
let demoSkinId = 'rood';
const demoSkin = () => demoSkinId;
const playing = () => S.mode === 'play' || S.mode === 'demo';
const curTheme = () => THEMES[S.theme];

// moeilijkheid: rustig oplopend, met een plafond (het spel moet makkelijk blijven)
const speedAt = n => Math.min(SPEED_MAX, SPEED0 + n * SPEED_UP);
const gapAt = n => Math.max(GAP_MIN, GAP0 - n * GAP_DOWN) + (S.demo ? 10 : upEff('gap'));
const spaceAt = n => Math.max(SPACE_MIN, SPACE0 - n * 1.2);

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

function newRun(demo) {
  Object.assign(S, {
    demo, mode: demo ? 'demo' : 'ready', n: 0, score: 0, coins: 0, perf: 0, pitStreak: 0,
    pipes: [], pits: [], bubbles: [], trail: [], pops: [], pow: {}, powMax: {}, inv: 0, deadT: 0, spawned: 0,
    banner: null, record: false, tk: 1, demoT: 0,
  });
  S.nextX = V.w + (demo ? 60 : 40);
  S.lastGy = midY();
  S.A = { x: appleX(), y: midY(), vy: 0, rot: 0, wingP: 1, sq: 0, alive: true, s: 1, mood: 'happy', look: 0, blink: false, ground: false };
  S.shields = demo ? 0 : upEff('shield');
  S.revives = demo ? 0 : upEff('revive');
  if (demo) { demoSkinId = pick(SKINS).id; return; }
  // de eerste keer altijd de boomgaard; daarna begint elk potje in een andere stijl
  const start = save.runs === 0 ? 0 : (S.theme + 1 + Math.floor(Math.random() * (THEMES.length - 1))) % THEMES.length;
  S.order = [start, ...shuffle(THEMES.map((_, i) => i).filter(i => i !== start))];
  S.oi = 0;
  setTheme(start, start !== S.theme);
}
function setTheme(i, anim) {
  if (anim) S.trans = { from: S.theme, to: i, t: 0, dur: 1.1, x: S.A ? S.A.x : V.w / 2, y: S.A ? S.A.y : V.h / 2 };
  S.theme = i;
  Music.setTheme(THEMES[i]);
}
function nextTheme() {
  S.oi = (S.oi + 1) % S.order.length;
  const i = S.order[S.oi];
  setTheme(i, true);
  if (S.demo) return;
  S.banner = { t: 0, th: THEMES[i] };
  Sfx.whoosh();
  burst(S.A.x, S.A.y, 60, { type: 'conf', c: 'rainbow', min: 150, max: 520, g: 300, life: 1.6, smin: 3, smax: 6 });
  flash(THEMES[i].glow, 0.35);
}
function flash(c, a) { S.flashC = c; S.flash = Math.max(S.flash, a * (save.calm ? 0.3 : 1)); }
function shake(a) { S.shake = Math.max(S.shake, a * (save.calm ? 0.3 : 1)); }

// ---- invoer ----
function flap() {
  const A = S.A;
  if (S.mode === 'ready') {
    S.mode = 'play';
    if (upLv('start')) givePower('rocket', upEff('start'), true);
  }
  if (!playing() || !A.alive || S.pow.rocket > 0) return;
  A.vy = -flapV();
  A.wingP = 0; A.sq = -0.9;
  if (!S.demo) {
    Sfx.flap();
    for (let i = 0; i < 6; i++) spawn({ x: A.x - 14, y: A.y + 6, vx: rand(-160, -60), vy: rand(20, 120), s: rand(2, 4), c: 'rgba(255,255,255,0.9)', life: 0.4, drag: 4 });
    if (Math.random() < 0.35) spawn({ x: A.x - 16, y: A.y, vx: rand(-120, -50), vy: rand(-40, 60), s: 5, c: '#5fcf3a', type: 'leaf', life: 1.2, g: 120, drag: 1.5 });
  }
}

// ---- de wereld vullen ----
function spawnPipe() {
  const n = S.spawned++, gap = gapAt(n), mid = midY();
  const range = Math.min(170, (V.gy - gap) / 2 - 40);
  const lim = 110 + Math.min(n, 40) * 2;
  let gy = mid + (Math.random() * 2 - 1) * range;
  gy = clamp(gy, S.lastGy - lim, S.lastGy + lim);
  if (n === 0) gy = mid + rand(-30, 30);
  const p = { id: S.nextId++, x: S.nextX, gy, base: gy, gap, passed: false, smashed: false, face: Math.random() < 0.55, mA: 0, mS: 0, mP: Math.random() * TAU };
  // na een tijdje bewegen sommige buizen rustig op en neer
  if (n >= 12 && Math.random() < 0.3) { p.mA = Math.min(45, 15 + n * 0.6); p.mS = rand(0.9, 1.5); if (Math.abs(p.base - mid) + p.mA > range) p.base = mid + Math.sign(p.base - mid) * (range - p.mA); }
  const prev = S.pipes[S.pipes.length - 1];
  S.pipes.push(p);
  // power-up halverwege, en pitten in een boogje tussen de buizen
  const every = S.demo ? 6 : upEff('luck');
  const bub = n > 0 && n % every === every - 1;
  if (prev && n > 0) {
    const x0 = prev.x + PIPE_W + 26, x1 = p.x - 26;
    if (bub) S.bubbles.push({ x: (x0 + x1) / 2, y: (prev.base + p.base) / 2, type: pickPower(), ph: Math.random() * TAU });
    const k = 3 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < k; i++) {
      const f = (i + 1) / (k + 1);
      if (bub && Math.abs(f - 0.5) < 0.2) continue;
      const e = f * f * (3 - 2 * f);
      S.pits.push({ x: lerp(x0, x1, f), y: lerp(prev.base, p.base, e) + Math.sin(f * Math.PI) * -18, ph: Math.random() * TAU, mag: false });
    }
  }
  if (Math.random() < 0.6) S.pits.push({ x: p.x + PIPE_W / 2, y: p.base, ph: Math.random() * TAU, mag: false, pipe: p });
  S.lastGy = p.base;
  S.nextX += spaceAt(n);
}
function pickPower() {
  const w = { star: 24, rocket: 14, magnet: 18, double: 18, slow: 12, mini: 14 };
  let r = Math.random() * 100;
  for (const id of POWER_IDS) { r -= w[id]; if (r < 0) return id; }
  return 'star';
}
function givePower(type, dur, quiet) {
  const d = dur * (S.demo ? 1 : upEff('power'));
  S.pow[type] = Math.max(S.pow[type] || 0, d); S.powMax[type] = S.pow[type];
  if (S.demo || quiet) return;
  Sfx.power();
  const pw = POWERS[type];
  pop(V.w / 2, V.gy * 0.32, `${pw.icon} ${pw.name.toUpperCase()}!`, pw.color, 34, { life: 1.4, max: 1.4, vy: -30 });
  burst(S.A.x, S.A.y, 40, { type: 'star', c: [pw.color, '#fff'], min: 120, max: 380, life: 0.9, smin: 4, smax: 8 });
  spawn({ x: S.A.x, y: S.A.y, type: 'ring', c: pw.color, s: 20, grow: 120, life: 0.5, vr: 0 });
  flash(pw.color, 0.25);
}
function nextPipe() {
  const A = S.A;
  for (const p of S.pipes) if (p.x + PIPE_W > A.x - HIT_R) return p;
  return null;
}

// ---- botsingen ----
function hitPipe(p, r) {
  const A = S.A, gt = p.gy - p.gap / 2, gb = p.gy + p.gap / 2;
  return circRect(A.x, A.y, r, p.x, -2000, PIPE_W, gt - CAP_H + 2000) || circRect(A.x, A.y, r, p.x - CAP_OVER, gt - CAP_H, PIPE_W + CAP_OVER * 2, CAP_H)
    || circRect(A.x, A.y, r, p.x, gb + CAP_H, PIPE_W, 4000) || circRect(A.x, A.y, r, p.x - CAP_OVER, gb, PIPE_W + CAP_OVER * 2, CAP_H);
}
function smash(p, quiet) {
  p.smashed = true;
  const cx = p.x + PIPE_W / 2, gt = p.gy - p.gap / 2, gb = p.gy + p.gap / 2;
  const o = { scroll: true, g: 1100, drag: 0.6 };
  for (const [y, dir] of [[gt - CAP_H / 2, -1], [gb + CAP_H / 2, 1]]) {
    burst(cx, y, 3, { type: 'slice', c: '#fff', min: 180, max: 420, life: 1.6, smin: 13, smax: 18, extra: o, angle: dir < 0 ? -Math.PI / 2 : Math.PI / 2, spread: 1.3 });
    burst(cx, y + dir * 40, 6, { type: 'chunk', c: '#fff', min: 120, max: 360, life: 1.4, smin: 6, smax: 10, extra: o });
  }
  burst(cx, S.A.y, 36, { type: 'seed', c: '#000', min: 100, max: 460, life: 1.2, extra: o });
  burst(cx, S.A.y, 30, { type: 'dot', c: ['#8fe03a', '#c8f05a', '#5a9a14'], min: 80, max: 420, life: 0.9, smin: 3, smax: 7, extra: o });
  if (S.demo || quiet) return;
  Sfx.smash();
  shake(11);
  pop(cx, S.A.y - 46, pick(['SPLAT!', 'KRAK!', 'BOEM!', 'KIWIMOES!', 'PLETS!']), '#b6ff4d', 32, { rot: rand(-0.2, 0.2) });
}
function die(byGround) {
  const A = S.A;
  if (S.demo) { A.alive = false; S.mode = 'dead'; return; }
  if (S.revives > 0) { // tweede kans: door naar het volgende gat
    S.revives--;
    const p = nextPipe();
    if (p && hitPipe(p, HIT_R + 4)) smash(p, true);
    const q = nextPipe();
    A.y = q ? q.gy : midY(); A.vy = -flapV() * 0.6;
    S.inv = 2.5;
    Sfx.revive();
    burst(A.x, A.y, 30, { type: 'heart', c: ['#ff3b6b', '#ff8aa8'], min: 100, max: 320, life: 1.1, smin: 5, smax: 9 });
    pop(A.x + 40, A.y - 50, '❤️ TWEEDE KANS!', '#ff6b8a', 30, { life: 1.5, max: 1.5 });
    flash('#ff6b8a', 0.4);
    return;
  }
  A.alive = false; S.mode = 'dead'; S.deadT = 0;
  A.vy = byGround ? -260 : -330;
  Sfx.hit(); shake(16); flash('#fff', 0.7);
  burst(A.x, A.y, 34, { type: 'dot', c: ['#ff3b3b', '#ff8a7a', '#ffd0c8'], min: 80, max: 380, life: 0.9, g: 600, smin: 3, smax: 7 });
  pop(A.x, A.y - 50, pick(['AU!', 'OEPS!', 'BONK!', 'AUWIE!']), '#ff5a5a', 36);
}

// ---- punten ----
function passPipe(p) {
  const A = S.A;
  p.passed = true;
  S.n++;
  const perfect = !p.smashed && Math.abs(A.y - p.gy) < PERFECT_D && S.pow.rocket === undefined;
  const mult = S.pow.double > 0 ? 2 : 1;
  let pts = 1;
  if (perfect) { S.perf++; pts += 1; } else S.perf = 0;
  pts *= mult;
  S.score += pts;
  if (S.demo) return;
  S.scorePop = 1;
  const cx = p.x + PIPE_W / 2;
  if (perfect) {
    Sfx.perfect(S.perf);
    pop(cx, p.gy - 40, S.perf > 1 ? `PERFECT ×${S.perf}!` : 'PERFECT!', 'rainbow', 26 + Math.min(S.perf, 6) * 2);
    burst(cx, p.gy, 22 + S.perf * 4, { type: 'conf', c: 'rainbow', min: 120, max: 360, life: 1, g: 260, extra: { scroll: true } });
    spawn({ x: cx, y: p.gy, type: 'ring', c: '#fff', s: 10, grow: 90, life: 0.45, vr: 0, scroll: true });
  } else {
    Sfx.score(S.n);
    pop(cx, A.y - 34, '+' + pts, '#fff', 22);
  }
  if (S.n % 25 === 0) { // mijlpaal: vuurwerk
    pop(V.w / 2, V.gy * 0.42, `🎉 ${S.n} BUIZEN! 🎉`, 'rainbow', 38, { life: 1.8, max: 1.8, vy: -20 });
    for (let i = 0; i < 4; i++) burst(rand(V.w * 0.2, V.w * 0.8), rand(80, V.gy * 0.5), 40, { type: i % 2 ? 'star' : 'glow', c: 'rainbow', min: 60, max: 300, life: 1.3, g: 120 });
    Sfx.record();
  }
  if (S.n % THEME_EVERY === 0) nextTheme();
}

// =====================================================================
//  Eén stap van de simulatie (vaste stap, zie main.js)
// =====================================================================
function step(dt) {
  S.rt += dt;
  if (S.mode === 'pause') return;
  // slowmo zakt soepel in en uit
  S.tk = lerp(S.tk, S.pow.slow > 0 ? 0.55 : 1, 1 - Math.exp(-dt * 6));
  Music.tempoK = S.tk;
  const d = dt * S.tk;
  S.t += d;
  const A = S.A;
  // timers (in echte seconden)
  for (const k in S.pow) {
    S.pow[k] -= dt;
    if (S.pow[k] <= 0) {
      delete S.pow[k];
      if (k === 'rocket') { S.inv = Math.max(S.inv, 1.2); A.vy = -flapV() * 0.5; }
    }
  }
  S.inv = Math.max(0, S.inv - dt);
  S.shake *= Math.exp(-dt * 9); S.flash = Math.max(0, S.flash - dt * 2.2);
  S.scorePop = Math.max(0, S.scorePop - dt * 4);
  if (S.trans) { S.trans.t += dt; if (S.trans.t >= S.trans.dur) S.trans = null; }
  if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.4) S.banner = null; }
  Music.intensity = clamp(S.n / 40, 0, 1);

  const moving = S.mode === 'play' || S.mode === 'demo' || S.mode === 'ready';
  const speed = moving ? speedAt(S.n) * (S.pow.rocket > 0 ? 2.4 : 1) : 0;
  S.speedNow = speed;
  S.D += speed * d;

  // wereld schuift
  if (S.mode === 'play' || S.mode === 'demo') {
    S.nextX -= speed * d;
    while (S.nextX < V.w + 120) spawnPipe();
    for (const p of S.pipes) {
      p.x -= speed * d;
      if (p.mA) p.gy = p.base + Math.sin(S.t * p.mS + p.mP) * p.mA;
    }
    for (const c of S.pits) { c.x -= speed * d; if (c.pipe) c.y = c.pipe.gy; }
    for (const b of S.bubbles) b.x -= speed * d;
    while (S.pipes.length && S.pipes[0].x < -PIPE_W - 40) S.pipes.shift();
    S.pits = S.pits.filter(c => c.x > -40 && !c.got);
    S.bubbles = S.bubbles.filter(b => b.x > -60 && !b.got);
  }

  // de appel
  A.wingP = Math.min(1, A.wingP + dt * 4.5);
  A.sq *= Math.exp(-dt * 10);
  A.s = lerp(A.s, S.pow.mini > 0 ? 0.6 : 1, 1 - Math.exp(-dt * 10));
  S.blinkT -= dt;
  if (S.blinkT < 0) { A.blink = true; if (S.blinkT < -0.12) { A.blink = false; S.blinkT = rand(1.5, 4); } }
  if (S.mode === 'ready') {
    A.y = midY() + Math.sin(S.rt * 3) * 12; A.vy = Math.cos(S.rt * 3) * 36; A.rot = 0;
    if (Math.sin(S.rt * 3 - 0.3) > 0.95 && A.wingP >= 1) A.wingP = 0;
  } else if (S.mode === 'play' || S.mode === 'demo') {
    if (S.mode === 'demo') demoAI();
    if (S.pow.rocket > 0) {
      const p = nextPipe(), ty = p ? p.gy : midY();
      A.vy = (ty - A.y) * 7; A.y += A.vy * d;
      if (A.wingP >= 1) A.wingP = 0;
    } else {
      A.vy = Math.min(A.vy + gravity() * d, MAX_FALL);
      A.y += A.vy * d;
    }
    if (A.y < 12) { A.y = 12; A.vy = Math.max(A.vy, 0); } // plafond: zacht, geen game over
    A.rot = lerp(A.rot, clamp(A.vy * 0.0017, -0.45, 1.0), 1 - Math.exp(-dt * 12));
    collide();
  } else if (S.mode === 'dead' || S.mode === 'over') {
    if (!A.ground) {
      A.vy = Math.min(A.vy + GRAVITY * 1.2 * d, 900);
      A.y += A.vy * d; A.rot += d * 9;
      const floor = V.gy - APPLE_R * 0.8;
      if (A.y > floor) {
        A.y = floor;
        if (A.vy > 250) { A.vy *= -0.35; A.sq = 0.9; if (!S.demo) Sfx.bonk(); shake(5); }
        else { A.ground = true; A.vy = 0; }
      }
    }
    S.deadT += dt;
    if (S.mode === 'dead' && S.deadT > (S.demo ? 1.2 : 1.0)) {
      if (S.demo) newRun(true); else { S.mode = 'over'; endRun(); }
    }
  }
  // gezichtje
  const np = nextPipe();
  A.look = np ? Math.atan2(np.gy - A.y, np.x + PIPE_W / 2 - A.x) : 0;
  const danger = np && Math.abs(np.x + PIPE_W / 2 - A.x) < 95 && Math.abs(A.y - np.gy) > np.gap / 2 - 30;
  A.mood = !A.alive ? 'dead' : danger && !S.pow.star && !S.pow.rocket ? 'scared' : (A.vy < -150 || S.pow.star || S.mode === 'ready') ? 'yay' : 'happy';
  A.cool = !!(S.pow.star || S.pow.rocket);

  // spoor
  for (const p of S.trail) p.x -= speed * d;
  S.trailT -= dt;
  if (S.trailT <= 0 && A.alive) {
    S.trailT = 1 / 60;
    S.trail.push({ x: A.x - 8, y: A.y });
    if (S.trail.length > 26) S.trail.shift();
    trailFx();
  }
  if (!A.alive && S.trail.length) S.trail.shift();
  if (S.demo && S.mode === 'demo') { S.demoT += dt; if (S.demoT > 7) { S.demoT = 0; nextTheme(); } }
  updateParts(d);
}
function trailFx() {
  const A = S.A, sk = skin();
  if (S.pow.rocket > 0) {
    for (let i = 0; i < 3; i++) spawn({ x: A.x - 20, y: A.y + rand(-6, 6), vx: rand(-420, -250), vy: rand(-40, 40), s: rand(5, 10), c: pick(['#ffe14d', '#ff9a1f', '#ff4d1f']), type: 'glow', life: 0.35, drag: 2 });
    return;
  }
  if (S.pow.star > 0) { spawn({ x: A.x - 10, y: A.y + rand(-10, 10), vx: rand(-200, -100), vy: rand(-40, 40), s: rand(4, 7), c: hsl(Math.random() * 360, 100, 65), type: 'star', life: 0.6 }); return; }
  if (Math.random() > 0.4 || sk.trail === 'rainbow') return;
  const o = { x: A.x - 16, y: A.y + rand(-8, 8), vx: rand(-120, -60), vy: rand(-20, 20), life: 0.7, drag: 2 };
  switch (sk.trail) {
    case 'spark': spawn(Object.assign(o, { s: rand(2, 4), c: 'rgba(255,255,255,0.9)', type: 'star' })); break;
    case 'leaf': spawn(Object.assign(o, { s: 4, c: '#8fe03a', type: 'leaf', g: 80 })); break;
    case 'heart': spawn(Object.assign(o, { s: 5, c: '#ff6fb5', type: 'heart', vy: -40 })); break;
    case 'gold': spawn(Object.assign(o, { s: rand(3, 5), c: pick(['#ffe14d', '#fff6b0', '#ffc928']), type: 'star' })); break;
    case 'snow': spawn(Object.assign(o, { s: rand(2, 4), c: '#e8fbff', type: 'dot', g: 60 })); break;
    case 'stars': spawn(Object.assign(o, { s: rand(3, 6), c: pick(['#b28bff', '#ff8af0', '#fff']), type: 'star' })); break;
  }
}
function collide() {
  const A = S.A, r = HIT_R * A.s;
  const tough = S.pow.star > 0 || S.pow.rocket > 0;
  for (const p of S.pipes) {
    if (p.smashed) { if (!p.passed && p.x + PIPE_W / 2 < A.x) passPipe(p); continue; }
    if (p.x - CAP_OVER > A.x + r || p.x + PIPE_W + CAP_OVER < A.x - r) { if (!p.passed && p.x + PIPE_W / 2 < A.x) passPipe(p); continue; }
    if (hitPipe(p, r)) {
      if (tough) smash(p);
      else if (S.inv > 0) { /* even onkwetsbaar */ }
      else if (S.shields > 0) {
        S.shields--; smash(p); S.inv = 1;
        if (!S.demo) { Sfx.shield(); pop(A.x + 30, A.y - 60, '🛡️ SCHILD!', '#7fd4ff', 28); flash('#7fd4ff', 0.3); }
      } else { die(false); return; }
    }
    if (!p.passed && p.x + PIPE_W / 2 < A.x) passPipe(p);
  }
  // grond
  if (A.y + APPLE_R * 0.75 * A.s > V.gy) {
    if (tough || S.inv > 0 || S.shields > 0) {
      if (!tough && S.inv <= 0) { S.shields--; S.inv = 1; if (!S.demo) { Sfx.shield(); pop(A.x, A.y - 50, '🛡️ BOING!', '#7fd4ff', 26); } }
      A.y = V.gy - APPLE_R * 0.75 * A.s; A.vy = -flapV() * 1.1; A.sq = 0.8;
    } else { die(true); return; }
  }
  // pitten
  const reach = HIT_R + 16 + (S.demo ? 0 : upEff('magnet')), mag = S.pow.magnet > 0 ? 230 : reach * 1.8;
  S.pitT -= 1 / 120;
  if (S.pitT < 0) S.pitStreak = 0;
  for (const c of S.pits) {
    const dx = A.x - c.x, dy = A.y - c.y, dd = Math.hypot(dx, dy);
    if (dd < mag && !c.mag) c.mag = true;
    if (c.mag) { c.x += dx * 0.12; c.y += dy * 0.12; c.pipe = null; }
    if (dd < reach) {
      c.got = true;
      const v = S.pow.double > 0 ? 2 : 1;
      S.coins += v;
      if (S.demo) continue;
      S.pitStreak++; S.pitT = 0.7;
      Sfx.pit(S.pitStreak);
      burst(c.x, c.y, 8, { type: 'star', c: ['#ffe14d', '#fff6b0'], min: 60, max: 180, life: 0.5, smin: 2, smax: 4 });
      pop(c.x, c.y - 14, '+' + v, '#ffe14d', 16, { life: 0.6, max: 0.6 });
    }
  }
  for (const b of S.bubbles) {
    if (Math.hypot(A.x - b.x, A.y - b.y) < 24 + r + 8) {
      b.got = true;
      givePower(b.type, POWERS[b.type].dur);
      if (!S.demo) burst(b.x, b.y, 16, { type: 'dot', c: '#fff', min: 100, max: 260, life: 0.5 });
    }
  }
}
// de appel in het menu speelt zelf
function demoAI() {
  const A = S.A, p = nextPipe(), target = p ? p.gy + 14 : midY();
  if (A.y > target && A.vy > -40) flap();
}

function endRun() {
  const earned = Math.round((S.coins + S.score) * upEff('value'));
  const rec = S.score > save.best;
  save.pitten += earned; save.runs++; save.total += S.score;
  if (rec) save.best = S.score;
  S.record = rec;
  persist();
  if (rec) { Sfx.record(); for (let i = 0; i < 5; i++) burst(rand(V.w * 0.15, V.w * 0.85), rand(60, V.gy * 0.6), 40, { type: i % 2 ? 'conf' : 'star', c: 'rainbow', min: 80, max: 340, life: 1.6, g: 200 }); }
  else Sfx.over();
  uiGameOver({ score: S.score, best: save.best, earned, rec, coins: S.coins, n: S.n });
  try { lbSubmit().catch(() => { /* later opnieuw */ }); } catch (e) { /* */ }
}
