'use strict';
// Flappel · achtergronden en grond per stijl
// Alles is 'staatloos': elke laag is een functie van de afstand (D), de tijd (t) en de muziekpuls (P),
// zodat twee stijlen tegelijk getekend kunnen worden tijdens een stijlwissel.

// ---- hulpjes ----
let ctxIds = 0;
const gradCache = new Map();
function vgrad(ctx, key, y0, y1, stops) {
  if (!ctx.__id) ctx.__id = ++ctxIds;
  const k = ctx.__id + key + '|' + (y0 | 0) + '|' + (y1 | 0) + '|' + stops.join();
  let g = gradCache.get(k);
  if (!g) {
    g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => Array.isArray(c) ? g.addColorStop(c[0], c[1]) : g.addColorStop(i / (stops.length - 1), c));
    if (gradCache.size > 300) gradCache.clear();
    gradCache.set(k, g);
  }
  return g;
}
function sky(ctx, V, key, stops, y1) { ctx.fillStyle = vgrad(ctx, key, 0, y1 || V.gy, stops); ctx.fillRect(-2, -2, V.w + 4, (y1 || V.gy) + 4); }
// herhaalde objecten met parallax: fn(schermX, index, willekeur 0..1)
function repeatX(V, D, f, spacing, margin, fn) {
  const off = D * f, k0 = Math.floor((off - margin) / spacing), k1 = Math.ceil((off + V.w + margin) / spacing);
  for (let k = k0; k <= k1; k++) fn(k * spacing - off, k, hash(k, spacing | 0));
}
// heuvels: som van sinussen
function hills(ctx, V, D, f, base, amp, freq, color, seed, sharp) {
  const off = D * f;
  ctx.beginPath(); ctx.moveTo(-5, V.gy + 5);
  for (let x = -5; x <= V.w + 15; x += 12) {
    const u = (x + off) * freq + seed;
    let y = Math.sin(u) * 0.6 + Math.sin(u * 2.13 + 1.7) * 0.28 + Math.sin(u * 0.47 + 4) * 0.5;
    if (sharp) y = 1 - Math.abs(Math.sin(u * 0.9)) * 1.6 + Math.sin(u * 3.1) * 0.12;
    ctx.lineTo(x, base - y * amp);
  }
  ctx.lineTo(V.w + 15, V.gy + 5); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}
function cloud(ctx, x, y, s, color, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [dx, dy, r] of [[0, 0, 22], [24, -12, 26], [52, -2, 20], [30, 8, 20], [70, 6, 15]]) { ctx.moveTo(x + (dx + r) * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
  ctx.fill();
  ctx.globalAlpha = 1;
}
// staatloze deeltjes: n stuks die rondgaan over het scherm
function ambient(V, n, seed, t, vx, vy, fn) {
  const W = V.w + 80, H = V.gy + 80;
  for (let i = 0; i < n; i++) {
    const a = hash(i, seed), b = hash(i, seed + 1), c = hash(i, seed + 2);
    const x = mod(a * W + t * vx * (0.6 + c * 0.8), W) - 40, y = mod(b * H + t * vy * (0.6 + c * 0.8), H) - 40;
    fn(x, y, c, i);
  }
}
// stroken van de grond (zoals in het origineel: schuine streepjes die meelopen met de buizen)
function stripes(ctx, V, D, y, h, c1, c2, sw) {
  ctx.fillStyle = c1; ctx.fillRect(-2, y, V.w + 4, h);
  ctx.fillStyle = c2;
  const off = mod(D, sw * 2);
  ctx.beginPath();
  for (let x = -off - sw * 2; x < V.w + sw * 2; x += sw * 2) { ctx.moveTo(x, y + h); ctx.lineTo(x + sw, y + h); ctx.lineTo(x + sw + h * 0.6, y); ctx.lineTo(x + h * 0.6, y); }
  ctx.fill();
}
// bibberende potloodlijn (Tekenland)
function wobble(ctx, pts, seed, amp, close) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const jx = (hash(i, seed) - 0.5) * amp, jy = (hash(i, seed + 3) - 0.5) * amp;
    if (i) ctx.lineTo(p[0] + jx, p[1] + jy); else ctx.moveTo(p[0] + jx, p[1] + jy);
  });
  if (close) ctx.closePath();
}
function circlePts(x, y, r, n) { const p = []; for (let i = 0; i <= n; i++) p.push([x + Math.cos(i / n * TAU) * r, y + Math.sin(i / n * TAU) * r]); return p; }
const calmK = () => save.calm ? 0.35 : 1;

// sprites die je niet elk beeld opnieuw wilt tekenen
const SPR = {};
function sprite(key, w, h, draw) {
  if (SPR[key]) return SPR[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return (SPR[key] = c);
}

// =====================================================================
//  De stijlen
// =====================================================================
const BG = {};
const GROUND = {};

// ---- Zonnige Boomgaard ----
BG.boomgaard = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#2fa8ff', '#7fd4ff', '#d4f6ff']);
  // zon met draaiende stralen en een gezichtje
  const sx = V.w * 0.8, sy = 100, sr = 46 + P * 3 * calmK();
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.15);
  ctx.fillStyle = 'rgba(255,250,190,0.22)';
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -260); ctx.lineTo(22, -260); ctx.fill(); }
  ctx.restore();
  const sg = ctx.createRadialGradient(sx - 12, sy - 12, 4, sx, sy, sr);
  sg.addColorStop(0, '#fffbe0'); sg.addColorStop(0.6, '#ffe45c'); sg.addColorStop(1, '#ffb92e');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a00';
  ctx.beginPath(); ctx.arc(sx - 14, sy - 6, 4, 0, TAU); ctx.arc(sx + 14, sy - 6, 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(sx, sy + 4, 12, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,80,0.45)'; ctx.beginPath(); ctx.arc(sx - 24, sy + 6, 6, 0, TAU); ctx.arc(sx + 24, sy + 6, 6, 0, TAU); ctx.fill();
  repeatX(V, D, 0.06, 240, 120, (x, k, r) => cloud(ctx, x, 50 + r * 130, 0.6 + hash(k, 3) * 0.5, '#fff', 0.85));
  hills(ctx, V, D, 0.12, V.gy - 150, 40, 0.008, '#a5e08a', 1);
  repeatX(V, D, 0.14, 330, 120, (x, k, r) => cloud(ctx, x, 90 + r * 160, 0.9 + hash(k, 4) * 0.5, '#fff', 0.95));
  hills(ctx, V, D, 0.25, V.gy - 80, 34, 0.011, '#6cc957', 5);
  // appelboompjes
  repeatX(V, D, 0.25, 110, 60, (x, k, r) => {
    if (r < 0.35) return;
    const u = (x + D * 0.25) * 0.011 + 5;
    const by = V.gy - 80 - (Math.sin(u) * 0.6 + Math.sin(u * 2.13 + 1.7) * 0.28 + Math.sin(u * 0.47 + 4) * 0.5) * 34;
    const s = 0.7 + hash(k, 9) * 0.5;
    ctx.fillStyle = '#7a4a1f'; ctx.fillRect(x - 4 * s, by - 34 * s, 8 * s, 38 * s);
    ctx.fillStyle = '#3e9b34'; ctx.beginPath(); ctx.arc(x, by - 44 * s, 24 * s, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x - 16 * s, by - 34 * s, 16 * s, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + 16 * s, by - 34 * s, 16 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#56b847'; ctx.beginPath(); ctx.arc(x - 6 * s, by - 50 * s, 13 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff3b3b';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + (hash(k, 20 + i) - 0.5) * 40 * s, by - 34 * s - hash(k, 30 + i) * 22 * s, 3.4 * s, 0, TAU); ctx.fill(); }
  });
  hills(ctx, V, D, 0.5, V.gy - 18, 16, 0.02, '#4fb43f', 9);
  // dwarrelende blaadjes
  ambient(V, 14, 11, t, -40, 22, (x, y, c, i) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (1 + c) + i);
    ctx.fillStyle = i % 3 ? '#ffb3d1' : '#7fd04f';
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.fill(); ctx.restore();
  });
};
GROUND.boomgaard = (ctx, V, D) => {
  stripes(ctx, V, D, V.gy, 16, '#7ee05a', '#62c443', 18);
  ctx.fillStyle = '#4a9a2e'; ctx.fillRect(-2, V.gy + 16, V.w + 4, 4);
  ctx.fillStyle = vgrad(ctx, 'dirt', V.gy + 20, V.h, ['#e6c07a', '#c98b4a']); ctx.fillRect(-2, V.gy + 20, V.w + 4, V.h - V.gy);
  repeatX(V, D, 1, 37, 20, (x, k, r) => { ctx.fillStyle = r < 0.5 ? '#b77a3d' : '#f1d295'; ctx.beginPath(); ctx.ellipse(x, V.gy + 30 + r * 26, 4 + r * 3, 2.5, 0, 0, TAU); ctx.fill(); });
  repeatX(V, D, 1, 53, 20, (x, k, r) => {
    if (r < 0.5) return;
    ctx.fillStyle = '#3f9e35'; ctx.fillRect(x - 1, V.gy - 8, 2, 9);
    ctx.fillStyle = ['#fff', '#ffe14d', '#ff7ab8'][mod(k, 3)];
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i / 5 * TAU) * 3.4, V.gy - 10 + Math.sin(i / 5 * TAU) * 3.4, 2.4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.arc(x, V.gy - 10, 2, 0, TAU); ctx.fill();
  });
};

// ---- Zonsondergang ----
BG.zonsondergang = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#1f0b45', '#5e1f7a', '#c23b7e', '#ff7a4d', '#ffcf6b']);
  const sx = V.w * 0.55, sy = V.gy - 120, sr = 105 + P * 4 * calmK();
  const halo = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3);
  halo.addColorStop(0, 'rgba(255,220,120,0.55)'); halo.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = halo; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  ctx.fillStyle = vgrad(ctx, 'sun', sy - sr, sy + sr, ['#fff6c2', '#ffb347', '#ff5e7a']);
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  repeatX(V, D, 0.04, 300, 200, (x, k, r) => {
    ctx.fillStyle = r < 0.5 ? 'rgba(255,150,190,0.55)' : 'rgba(255,190,140,0.5)';
    rrect(ctx, x, 40 + r * 180, 160 + r * 120, 10 + r * 8, 8); ctx.fill();
  });
  hills(ctx, V, D, 0.08, V.gy - 140, 70, 0.006, '#6b2f78', 2, true);
  hills(ctx, V, D, 0.18, V.gy - 90, 60, 0.009, '#4a1d5e', 7, true);
  // vogeltjes
  repeatX(V, D, 0.2, 160, 60, (x, k, r) => {
    if (r < 0.55) return;
    const y = 80 + hash(k, 2) * 150, fl = Math.sin(t * 8 + k) * 5;
    ctx.strokeStyle = '#2a0f3f'; ctx.lineWidth = 2.2; ctx.beginPath();
    ctx.moveTo(x - 9, y - fl); ctx.quadraticCurveTo(x - 4, y - 3, x, y); ctx.quadraticCurveTo(x + 4, y - 3, x + 9, y - fl); ctx.stroke();
  });
  hills(ctx, V, D, 0.4, V.gy - 30, 30, 0.014, '#2a0f3f', 4, true);
  ctx.globalCompositeOperation = 'lighter';
  ambient(V, 18, 21, t, -15, -8, (x, y, c, i) => {
    const a = (Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5) * 0.8;
    ctx.fillStyle = `rgba(255,230,120,${a})`; ctx.beginPath(); ctx.arc(x, y, 2 + c * 2, 0, TAU); ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
};
GROUND.zonsondergang = (ctx, V, D) => {
  stripes(ctx, V, D, V.gy, 16, '#5a2370', '#47195c', 18);
  ctx.fillStyle = '#ff9d4a'; ctx.fillRect(-2, V.gy, V.w + 4, 2);
  ctx.fillStyle = vgrad(ctx, 'dirt', V.gy + 16, V.h, ['#2e0f40', '#160624']); ctx.fillRect(-2, V.gy + 16, V.w + 4, V.h - V.gy);
  repeatX(V, D, 1, 41, 20, (x, k, r) => { ctx.fillStyle = 'rgba(255,140,90,0.25)'; ctx.fillRect(x, V.gy + 26 + r * 30, 14 + r * 10, 3); });
};

// ---- Onderwaterwereld ----
BG.onderwater = (ctx, V, D, t) => {
  sky(ctx, V, 'bg', ['#8ff0ff', '#2aa6e0', '#0f5a9e', '#082f63']);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = mod(i * 190 - D * 0.05, V.w + 300) - 150, sw = Math.sin(t * 0.6 + i) * 40;
    ctx.fillStyle = 'rgba(200,255,255,0.07)';
    ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + 70, -10); ctx.lineTo(x + 160 + sw, V.gy); ctx.lineTo(x + 40 + sw, V.gy); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // walvis in de verte
  repeatX(V, D, 0.05, 1400, 300, (x, k) => {
    const y = 140 + hash(k, 5) * 100 + Math.sin(t * 0.5) * 8;
    ctx.fillStyle = 'rgba(10,60,110,0.55)';
    ctx.beginPath(); ctx.ellipse(x, y, 120, 42, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 100, y); ctx.lineTo(x + 170, y - 30 + Math.sin(t * 2) * 8); ctx.lineTo(x + 165, y + 26 + Math.sin(t * 2) * 8); ctx.fill();
    ctx.fillStyle = 'rgba(180,230,255,0.6)'; ctx.beginPath(); ctx.arc(x - 80, y - 8, 4, 0, TAU); ctx.fill();
  });
  hills(ctx, V, D, 0.12, V.gy - 70, 50, 0.008, '#0d4f86', 3);
  // visjes
  for (let s = 0; s < 3; s++) {
    const f = 0.2 + s * 0.15;
    repeatX(V, D + t * (20 + s * 10) / f, f, 220 + s * 60, 60, (fx, k, r) => {
      if (r < 0.4) return;
      const y = 70 + hash(k, s + 40) * (V.gy - 160) + Math.sin(t * 2 + k) * 10;
      const col = ['#ffb13d', '#ff5ea8', '#5effc8'][mod(k, 3)];
      ctx.fillStyle = col; ctx.globalAlpha = 0.55 + s * 0.2;
      ctx.beginPath(); ctx.ellipse(fx, y, 10 + s * 3, 6 + s * 2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + 8 + s * 3, y); ctx.lineTo(fx + 18 + s * 4, y - 6 - s); ctx.lineTo(fx + 18 + s * 4, y + 6 + s); ctx.fill();
      ctx.fillStyle = '#082f63'; ctx.beginPath(); ctx.arc(fx - 5 - s, y - 1, 1.6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  // zeewier
  repeatX(V, D, 0.6, 70, 40, (x, k, r) => {
    if (r < 0.3) return;
    const hgt = 40 + r * 90;
    ctx.strokeStyle = r < 0.6 ? '#1f9e5a' : '#2bc47a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, V.gy + 4);
    for (let i = 1; i <= 6; i++) ctx.lineTo(x + Math.sin(t * 1.5 + i * 0.8 + k) * i * 2.4, V.gy - hgt * i / 6);
    ctx.stroke();
  });
  ambient(V, 26, 31, t, -10, -45, (x, y, c) => {
    ctx.strokeStyle = 'rgba(220,255,255,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + c * 9) * 4, y, 2 + c * 5, 0, TAU); ctx.stroke();
  });
};
GROUND.onderwater = (ctx, V, D, t) => {
  ctx.fillStyle = vgrad(ctx, 'sand', V.gy, V.h, ['#ffe4a8', '#e0b46a']); ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.fillStyle = '#f5d08a';
  repeatX(V, D, 1, 30, 20, (x, k, r) => { ctx.beginPath(); ctx.ellipse(x, V.gy + 1, 16, 4 + r * 3, 0, 0, TAU); ctx.fill(); });
  repeatX(V, D, 1, 90, 30, (x, k, r) => {
    if (r < 0.5) { // zeester
      ctx.fillStyle = '#ff7a5c'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.3, rr = i % 2 ? 4 : 10; ctx.lineTo(x + Math.cos(a) * rr, V.gy + 26 + r * 20 + Math.sin(a) * rr); }
      ctx.fill();
    } else { ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.arc(x, V.gy + 30 + r * 10, 6, Math.PI, 0); ctx.fill(); }
  });
};

// ---- Synthwave ----
function synthSun() {
  return sprite('synthsun', 256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff36b'); g.addColorStop(0.5, '#ff9a3d'); g.addColorStop(1, '#ff2fa0');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, TAU); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) { const y = 140 + i * 15, hh = 2 + i * 1.3; c.fillRect(0, y, w, hh); }
  });
}
BG.synthwave = (ctx, V, D, t, P) => {
  const hy = V.gy - 150;
  sky(ctx, V, 'bg', ['#07001a', '#250a55', '#7a1a8a', '#ff3d8e'], hy);
  ambient(V, 40, 41, t, -3, 0, (x, y, c, i) => {
    if (y > hy - 40) return;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))})`; ctx.fillRect(x, y, 1.6 + c, 1.6 + c);
  });
  const sr = 125 + P * 6 * calmK();
  ctx.drawImage(synthSun(), V.w * 0.5 - sr, hy - sr * 1.15, sr * 2, sr * 2);
  // bergen met neonrand
  for (const [f, base, amp, col, seed] of [[0.06, hy, 90, '#2a0a52', 3], [0.12, hy, 55, '#1a0638', 8]]) {
    const off = D * f;
    ctx.beginPath(); ctx.moveTo(-5, hy + 2);
    for (let x = -5; x <= V.w + 15; x += 14) { const u = (x + off) * 0.01 + seed; ctx.lineTo(x, base - Math.max(0, 1 - Math.abs(Math.sin(u)) * 1.7 + Math.sin(u * 3.3) * 0.15) * amp); }
    ctx.lineTo(V.w + 15, hy + 2); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#ff3df5'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // neonraster
  ctx.fillStyle = vgrad(ctx, 'floor', hy, V.gy, ['#1a0035', '#0a0018']); ctx.fillRect(-2, hy, V.w + 4, V.gy - hy + 2);
  const H = V.gy - hy, glow = 0.55 + P * 0.45 * calmK();
  ctx.strokeStyle = `rgba(255,61,245,${glow})`; ctx.lineWidth = 1.5;
  ctx.beginPath();
  const ph = mod(D * 0.012, 1);
  for (let i = 0; i < 12; i++) { const z = (i + ph) / 12, y = hy + H * z * z; ctx.moveTo(0, y); ctx.lineTo(V.w, y); }
  const vx = V.w / 2, sp = 70, off = mod(D * 0.9, sp);
  for (let i = -16; i <= 16; i++) { const bx = vx + i * sp * 4 - off * 4; ctx.moveTo(vx + (bx - vx) * 0.05, hy); ctx.lineTo(bx, V.gy); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,61,245,0.25)'; ctx.fillRect(-2, hy - 2, V.w + 4, 4);
};
GROUND.synthwave = (ctx, V, D, t, P) => {
  ctx.fillStyle = '#12002a'; ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.fillStyle = `rgba(61,245,255,${0.35 + P * 0.4 * calmK()})`; ctx.fillRect(-2, V.gy - 2, V.w + 4, 8);
  ctx.fillStyle = '#3df5ff'; ctx.fillRect(-2, V.gy, V.w + 4, 3);
  ctx.fillStyle = '#ff3df5';
  repeatX(V, D, 1, 60, 30, x => ctx.fillRect(x, V.gy + 30, 30, 4));
  ctx.fillStyle = 'rgba(61,245,255,0.5)'; ctx.fillRect(-2, V.gy + 58, V.w + 4, 2);
};

// ---- Snoepland ----
BG.snoepland = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#ffc2ea', '#e2b8ff', '#a9e6ff']);
  repeatX(V, D, 0.05, 260, 120, (x, k, r) => cloud(ctx, x, 50 + r * 120, 0.7 + hash(k, 3) * 0.4, r < 0.5 ? '#ffe3f6' : '#d9f3ff', 0.95));
  // snoepheuvels met glazuur
  for (const [f, base, amp, col, seed] of [[0.12, V.gy - 130, 40, '#ff9ad5', 2], [0.25, V.gy - 70, 34, '#c78bff', 6]]) {
    hills(ctx, V, D, f, base, amp, 0.01, col, seed);
    const off = D * f;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let x = -5; x <= V.w + 15; x += 12) {
      const u = (x + off) * 0.01 + seed;
      const y = base - (Math.sin(u) * 0.6 + Math.sin(u * 2.13 + 1.7) * 0.28 + Math.sin(u * 0.47 + 4) * 0.5) * amp;
      ctx.moveTo(x, y - 1); ctx.lineTo(x + 13, y - 1); ctx.lineTo(x + 13, y + 8);
      const drip = hash(Math.floor((x + off) / 12), seed) * 16;
      ctx.arc(x + 6, y + 8 + drip, 5, 0, Math.PI); ctx.lineTo(x, y + 8);
    }
    ctx.fill();
  }
  // lolly's
  repeatX(V, D, 0.4, 150, 60, (x, k, r) => {
    if (r < 0.3) return;
    const y = V.gy - 60 - r * 60, s = 0.8 + hash(k, 2) * 0.6;
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 2.5, y, 5, V.gy - y);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * (k % 2 ? 1 : -1) * 0.8);
    const cols = [['#ff4fa3', '#fff'], ['#4fd8ff', '#fff'], ['#ffdf3d', '#ff6a3d']][mod(k, 3)];
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 22 * s, i / 8 * TAU, (i + 1) / 8 * TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 22 * s, 0, TAU); ctx.stroke();
  });
  ambient(V, 30, 51, t, -20, 40, (x, y, c, i) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i);
    ctx.fillStyle = hsl((i * 47 + t * 40) % 360, 90, 65); ctx.fillRect(-4, -1.3, 8, 2.6); ctx.restore();
  });
};
GROUND.snoepland = (ctx, V, D) => {
  ctx.fillStyle = vgrad(ctx, 'choc', V.gy, V.h, ['#7a4325', '#4a230f']); ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.fillStyle = '#ff8ad8'; ctx.fillRect(-2, V.gy, V.w + 4, 8);
  repeatX(V, D, 1, 24, 20, (x, k, r) => { ctx.beginPath(); ctx.arc(x, V.gy + 8, 6, 0, Math.PI); ctx.fill(); if (r < 0.4) { ctx.fillRect(x - 3, V.gy + 8, 6, 8 + r * 20); ctx.beginPath(); ctx.arc(x, V.gy + 16 + r * 20, 3, 0, TAU); ctx.fill(); } });
  repeatX(V, D, 1, 13, 20, (x, k, r) => {
    ctx.save(); ctx.translate(x, V.gy + 24 + r * 34); ctx.rotate(r * 6);
    ctx.fillStyle = ['#ff4f4f', '#4fd8ff', '#ffe14d', '#7dff6b', '#fff'][mod(k, 5)]; ctx.fillRect(-4, -1.3, 8, 2.6); ctx.restore();
  });
};

// ---- De Ruimte ----
BG.ruimte = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#030110', '#0e0634', '#24104f']);
  ctx.globalCompositeOperation = 'lighter';
  for (const [i, col] of [[0, 'rgba(255,60,160,0.22)'], [1, 'rgba(60,140,255,0.22)'], [2, 'rgba(160,80,255,0.2)']]) {
    const x = mod(i * 500 + 200 - D * 0.02, V.w + 600) - 300, y = 120 + i * 110, r = 260 + i * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  [[0.03, 70, 1.2], [0.08, 45, 1.8], [0.16, 25, 2.6]].forEach(([f, n, s], L) => {
    const off = D * f;
    for (let i = 0; i < n; i++) {
      const x = mod(hash(i, 60 + L) * (V.w + 100) - off, V.w + 100) - 50, y = hash(i, 70 + L) * V.gy;
      ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * (1 + hash(i, 80)) * 2 + i))})`;
      ctx.fillRect(x, y, s, s);
    }
  });
  // planeet met ringen
  repeatX(V, D, 0.04, 1100, 200, (x, k) => {
    const y = 150 + hash(k, 3) * 120, r = 60 + hash(k, 4) * 30, hue = hash(k, 5) * 360;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35);
    ctx.strokeStyle = hsl(hue + 40, 80, 75, 0.7); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 0.45, 0, Math.PI, TAU); ctx.stroke();
    const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, hsl(hue, 75, 70)); g.addColorStop(1, hsl(hue + 30, 70, 35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = hsl(hue, 60, 85, 0.3); ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.14); ctx.fillRect(-r, r * 0.15, r * 2, r * 0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.9, r * 0.45, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
  });
  repeatX(V, D, 0.1, 500, 60, (x, k, r) => {
    const y = 60 + r * 260, rr = 10 + hash(k, 6) * 16;
    ctx.fillStyle = hsl(hash(k, 7) * 360, 50, 60); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(x + rr * 0.3, y + rr * 0.2, rr * 0.85, 0, TAU); ctx.fill();
  });
  // vallende ster
  const st = mod(t, 3.2);
  if (st < 0.6) {
    const n = Math.floor(t / 3.2), x0 = hash(n, 90) * V.w + 200, y0 = 20 + hash(n, 91) * 150, q = st / 0.6;
    const x = x0 - q * 420, y = y0 + q * 200;
    const g = ctx.createLinearGradient(x, y, x + 90, y - 43); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 43); ctx.stroke();
  }
};
GROUND.ruimte = (ctx, V, D) => {
  ctx.fillStyle = vgrad(ctx, 'moon', V.gy, V.h, ['#b5b5d6', '#6a6a8f', '#3e3e5c']); ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  repeatX(V, D, 1, 70, 40, (x, k, r) => {
    ctx.fillStyle = 'rgba(40,40,70,0.35)'; ctx.beginPath(); ctx.ellipse(x, V.gy + 14 + r * 36, 8 + r * 12, 3 + r * 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(x, V.gy + 12 + r * 36, 8 + r * 12, 2, 0, Math.PI, TAU); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-2, V.gy, V.w + 4, 2);
};

// ---- Pixelwereld (wordt op lage resolutie getekend, zie render.js) ----
BG.pixel = (ctx, V, D, t) => {
  ctx.fillStyle = '#5c94fc'; ctx.fillRect(-2, -2, V.w + 4, V.gy + 4);
  repeatX(V, D, 0.08, 230, 100, (x, k, r) => {
    const y = 50 + r * 140;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 66, 18); ctx.fillRect(x + 12, y - 12, 42, 12); ctx.fillRect(x + 24, y - 20, 18, 8);
    ctx.fillStyle = '#9cc4ff'; ctx.fillRect(x, y + 14, 66, 4);
  });
  repeatX(V, D, 0.25, 260, 120, (x, k, r) => { // ronde heuvels
    const hh = 70 + r * 60, w2 = 90 + r * 40;
    ctx.fillStyle = '#00a800'; ctx.beginPath(); ctx.moveTo(x - w2, V.gy); ctx.quadraticCurveTo(x, V.gy - hh * 2, x + w2, V.gy); ctx.fill();
    ctx.fillStyle = '#005800'; ctx.fillRect(x - 6, V.gy - hh * 0.75, 4, 10); ctx.fillRect(x + 8, V.gy - hh * 0.6, 4, 10);
  });
  repeatX(V, D, 0.5, 180, 60, (x, k, r) => { // struikjes
    if (r < 0.4) return;
    ctx.fillStyle = '#80d010';
    ctx.beginPath(); ctx.arc(x, V.gy, 16, Math.PI, 0); ctx.arc(x + 20, V.gy, 20, Math.PI, 0); ctx.arc(x + 42, V.gy, 14, Math.PI, 0); ctx.fill();
  });
  // blok-muntjes met vraagteken
  repeatX(V, D, 0.5, 420, 60, (x, k, r) => {
    if (r < 0.5) return;
    const y = V.gy - 150 - r * 60, b = Math.floor(t * 3) % 3;
    ctx.fillStyle = '#c84c0c'; ctx.fillRect(x - 13, y - 13, 26, 26);
    ctx.fillStyle = ['#ffb800', '#ffd84d', '#e09000'][b]; ctx.fillRect(x - 11, y - 11, 22, 22);
    ctx.fillStyle = '#c84c0c'; ctx.fillRect(x - 4, y - 7, 8, 3); ctx.fillRect(x + 2, y - 5, 3, 6); ctx.fillRect(x - 1, y, 3, 3); ctx.fillRect(x - 1, y + 5, 3, 3);
  });
};
GROUND.pixel = (ctx, V, D) => {
  ctx.fillStyle = '#c84c0c'; ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.fillStyle = '#000';
  const bw = 32, bh = 16;
  for (let row = 0; row * bh < V.h - V.gy; row++) {
    const y = V.gy + row * bh, off = mod(D + (row % 2) * bw / 2, bw);
    ctx.fillRect(-2, y, V.w + 4, 2);
    for (let x = -off; x < V.w + bw; x += bw) ctx.fillRect(x, y, 2, bh);
  }
  ctx.fillStyle = '#fcbcb0'; ctx.fillRect(-2, V.gy, V.w + 4, 3);
};

// ---- Winterwonderland ----
BG.winter = (ctx, V, D, t) => {
  sky(ctx, V, 'bg', ['#04122e', '#0b2c5c', '#245a92', '#6fa8d8']);
  ambient(V, 40, 61, t, -2, 0, (x, y, c, i) => { if (y < V.gy * 0.6) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * Math.abs(Math.sin(t + i))})`; ctx.fillRect(x, y, 1.5, 1.5); } });
  // noorderlicht
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 3; b++) {
    const col = b === 1 ? [176, 107, 255] : [61, 255, 176];
    const base = 80 + b * 40;
    for (let x = -20; x < V.w + 20; x += 10) {
      const u = x * 0.006 + t * 0.4 + b * 2 - D * 0.0004;
      const y = base + Math.sin(u) * 30 + Math.sin(u * 2.7 + b) * 12, hh = 70 + Math.sin(u * 1.7 + t) * 30;
      const a = (0.1 + 0.08 * Math.sin(u * 3 + t * 2)) * calmK() + 0.05;
      const g = ctx.createLinearGradient(0, y, 0, y + hh);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.4, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(x, y, 11, hh);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(V.w * 0.2, 80, 26, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0b2c5c'; ctx.beginPath(); ctx.arc(V.w * 0.2 + 12, 72, 24, 0, TAU); ctx.fill();
  // besneeuwde bergen
  const off = D * 0.08, base = V.gy - 110;
  ctx.beginPath(); ctx.moveTo(-5, V.gy);
  const pts = [];
  for (let x = -5; x <= V.w + 15; x += 14) { const u = (x + off) * 0.008; const y = base - Math.max(0, 1 - Math.abs(Math.sin(u)) * 1.5 + Math.sin(u * 3.1) * 0.12) * 110; pts.push([x, y]); ctx.lineTo(x, y); }
  ctx.lineTo(V.w + 15, V.gy); ctx.fillStyle = '#3d6fa8'; ctx.fill();
  ctx.fillStyle = '#eef8ff'; ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 14 + hash(i + Math.floor(off / 14), 3) * 10 + Math.max(0, (base - pts[i][1]) * 0.35));
  ctx.fill();
  hills(ctx, V, D, 0.2, V.gy - 50, 25, 0.012, '#d6ecff', 3);
  // dennenbomen
  repeatX(V, D, 0.35, 70, 40, (x, k, r) => {
    if (r < 0.35) return;
    const s = 0.7 + hash(k, 2) * 0.7, y = V.gy - 8;
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 3 * s, y - 10 * s, 6 * s, 12 * s);
    for (let i = 0; i < 3; i++) {
      const yy = y - 10 * s - i * 16 * s, ww = (26 - i * 6) * s;
      ctx.fillStyle = '#0f4a4a'; ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x, yy - 26 * s); ctx.lineTo(x + ww, yy); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - ww * 0.45, yy - 14 * s); ctx.lineTo(x, yy - 26 * s); ctx.lineTo(x + ww * 0.45, yy - 14 * s); ctx.fill();
    }
  });
  ambient(V, 45, 71, t, -25, 35, (x, y, c) => { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 2 + c * 10) * 6, y, 1.2 + c * 2.2, 0, TAU); ctx.fill(); });
};
GROUND.winter = (ctx, V, D, t) => {
  ctx.fillStyle = vgrad(ctx, 'snow', V.gy, V.h, ['#ffffff', '#cfe6fb', '#9cc4ea']); ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.fillStyle = 'rgba(120,170,220,0.35)';
  repeatX(V, D, 1, 46, 30, (x, k, r) => { ctx.beginPath(); ctx.ellipse(x, V.gy + 20 + r * 30, 18, 3, 0, 0, TAU); ctx.fill(); });
  repeatX(V, D, 1, 29, 20, (x, k, r) => { const a = Math.max(0, Math.sin(t * 4 + k * 1.3)); if (a > 0.7) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x - 3, V.gy + 10 + r * 40, 6, 1.5); ctx.fillRect(x - 0.75, V.gy + 7 + r * 40, 1.5, 7); } });
};

// ---- Vulkaaneiland ----
BG.vulkaan = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#120303', '#3d0a0a', '#8a1c0c', '#ff6a1f']);
  repeatX(V, D, 0.05, 900, 300, (x, k) => {
    const top = V.gy - 260, w2 = 260;
    ctx.fillStyle = '#1f0606'; ctx.beginPath(); ctx.moveTo(x - w2 * 1.4, V.gy); ctx.lineTo(x - 40, top); ctx.lineTo(x + 40, top); ctx.lineTo(x + w2 * 1.4, V.gy); ctx.fill();
    const g = ctx.createRadialGradient(x, top, 5, x, top, 120); g.addColorStop(0, 'rgba(255,170,60,0.7)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 120, top - 120, 240, 240);
    ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 10, top + 4); ctx.lineTo(x - 30, top + 60); ctx.lineTo(x - 20, top + 110); ctx.stroke();
    // uitbarsting: lavaklodders in bogen
    for (let i = 0; i < 9; i++) {
      const q = mod(t * 0.7 + hash(i, k + 3), 1), vx = (hash(i, k + 4) - 0.5) * 240, vy = -220 - hash(i, k + 5) * 160;
      const px = x + vx * q, py = top + vy * q + 380 * q * q;
      ctx.fillStyle = q < 0.7 ? '#ffd23d' : '#ff5a1f'; ctx.beginPath(); ctx.arc(px, py, 4 + (1 - q) * 3, 0, TAU); ctx.fill();
    }
  });
  repeatX(V, D, 0.08, 120, 80, (x, k, r) => { // rookpluimen
    const y = V.gy - 300 - mod(t * 20 + r * 200, 200);
    ctx.fillStyle = 'rgba(40,20,20,0.25)'; ctx.beginPath(); ctx.arc(x, y, 30 + r * 30, 0, TAU); ctx.fill();
  });
  hills(ctx, V, D, 0.25, V.gy - 60, 50, 0.012, '#2a0b07', 6, true);
  ctx.strokeStyle = `rgba(255,${100 + P * 80 | 0},30,0.9)`; ctx.lineWidth = 3;
  repeatX(V, D, 0.25, 160, 60, (x, k, r) => { if (r < 0.5) return; ctx.beginPath(); ctx.moveTo(x, V.gy - 70 - r * 30); ctx.lineTo(x + 8, V.gy - 40); ctx.lineTo(x - 4, V.gy); ctx.stroke(); });
  ctx.globalCompositeOperation = 'lighter';
  ambient(V, 30, 81, t, -30, -60, (x, y, c, i) => { ctx.fillStyle = `rgba(255,${120 + c * 100 | 0},40,${0.4 + 0.5 * Math.abs(Math.sin(t * 4 + i))})`; ctx.fillRect(x, y, 2 + c * 2, 2 + c * 2); });
  ctx.globalCompositeOperation = 'source-over';
};
GROUND.vulkaan = (ctx, V, D, t, P) => {
  ctx.fillStyle = vgrad(ctx, 'rock', V.gy, V.h, ['#3a1710', '#1a0806']); ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  const a = 0.6 + 0.4 * Math.sin(t * 3) * calmK();
  ctx.strokeStyle = `rgba(255,120,30,${a})`; ctx.lineWidth = 2.5;
  repeatX(V, D, 1, 64, 40, (x, k, r) => { ctx.beginPath(); ctx.moveTo(x, V.gy + 4); ctx.lineTo(x + 12, V.gy + 18 + r * 10); ctx.lineTo(x + 4, V.gy + 34); ctx.lineTo(x + 20, V.gy + 50); ctx.stroke(); });
  ctx.fillStyle = `rgba(255,${90 + P * 90 | 0},20,1)`; ctx.fillRect(-2, V.gy, V.w + 4, 4);
};

// ---- Tekenland ----
BG.tekenland = (ctx, V, D, t) => {
  ctx.fillStyle = '#fffdf2'; ctx.fillRect(-2, -2, V.w + 4, V.gy + 4);
  ctx.strokeStyle = '#c3dcff'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let y = 40; y < V.gy; y += 26) { ctx.moveTo(0, y); ctx.lineTo(V.w, y); }
  ctx.stroke();
  ctx.strokeStyle = '#ffb0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 0); ctx.lineTo(48, V.gy); ctx.stroke();
  const boil = Math.floor(t * 7);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // zon
  const sx = V.w * 0.78, sy = 100;
  ctx.fillStyle = 'rgba(255,220,60,0.5)'; ctx.beginPath(); ctx.arc(sx, sy, 36, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f0a000'; ctx.lineWidth = 3;
  wobble(ctx, circlePts(sx, sy, 36, 14), boil, 3); ctx.stroke();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.2; wobble(ctx, [[sx + Math.cos(a) * 48, sy + Math.sin(a) * 48], [sx + Math.cos(a) * 66, sy + Math.sin(a) * 66]], boil + i, 3); ctx.stroke(); }
  ctx.fillStyle = '#2a2a6a'; ctx.beginPath(); ctx.arc(sx - 12, sy - 5, 3, 0, TAU); ctx.arc(sx + 12, sy - 5, 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2a2a6a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy + 4, 11, 0.3, Math.PI - 0.3); ctx.stroke();
  // wolkjes
  repeatX(V, D, 0.08, 260, 120, (x, k, r) => {
    const y = 60 + r * 140, p = [];
    for (let i = 0; i <= 18; i++) { const a = i / 18 * TAU; p.push([x + Math.cos(a) * (44 + Math.sin(a * 5) * 8), y + Math.sin(a) * (20 + Math.sin(a * 5) * 5)]); }
    ctx.strokeStyle = '#3a6bff'; ctx.lineWidth = 2.5; wobble(ctx, p, boil + k, 3, true); ctx.stroke();
  });
  // heuvels met arcering
  const off = D * 0.2, base = V.gy - 70, hp = [];
  for (let x = -10; x <= V.w + 20; x += 16) { const u = (x + off) * 0.01; hp.push([x, base - (Math.sin(u) * 0.7 + Math.sin(u * 2.3) * 0.3) * 36]); }
  ctx.strokeStyle = 'rgba(60,180,60,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -mod(off, 12); x < V.w; x += 12) { ctx.moveTo(x, V.gy); ctx.lineTo(x + 18, base + 20); }
  ctx.stroke();
  ctx.strokeStyle = '#2f9e2f'; ctx.lineWidth = 3; wobble(ctx, hp, boil, 2.5); ctx.stroke();
  // boompjes en huisjes
  repeatX(V, D, 0.35, 150, 60, (x, k, r) => {
    if (r < 0.35) return;
    const y = V.gy;
    ctx.lineWidth = 2.5;
    if (r < 0.7) {
      ctx.strokeStyle = '#8a5a2a'; wobble(ctx, [[x, y], [x, y - 40]], boil + k, 2); ctx.stroke();
      ctx.strokeStyle = '#2f9e2f'; wobble(ctx, circlePts(x, y - 56, 22, 10), boil + k + 1, 3, true); ctx.stroke();
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x - 8, y - 60, 3.5, 0, TAU); ctx.arc(x + 9, y - 50, 3.5, 0, TAU); ctx.fill();
    } else {
      ctx.strokeStyle = '#d23a3a'; wobble(ctx, [[x - 24, y - 36], [x, y - 60], [x + 24, y - 36]], boil + k, 2); ctx.stroke();
      ctx.strokeStyle = '#2a2a6a'; wobble(ctx, [[x - 20, y], [x - 20, y - 36], [x + 20, y - 36], [x + 20, y], [x - 20, y]], boil + k + 2, 2); ctx.stroke();
      wobble(ctx, [[x - 5, y], [x - 5, y - 16], [x + 5, y - 16], [x + 5, y]], boil + k + 3, 1.5); ctx.stroke();
    }
  });
};
GROUND.tekenland = (ctx, V, D, t) => {
  ctx.fillStyle = '#fffdf2'; ctx.fillRect(-2, V.gy, V.w + 4, V.h - V.gy);
  ctx.strokeStyle = 'rgba(80,190,60,0.75)'; ctx.lineWidth = 3; ctx.beginPath();
  const off = mod(D, 10);
  for (let x = -off - 10; x < V.w + 10; x += 10) { ctx.moveTo(x, V.gy + 2); ctx.lineTo(x + 6, V.gy + 22); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,110,60,0.4)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -mod(D, 14) - 14; x < V.w + 14; x += 14) { ctx.moveTo(x, V.gy + 28); ctx.lineTo(x + 22, V.gy + 60); }
  ctx.stroke();
  ctx.strokeStyle = '#2a2a6a'; ctx.lineWidth = 3;
  const p = []; for (let x = -10; x <= V.w + 10; x += 20) p.push([x, V.gy]);
  wobble(ctx, p, Math.floor(t * 7), 2.5); ctx.stroke();
};

// ---- Disco Inferno ----
BG.disco = (ctx, V, D, t, P) => {
  sky(ctx, V, 'bg', ['#0d001f', '#24004a', '#3a0060']);
  const k = calmK(), beat = Math.floor(Music.step / 4);
  // equalizer op de achterwand
  const n = 28, bw = V.w / n;
  for (let i = 0; i < n; i++) {
    const hgt = (0.25 + 0.75 * Math.abs(Math.sin(i * 0.7 + t * 3 + beat))) * (60 + P * 120 * k);
    ctx.fillStyle = hsl((i * 12 + t * 60) % 360, 90, 55, 0.35);
    for (let y = 0; y < hgt; y += 9) ctx.fillRect(i * bw + 2, V.gy - 6 - y, bw - 4, 6);
  }
  // spotlights
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const ox = V.w * (0.1 + i * 0.2), a = Math.sin(t * (0.6 + i * 0.13) + i * 2) * 0.6, len = V.gy + 80;
    const g = ctx.createLinearGradient(ox, 0, ox + Math.sin(a) * len, len);
    const col = hsl((i * 72 + beat * 40) % 360, 100, 60, 0.28 * k + 0.05);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, 0);
    ctx.lineTo(ox + Math.sin(a - 0.12) * len, Math.cos(a - 0.12) * len); ctx.lineTo(ox + Math.sin(a + 0.12) * len, Math.cos(a + 0.12) * len); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // discobal
  const bx = Math.min(V.w * 0.74, V.w * 0.5 + 110), by = 100, br = 34;
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, -5); ctx.lineTo(bx, by - br); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.clip();
  ctx.fillStyle = '#9aa0b8'; ctx.fillRect(bx - br, by - br, br * 2, br * 2);
  const sp = 8, rot = mod(t * 12, sp);
  for (let y = by - br; y < by + br; y += sp) {
    for (let x = bx - br - sp + rot; x < bx + br; x += sp) {
      const l = 50 + hash(Math.floor((x - rot) / sp) * 7 + Math.floor(t * 6), Math.floor(y)) * 50;
      ctx.fillStyle = hsl(220, 15, l); ctx.fillRect(x + 0.6, y + 0.6, sp - 1.2, sp - 1.2);
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 4; i++) {
    const a = t * 1.5 + i * 1.6, s = (Math.sin(t * 5 + i * 2) * 0.5 + 0.5) * 7;
    const x = bx + Math.cos(a) * br * 0.7, y = by + Math.sin(a * 0.7) * br * 0.6;
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - 1); ctx.lineTo(x + s, y); ctx.lineTo(x, y + 1); ctx.moveTo(x, y - s); ctx.lineTo(x + 1, y); ctx.lineTo(x, y + s); ctx.lineTo(x - 1, y); ctx.fill();
  }
  ambient(V, 30, 91, t, -20, 50, (x, y, c, i) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + i); ctx.scale(Math.cos(t * 4 + i), 1);
    ctx.fillStyle = hsl((i * 53) % 360, 95, 60); ctx.fillRect(-4, -2.5, 8, 5); ctx.restore();
  });
};
GROUND.disco = (ctx, V, D, t, P) => {
  const tw = 40, th = 22, beat = Math.floor(Music.step / 4), k = calmK();
  for (let row = 0; V.gy + row * th < V.h; row++) {
    const off = mod(D, tw);
    for (let x = -off - tw, c = Math.floor((D - off) / tw) - 1; x < V.w + tw; x += tw, c++) {
      const h = hash(c * 3 + row, beat);
      const lit = h > 0.55;
      ctx.fillStyle = lit ? hsl((h * 360 + beat * 30) % 360, 90, 45 + P * 25 * k) : '#1f0a3a';
      ctx.fillRect(x + 1, V.gy + row * th + 1, tw - 2, th - 2);
    }
  }
  ctx.fillStyle = '#ff3df5'; ctx.fillRect(-2, V.gy, V.w + 4, 3);
};
