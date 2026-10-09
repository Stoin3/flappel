'use strict';
// Flappel · beeld
// Schermformaat, de scène samenstellen (met stijlwissel en pixelstijl) en de HUD.

const cv = $('cv'), ctx = cv.getContext('2d');
let V = { cw: 800, ch: 600, dpr: 1, scale: 1, w: 800, h: 600, gy: 536 };
const PX = 3.2;                       // pixelstijl: zoveel wereld-eenheden per pixel
const pix = { c: document.createElement('canvas'), ctx: null };
pix.ctx = pix.c.getContext('2d');
let dprK = 1;                         // zakt als het beeld te traag is (zie perfCheck)
function viewResize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const dpr = Math.max(0.6, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / (cw * ch))) * dprK);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const scale = Math.min(ch / WORLD_H, cw / WORLD_MIN_W);
  V = { cw, ch, dpr, scale, w: cw / scale, h: ch / scale, gy: ch / scale - GROUND_H };
  RES = scale * dpr;
  for (const k in SPR) if (k.includes('@')) delete SPR[k];
  pix.c.width = Math.ceil(V.w / PX); pix.c.height = Math.ceil(V.h / PX);
  pix.ctx.__fuzz = null; pix.ctx.__skin = null;
  vignette = null;
  if (S.A) { S.A.x = appleX(); if (S.mode === 'ready') S.A.y = midY(); }
}
let vignette = null;
function vignetteImg() {
  if (vignette) return vignette;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 70, 128, 128, 182);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,0,30,0.38)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return (vignette = c);
}

// alles wat bij één stijl hoort
function drawWorld(c, th, P) {
  const A = S.A;
  BG[th.id](c, V, S.D, S.t, P);
  for (const p of S.pipes) if (!p.smashed && p.x < V.w + 30 && p.x + PIPE_W > -30) drawPipe(c, p, th, A, S.t, P, V);
  for (const p of S.pits) if (p.x < V.w + 20) drawPit(c, p, S.t);
  for (const b of S.bubbles) if (b.x < V.w + 40) drawBubble(c, b, S.t);
  GROUND[th.id](c, V, S.D, S.t, P);
  const sk = skin();
  if (S.pow.star > 0 || sk.trail === 'rainbow' || S.pow.rocket > 0) drawTrail(c, true, S.pow.rocket > 0);
  drawParts(c);
  if (A) {
    if (S.pow.star > 0 || S.pow.rocket > 0) { // gloed
      const r = 44 + Math.sin(S.rt * 20) * 4;
      const g = c.createRadialGradient(A.x, A.y, 4, A.x, A.y, r);
      g.addColorStop(0, S.pow.rocket > 0 ? 'rgba(255,170,60,0.6)' : hsl((S.rt * 400) % 360, 100, 70, 0.6)); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(A.x, A.y, r, 0, TAU); c.fill();
    }
    if (S.shields > 0 && A.alive) { // schildbel
      c.strokeStyle = `rgba(127,212,255,${0.5 + Math.sin(S.rt * 5) * 0.2})`; c.lineWidth = 3;
      c.beginPath(); c.arc(A.x, A.y, APPLE_R * A.s + 10, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(127,212,255,0.12)'; c.fill();
    }
    const blinkInv = S.inv > 0 && A.alive && Math.floor(S.rt * 14) % 2 === 0;
    c.globalAlpha = blinkInv ? 0.45 : 1;
    const wing = A.wingP < 1 ? A.wingP : 0.12 + Math.sin(S.rt * 9) * 0.1;
    drawApple(c, { x: A.x, y: A.y, rot: A.rot, s: A.s, wing, sq: A.sq, mood: A.mood, look: A.look, blink: A.blink, cool: A.cool }, sk, S.rt);
    c.globalAlpha = 1;
  }
}
function drawThemed(th, P) {
  if (th.pixel) {
    const pc = pix.ctx;
    pc.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
    pc.imageSmoothingEnabled = false;
    drawWorld(pc, th, P);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pix.c, 0, 0, pix.c.width * PX, pix.c.height * PX);
    ctx.imageSmoothingEnabled = true;
  } else drawWorld(ctx, th, P);
}

function render() {
  const P = Music.pulse() * (save.calm ? 0.3 : 1);
  const sh = S.shake;
  const sx = sh ? (Math.random() * 2 - 1) * sh : 0, sy = sh ? (Math.random() * 2 - 1) * sh : 0;
  // lichte zoom op de maat van de muziek, en bij een punt
  const z = 1 + (S.mode === 'play' ? P * 0.006 + S.scorePop * 0.012 : 0);
  const cx = V.w / 2, cy = V.h / 2;
  ctx.setTransform(RES * z, 0, 0, RES * z, (cx * (1 - z) + sx) * RES, (cy * (1 - z) + sy) * RES);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const tr = S.trans;
  if (tr) {
    const e = easeInOut(Math.min(1, tr.t / tr.dur)), R = e * Math.hypot(V.w, V.h) * 1.05;
    drawThemed(THEMES[tr.from], P);
    ctx.save(); ctx.beginPath(); ctx.arc(tr.x, tr.y, R, 0, TAU); ctx.clip();
    drawThemed(THEMES[tr.to], P);
    ctx.restore();
    // regenboogring op de rand
    ctx.lineWidth = 7;
    for (let i = 0; i < 5; i++) { ctx.strokeStyle = hsl((i * 60 + S.rt * 500) % 360, 100, 62, 1 - e * 0.6); ctx.beginPath(); ctx.arc(tr.x, tr.y, Math.max(1, R - i * 7), 0, TAU); ctx.stroke(); }
  } else drawThemed(curTheme(), P);
  drawPops(ctx);
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  effects(P);
  hud(P);
}

// schermvullende effecten
function effects(P) {
  const k = save.calm ? 0.4 : 1;
  if (S.pow.slow > 0 || S.tk < 0.95) {
    const a = (1 - S.tk) / 0.45 * 0.28;
    ctx.fillStyle = `rgba(60,160,255,${a})`; ctx.fillRect(0, 0, V.w, V.h);
  }
  if (S.pow.rocket > 0) { // snelheidslijnen
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const y = hash(i, 3) * V.h, len = 80 + hash(i, 4) * 160, x = mod(hash(i, 5) * V.w * 2 - S.rt * (1400 + hash(i, 6) * 900), V.w + len * 2) - len;
      ctx.moveTo(x, y); ctx.lineTo(x + len, y);
    }
    ctx.stroke();
  }
  if (S.pow.star > 0) { // regenboogrand
    ctx.lineWidth = 14 * k;
    ctx.strokeStyle = hsl((S.rt * 300) % 360, 100, 60, 0.45);
    ctx.strokeRect(0, 0, V.w, V.h);
  }
  ctx.drawImage(vignetteImg(), 0, 0, V.w, V.h);
  if (S.flash > 0) { ctx.globalAlpha = Math.min(1, S.flash) * 0.8; ctx.fillStyle = S.flashC; ctx.fillRect(0, 0, V.w, V.h); ctx.globalAlpha = 1; }
}

function outlined(text, x, y, size, fill, stroke, lw) {
  ctx.font = `${size}px "Lilita One", system-ui, sans-serif`;
  ctx.lineJoin = 'round'; ctx.lineWidth = lw || size * 0.18; ctx.strokeStyle = stroke || 'rgba(30,10,40,0.9)';
  ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function hud(P) {
  if (S.demo) return;
  const th = curTheme(), live = S.mode === 'play' || S.mode === 'ready' || S.mode === 'dead' || S.mode === 'pause';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (live) {
    // score
    const s = 1 + easeOut(S.scorePop) * 0.35;
    ctx.save(); ctx.translate(V.w / 2, 62); ctx.scale(s, s);
    outlined(String(S.score), 0, 0, 62, '#fff', 'rgba(30,10,40,0.92)', 12);
    ctx.restore();
    // voortgang naar de volgende stijl
    const done = S.n % THEME_EVERY, bw = 13;
    for (let i = 0; i < THEME_EVERY; i++) {
      const x = V.w / 2 + (i - (THEME_EVERY - 1) / 2) * bw * 1.35, y = 108;
      ctx.fillStyle = i < done ? hsl((i * 45 + S.rt * 120) % 360, 100, 62) : 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x, y, i < done ? 5 + (i === done - 1 ? S.scorePop * 3 : 0) : 3.5, 0, TAU); ctx.fill();
    }
    // pitten en schilden
    ctx.textAlign = 'left';
    ctx.drawImage(pitSprite(), 10, 10, 40, 40);
    outlined(String(S.coins), 50, 31, 28, '#ffe14d');
    let hx = 14;
    for (let i = 0; i < S.shields; i++) { ctx.font = '22px system-ui'; ctx.fillText('🛡️', hx, 70); hx += 28; }
    for (let i = 0; i < S.revives; i++) { ctx.font = '22px system-ui'; ctx.fillText('❤️', hx, 70); hx += 28; }
    // actieve power-ups met een klokje
    let py = 106;
    for (const k of POWER_IDS) {
      if (!(S.pow[k] > 0)) continue;
      const pw = POWERS[k], f = S.pow[k] / (S.powMax[k] || 1);
      ctx.fillStyle = 'rgba(20,0,40,0.45)'; ctx.beginPath(); ctx.arc(32, py, 20, 0, TAU); ctx.fill();
      ctx.strokeStyle = pw.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(32, py, 20, -Math.PI / 2, -Math.PI / 2 + f * TAU); ctx.stroke();
      ctx.textAlign = 'center'; ctx.font = '20px "Lilita One", system-ui';
      if (k === 'double') outlined('×2', 32, py + 1, 18, '#3dff8b'); else { ctx.fillStyle = '#fff'; ctx.fillText(pw.icon, 32, py + 1); }
      ctx.textAlign = 'left';
      py += 48;
    }
    ctx.textAlign = 'center';
  }
  if (S.mode === 'ready') {
    const y = V.gy * 0.7 + Math.sin(S.rt * 4) * 5;
    outlined('TIK OM TE FLADDEREN!', V.w / 2, y, 30, '#fff');
    ctx.font = '40px system-ui'; ctx.fillText('👆', V.w / 2 + Math.sin(S.rt * 8) * 4, y + 52 - Math.abs(Math.sin(S.rt * 6)) * 12);
    outlined('of druk op spatie', V.w / 2, y + 96, 16, 'rgba(255,255,255,0.9)', 'rgba(30,10,40,0.7)', 4);
    if (S.n === 0) outlined(`${th.emoji} ${th.name}`, V.w / 2, V.gy * 0.18, 26, th.glow);
  }
  // stijlbanner
  const b = S.banner;
  if (b) {
    const t = b.t, inK = easeElastic(Math.min(1, t / 0.7)), out = t > 1.9 ? 1 - (t - 1.9) / 0.5 : 1;
    ctx.save(); ctx.globalAlpha = clamp(out, 0, 1);
    ctx.translate(V.w / 2, V.gy * 0.3); ctx.scale(inK, inK); ctx.rotate(Math.sin(t * 6) * 0.04);
    outlined('NIEUWE STIJL!', 0, -40, 22, '#fff');
    ctx.font = '54px system-ui'; ctx.fillText(b.th.emoji, 0, 8);
    const size = Math.min(46, V.w / (b.th.name.length * 0.62));
    ctx.lineWidth = size * 0.3; ctx.strokeStyle = hsl((S.rt * 300) % 360, 100, 55); ctx.font = `${size}px "Lilita One", system-ui`; ctx.lineJoin = 'round';
    ctx.strokeText(b.th.name.toUpperCase(), 0, 64);
    ctx.fillStyle = '#fff'; ctx.fillText(b.th.name.toUpperCase(), 0, 64);
    ctx.restore();
  }
}
