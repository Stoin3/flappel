'use strict';
// Flappel · speelwereld tekenen
// Kiwibuizen (per stijl), de appel met skins, pitten, power-up-bellen, deeltjes en tekstjes.

// RES = beeldpunten per wereld-eenheid; sprites worden op die resolutie gemaakt (zie viewResize)
let RES = 2;
function spriteRes(key, w, h, draw) {
  const k = key + '@' + RES.toFixed(2);
  return sprite(k, Math.ceil(w * RES), Math.ceil(h * RES), (c, pw, ph) => { c.scale(RES, RES); draw(c, w, h); });
}

// =====================================================================
//  Kiwibuizen
// =====================================================================
// De rand van elke buis is een doorgesneden kiwi: groen vruchtvlees, een romig hart en zwarte pitjes.
function kiwiFlesh(c, x, y, w, h, style) {
  const cx = x + w / 2, cy = y + h / 2;
  const g = c.createRadialGradient(cx, cy, 2, cx, cy, w / 2);
  if (style === 'ice') { g.addColorStop(0, '#f2fffb'); g.addColorStop(0.35, '#b6f0d0'); g.addColorStop(1, '#5fc6a8'); }
  else { g.addColorStop(0, '#f6ffd0'); g.addColorStop(0.3, '#c8f05a'); g.addColorStop(0.75, '#86c92a'); g.addColorStop(1, '#5a9a14'); }
  c.fillStyle = g; c.fill();
  // stralen in het vruchtvlees
  c.save(); c.clip();
  c.strokeStyle = 'rgba(255,255,220,0.35)'; c.lineWidth = 1;
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * h * 1.6); c.stroke(); }
  c.restore();
  // hart
  c.fillStyle = style === 'ice' ? '#ffffff' : '#fbfde8';
  c.beginPath(); c.ellipse(cx, cy, w * 0.2, h * 0.17, 0, 0, TAU); c.fill();
  // pitjes in een ring
  c.fillStyle = '#1a1208';
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU, rx = w * 0.29 + (i % 2) * w * 0.04, ry = h * 0.3 + (i % 2) * h * 0.05;
    c.save(); c.translate(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); c.rotate(Math.atan2(Math.sin(a) * ry, Math.cos(a) * rx));
    c.beginPath(); c.ellipse(0, 0, 2.6, 1.3, 0, 0, TAU); c.fill(); c.restore();
  }
}
function capSprite(style) {
  const w = PIPE_W + CAP_OVER * 2, h = CAP_H;
  return spriteRes('cap-' + style, w, h, (c) => {
    rrect(c, 1, 1, w - 2, h - 2, 12);
    c.fillStyle = '#6b4423'; c.fill();
    rrect(c, 4, 4, w - 8, h - 8, 9);
    kiwiFlesh(c, 4, 4, w - 8, h - 8, style);
    rrect(c, 1, 1, w - 2, h - 2, 12);
    c.strokeStyle = '#3d240c'; c.lineWidth = 2.5; c.stroke();
    // glans
    c.fillStyle = 'rgba(255,255,255,0.35)'; rrect(c, 10, 5, w * 0.35, 4, 2); c.fill();
  });
}
function fuzzPattern(ctx) {
  if (ctx.__fuzz) return ctx.__fuzz;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    const x = hash(i, 1) * 64, y = hash(i, 2) * 64, a = Math.PI / 2 + (hash(i, 3) - 0.5) * 0.9, l = 2 + hash(i, 4) * 4;
    g.strokeStyle = hash(i, 5) < 0.5 ? 'rgba(40,20,5,0.35)' : 'rgba(220,170,110,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const p = ctx.createPattern(c, 'repeat');
  if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(0.5));
  return (ctx.__fuzz = p);
}
function skinGrad(ctx) {
  if (ctx.__skin) return ctx.__skin;
  const g = ctx.createLinearGradient(0, 0, PIPE_W, 0);
  g.addColorStop(0, '#3e250c'); g.addColorStop(0.18, '#7a4f22'); g.addColorStop(0.42, '#a8763d'); g.addColorStop(0.7, '#86582a'); g.addColorStop(1, '#3a210a');
  return (ctx.__skin = g);
}
// één helft van een buis: het lijf van y0 tot y1, de kiwirand op capY
function pipeHalf(ctx, p, y0, y1, capY, top, th, A, t, P) {
  const style = th.pipe, w = PIPE_W, h = y1 - y0;
  ctx.save(); ctx.translate(p.x, 0);
  if (style === 'neon') {
    const col = th.id === 'disco' ? hsl((t * 90 + p.id * 40) % 360, 100, 60) : '#3df5ff';
    ctx.fillStyle = '#12022a'; ctx.fillRect(0, y0, w, h);
    ctx.strokeStyle = col; ctx.globalAlpha = 0.25; ctx.lineWidth = 3;
    ctx.beginPath(); for (let x = 14; x < w; x += 18) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); } ctx.stroke();
    ctx.globalAlpha = 0.3 + P * 0.3 * calmK(); ctx.lineWidth = 9; ctx.strokeRect(0, y0, w, h);
    ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeRect(0, y0, w, h);
    const cx = -CAP_OVER, cw = w + CAP_OVER * 2;
    ctx.fillStyle = '#0a1a02'; rrect(ctx, cx, capY, cw, CAP_H, 12); ctx.fill();
    ctx.strokeStyle = '#7dff4d'; ctx.globalAlpha = 0.35; ctx.lineWidth = 9; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(w / 2, capY + CAP_H / 2, 16, 4.5, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#b6ff8a';
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; ctx.fillRect(w / 2 + Math.cos(a) * 28 - 1.5, capY + CAP_H / 2 + Math.sin(a) * 8.5 - 1.5, 3, 3); }
  } else if (style === 'sketch') {
    const boil = Math.floor(t * 7) + p.id * 5;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(190,140,80,0.25)'; ctx.fillRect(0, y0, w, h);
    ctx.strokeStyle = 'rgba(140,90,40,0.55)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let y = Math.floor(y0 / 9) * 9; y < y1 + w; y += 9) { ctx.moveTo(0, y); ctx.lineTo(w, y - w * 0.6); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#2a2a6a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    wobble(ctx, [[0, y0], [0, (y0 + y1) / 2], [0, y1]], boil, 3); ctx.stroke();
    wobble(ctx, [[w, y0], [w, (y0 + y1) / 2], [w, y1]], boil + 1, 3); ctx.stroke();
    const cx = -CAP_OVER, cw = w + CAP_OVER * 2;
    ctx.fillStyle = 'rgba(140,210,60,0.55)'; rrect(ctx, cx, capY, cw, CAP_H, 10); ctx.fill();
    wobble(ctx, [[cx, capY], [cx + cw, capY], [cx + cw, capY + CAP_H], [cx, capY + CAP_H]], boil + 2, 3, true); ctx.stroke();
    ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.ellipse(w / 2, capY + CAP_H / 2, 15, 5, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2a2a6a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.arc(w / 2 + Math.cos(a) * 27, capY + CAP_H / 2 + Math.sin(a) * 8.5, 1.8, 0, TAU); ctx.fill(); }
  } else {
    ctx.fillStyle = skinGrad(ctx); ctx.fillRect(0, y0, w, h);
    ctx.fillStyle = fuzzPattern(ctx); ctx.fillRect(0, y0, w, h);
    ctx.fillStyle = 'rgba(255,230,180,0.18)'; ctx.fillRect(w * 0.24, y0, w * 0.1, h);
    if (style === 'ice') {
      ctx.fillStyle = 'rgba(170,230,255,0.5)'; ctx.fillRect(0, y0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(w * 0.15, y0, 5, h); ctx.fillRect(w * 0.7, y0, 2, h);
    }
    if (style === 'candy') {
      ctx.fillStyle = 'rgba(255,140,210,0.25)'; ctx.fillRect(0, y0, w, h);
      for (let i = 0; i < 14; i++) {
        const yy = y0 + hash(i, p.id) * h, xx = 6 + hash(i, p.id + 9) * (w - 12);
        ctx.save(); ctx.translate(xx, yy); ctx.rotate(hash(i, p.id + 3) * 6);
        ctx.fillStyle = ['#ff4f4f', '#4fd8ff', '#ffe14d', '#7dff6b', '#fff'][i % 5]; ctx.fillRect(-4, -1.3, 8, 2.6); ctx.restore();
      }
    }
    ctx.strokeStyle = '#2e1a06'; ctx.lineWidth = 2.5; ctx.strokeRect(0, y0, w, h);
    ctx.drawImage(capSprite(style === 'ice' ? 'ice' : 'kiwi'), -CAP_OVER, capY, w + CAP_OVER * 2, CAP_H);
    if (style === 'candy') { // druipend glazuur over de rand
      ctx.fillStyle = '#ffd1ee';
      const ey = top ? capY : capY + CAP_H;
      for (let i = 0; i < 6; i++) { const dx = 4 + i * (w / 5.4), dl = 6 + hash(i, p.id) * 12; ctx.beginPath(); ctx.arc(dx, ey + (top ? -dl : dl), 4, 0, TAU); ctx.fill(); ctx.fillRect(dx - 4, top ? ey - dl : ey, 8, dl); }
    }
    if (style === 'ice' && !top) { // sneeuwhoopje op de onderste buis
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(w / 2, capY + 2, w / 2 + CAP_OVER - 2, 7, 0, Math.PI, TAU); ctx.fill();
    }
    if (th.tint) {
      ctx.globalAlpha = th.tint[1]; ctx.fillStyle = th.tint[0];
      ctx.fillRect(0, y0, w, h); rrect(ctx, -CAP_OVER, capY, w + CAP_OVER * 2, CAP_H, 12); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // boze kiwi-oogjes die de appel volgen
  if (p.face && style !== 'neon') {
    const ey = top ? capY - 24 : capY + CAP_H + 24;
    if ((top && ey > y0 + 10) || (!top && ey < y1 - 10)) {
      const close = Math.abs(A.x - (p.x + w / 2)) < 110;
      const er = close ? 10 : 8.5;
      for (const ex of [w * 0.3, w * 0.7]) {
        const dx = A.x - (p.x + ex), dy = A.y - ey, d = Math.hypot(dx, dy) || 1;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2e1a06'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + dx / d * 3.5, ey + dy / d * 3.5, close ? 3.2 : 4.4, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#2e1a06'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w * 0.3 - 10, ey - 13); ctx.lineTo(w * 0.3 + 7, ey - 9); ctx.moveTo(w * 0.7 + 10, ey - 13); ctx.lineTo(w * 0.7 - 7, ey - 9); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawPipe(ctx, p, th, A, t, P, V) {
  const gt = p.gy - p.gap / 2, gb = p.gy + p.gap / 2;
  pipeHalf(ctx, p, -10, gt - CAP_H + 2, gt - CAP_H, true, th, A, t, P);
  pipeHalf(ctx, p, gb + CAP_H - 2, V.gy + 2, gb, false, th, A, t, P);
}

// =====================================================================
//  Pitten en power-up-bellen
// =====================================================================
function pitSprite() {
  return spriteRes('pit', 34, 34, (c) => {
    const g = c.createRadialGradient(17, 17, 2, 17, 17, 17); g.addColorStop(0, 'rgba(255,230,120,0.6)'); g.addColorStop(1, 'rgba(255,200,60,0)');
    c.fillStyle = g; c.fillRect(0, 0, 34, 34);
    c.translate(17, 18);
    c.beginPath(); c.moveTo(0, -11); c.bezierCurveTo(8, -6, 8, 8, 0, 9); c.bezierCurveTo(-8, 8, -8, -6, 0, -11);
    const gg = c.createLinearGradient(-6, -10, 6, 9); gg.addColorStop(0, '#fff6b0'); gg.addColorStop(0.45, '#ffc928'); gg.addColorStop(1, '#b86e00');
    c.fillStyle = gg; c.fill(); c.strokeStyle = '#7a4200'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(-2.5, -3, 1.6, 3.6, 0.3, 0, TAU); c.fill();
  });
}
function drawPit(ctx, c, t) {
  const s = Math.cos(t * 4 + c.ph);
  ctx.save(); ctx.translate(c.x, c.y + Math.sin(t * 3 + c.ph) * 3); ctx.scale(Math.max(0.15, Math.abs(s)), 1);
  ctx.drawImage(pitSprite(), -17, -17, 34, 34);
  ctx.restore();
}
function drawBubble(ctx, b, t) {
  const pw = POWERS[b.type], y = b.y + Math.sin(t * 2.5 + b.ph) * 7, r = 24 * (1 + Math.sin(t * 5) * 0.05);
  ctx.save(); ctx.translate(b.x, y);
  const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.7); g.addColorStop(0, pw.color + '66'); g.addColorStop(1, pw.color + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = hsl((i * 60 + t * 200) % 360, 100, 70, 0.9); ctx.beginPath(); ctx.arc(0, 0, r, i / 6 * TAU + t * 2, (i + 1) / 6 * TAU + t * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.13, -0.6, 0, TAU); ctx.fill();
  ctx.font = `${b.type === 'double' ? 18 : 24}px "Lilita One", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (b.type === 'double') { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a6b33'; ctx.lineWidth = 4; ctx.strokeText('×2', 0, 1); ctx.fillText('×2', 0, 1); }
  else ctx.fillText(pw.icon, 0, 2);
  ctx.restore();
}

// =====================================================================
//  De appel
// =====================================================================
function applePath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.62);
  ctx.bezierCurveTo(r * 0.35, -r * 1.08, r * 1.15, -r * 0.88, r * 1.06, -r * 0.05);
  ctx.bezierCurveTo(r * 1.0, r * 0.72, r * 0.55, r * 1.06, r * 0.2, r * 0.98);
  ctx.bezierCurveTo(r * 0.08, r * 0.94, -r * 0.08, r * 0.94, -r * 0.2, r * 0.98);
  ctx.bezierCurveTo(-r * 0.55, r * 1.06, -r * 1.0, r * 0.72, -r * 1.06, -r * 0.05);
  ctx.bezierCurveTo(-r * 1.15, -r * 0.88, -r * 0.35, -r * 1.08, 0, -r * 0.62);
  ctx.closePath();
}
function leafPath(ctx, L, W) {
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -W, L, 0); ctx.quadraticCurveTo(L * 0.5, W, 0, 0); ctx.closePath();
}
function skinColors(sk, t) {
  if (!sk.rainbow) return sk.c;
  const h = (t * 90) % 360;
  return [hsl(h, 100, 85), hsl(h, 95, 58), hsl((h + 40) % 360, 90, 38), hsl((h + 40) % 360, 80, 20)];
}
// A: { x, y, rot, s (schaal), wing (0..1 fladderfase), sq (squash), mood, look: hoek, blink, cool }
function drawApple(ctx, A, sk, t) {
  const r = APPLE_R;
  const c = skinColors(sk, t);
  ctx.save();
  ctx.translate(A.x, A.y); ctx.rotate(A.rot || 0);
  const sq = A.sq || 0;
  ctx.scale((A.s || 1) * (1 + sq * 0.18), (A.s || 1) * (1 - sq * 0.18));
  // vleugels (blaadjes): achterste eerst
  const wa = -0.5 + Math.sin((A.wing || 0) * Math.PI) * 1.25;
  const wing = (dx, dy, ang, col, l) => {
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(Math.PI + ang);
    leafPath(ctx, l, l * 0.38);
    ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#1f5a10'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(l * 0.85, 0); ctx.stroke();
    ctx.restore();
  };
  wing(-r * 0.55, -r * 0.2, wa + 0.35, '#3d9a26', r * 1.15);
  // lijf
  applePath(ctx, r);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.15);
  g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
  ctx.fillStyle = g; ctx.fill();
  if (sk.galaxy || sk.diamond || sk.shine) {
    ctx.save(); applePath(ctx, r); ctx.clip();
    if (sk.galaxy) {
      ctx.globalCompositeOperation = 'lighter';
      const n = ctx.createRadialGradient(r * 0.3, r * 0.2, 2, r * 0.3, r * 0.2, r);
      n.addColorStop(0, 'rgba(255,80,200,0.5)'); n.addColorStop(1, 'rgba(80,40,255,0)');
      ctx.fillStyle = n; ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
      for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))})`; ctx.fillRect((hash(i, 1) - 0.5) * r * 2, (hash(i, 2) - 0.5) * r * 2, 1.6, 1.6); }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (sk.diamond) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(i * r * 0.45, -r); ctx.lineTo(i * r * 0.45 + r * 0.5, r); ctx.moveTo(i * r * 0.45, -r); ctx.lineTo(i * r * 0.45 - r * 0.5, r); }
      ctx.stroke();
    }
    if (sk.shine) {
      const sx = mod(t * 1.3, 3) * r * 2 - r * 2.5;
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(sx, -r * 1.2); ctx.lineTo(sx + r * 0.4, -r * 1.2); ctx.lineTo(sx - r * 0.2, r * 1.2); ctx.lineTo(sx - r * 0.6, r * 1.2); ctx.fill();
    }
    ctx.restore();
  }
  applePath(ctx, r);
  ctx.strokeStyle = c[3]; ctx.lineWidth = 2.6; ctx.stroke();
  // glimlichtje
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.38, r * 0.17, r * 0.28, 0.5, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(-r * 0.62, -r * 0.02, r * 0.07, 0, TAU); ctx.fill();
  // steeltje (of een stokje bij de toffee-appel) en blaadje
  ctx.lineCap = 'round';
  if (sk.stick) {
    ctx.strokeStyle = '#e8d2a8'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.15, -r * 1.55); ctx.stroke();
    ctx.strokeStyle = '#b89a6a'; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    ctx.strokeStyle = '#5a3210'; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(0, -r * 0.58); ctx.quadraticCurveTo(-r * 0.02, -r * 0.95, r * 0.18, -r * 1.12); ctx.stroke();
    ctx.save(); ctx.translate(r * 0.08, -r * 0.88); ctx.rotate(-0.5 + Math.sin(t * 6) * 0.12);
    leafPath(ctx, r * 0.62, r * 0.25); ctx.fillStyle = '#5fcf3a'; ctx.fill(); ctx.strokeStyle = '#1f5a10'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  }
  // gezicht (kijkt naar rechts, de vliegrichting)
  const mood = A.mood || 'happy';
  const ex1 = r * 0.12, ex2 = r * 0.6, ey = -r * 0.1;
  if (mood === 'dead') {
    ctx.strokeStyle = '#2a0508'; ctx.lineWidth = 3;
    for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(r * 0.12, r * 0.42); ctx.quadraticCurveTo(r * 0.25, r * 0.3, r * 0.37, r * 0.42); ctx.quadraticCurveTo(r * 0.5, r * 0.54, r * 0.62, r * 0.42); ctx.stroke();
  } else {
    const big = mood === 'scared' ? 1.2 : 1, bl = A.blink ? 0.12 : 1;
    for (const ex of [ex1, ex2]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.21 * big, r * 0.27 * big * bl, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,5,8,0.6)'; ctx.lineWidth = 1.4; ctx.stroke();
      if (!A.blink) {
        const lx = Math.cos(A.look || 0) * r * 0.07, ly = Math.sin(A.look || 0) * r * 0.08;
        ctx.fillStyle = '#1a0a0a'; ctx.beginPath(); ctx.arc(ex + lx + r * 0.03, ey + ly, r * (mood === 'scared' ? 0.09 : 0.12), 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx + r * 0.07, ey + ly - r * 0.05, r * 0.045, 0, TAU); ctx.fill();
      }
    }
    if (A.cool) { // zonnebril (superster en raket)
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(ex1, ey + 1, r * 0.26, r * 0.19, 0, 0, TAU); ctx.ellipse(ex2, ey + 1, r * 0.26, r * 0.19, 0, 0, TAU); ctx.fill();
      ctx.fillRect(ex1, ey - 3, ex2 - ex1, 3); ctx.fillRect(ex1 - r * 0.45, ey - 2, r * 0.25, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(ex1 - 6, ey - 3, 5, 2); ctx.fillRect(ex2 - 6, ey - 3, 5, 2);
    }
    ctx.fillStyle = 'rgba(255,90,140,0.45)';
    ctx.beginPath(); ctx.ellipse(ex1 - r * 0.15, r * 0.25, r * 0.14, r * 0.08, 0, 0, TAU); ctx.ellipse(ex2 + r * 0.2, r * 0.25, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a0508'; ctx.fillStyle = '#5a0a12'; ctx.lineWidth = 2.4;
    const mx = r * 0.37, my = r * 0.36;
    if (mood === 'scared') { ctx.beginPath(); ctx.ellipse(mx, my + 2, r * 0.1, r * 0.13, 0, 0, TAU); ctx.fill(); }
    else if (mood === 'yay') {
      ctx.beginPath(); ctx.moveTo(mx - r * 0.2, my - 2); ctx.quadraticCurveTo(mx, my + r * 0.38, mx + r * 0.2, my - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6b7a'; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.12, r * 0.08, r * 0.05, 0, 0, TAU); ctx.fill();
    } else { ctx.beginPath(); ctx.arc(mx, my - r * 0.08, r * 0.17, 0.35, Math.PI - 0.35); ctx.stroke(); }
  }
  // voorste vleugel
  wing(-r * 0.35, -r * 0.05, wa - 0.15, '#5fcf3a', r * 1.25);
  ctx.restore();
}

// =====================================================================
//  Deeltjes en tekstjes
// =====================================================================
const MAX_PARTS = 700;
function spawn(o) {
  if (S.parts.length >= MAX_PARTS) S.parts.shift();
  o.life = o.max = o.life || 0.8;
  o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g || 0; o.rot = o.rot || Math.random() * TAU; o.vr = o.vr === undefined ? rand(-6, 6) : o.vr;
  o.drag = o.drag || 0;
  S.parts.push(o);
}
function burst(x, y, n, o) {
  for (let i = 0; i < n; i++) {
    const a = o.angle !== undefined ? o.angle + rand(-o.spread, o.spread) : rand(0, TAU), sp = rand(o.min || 60, o.max || 260);
    spawn(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.5, 1) * (o.life || 1), s: rand(o.smin || 3, o.smax || 6),
      c: Array.isArray(o.c) ? pick(o.c) : o.c === 'rainbow' ? hsl(Math.random() * 360, 100, 60) : o.c, type: o.type || 'dot', g: o.g || 0, drag: o.drag || 1.5 }, o.extra || {}));
  }
}
function updateParts(dt) {
  const P = S.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= dt;
    if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
    if (p.scroll) p.x -= S.speedNow * dt;
    p.vy += p.g * dt;
    const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const p = S.pops[i]; p.life -= dt; p.y += p.vy * dt; p.vy *= Math.exp(-3 * dt);
    if (p.life <= 0) S.pops.splice(i, 1);
  }
}
function kiwiSliceSprite() {
  return spriteRes('slice', 40, 40, c => {
    c.beginPath(); c.arc(20, 20, 19, 0, TAU); c.fillStyle = '#6b4423'; c.fill();
    c.beginPath(); c.arc(20, 20, 16.5, 0, TAU); kiwiFlesh(c, 3.5, 3.5, 33, 33, 'kiwi');
  });
}
function star5(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath();
}
function heart(ctx, r) {
  ctx.beginPath(); ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.4, -r * 0.5, -r * 1.2, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.5, -r * 1.2, r * 1.2, -r * 0.4, 0, r * 0.35); ctx.fill();
}
function drawParts(ctx) {
  for (const p of S.parts) {
    const k = p.life / p.max;
    ctx.globalAlpha = p.type === 'conf' || p.type === 'slice' ? Math.min(1, k * 3) : k;
    ctx.fillStyle = p.c;
    switch (p.type) {
      case 'dot': ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.4 + k * 0.6), 0, TAU); ctx.fill(); break;
      case 'glow':
        ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.5 + k), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; break;
      case 'conf': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 2), 1); ctx.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s); ctx.restore(); break;
      case 'star': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); star5(ctx, p.s * (0.5 + k * 0.5)); ctx.fill(); ctx.restore(); break;
      case 'heart': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.rot) * 0.3); heart(ctx, p.s); ctx.restore(); break;
      case 'seed': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, TAU); ctx.fill(); ctx.restore(); break;
      case 'slice': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 0.7), 1); ctx.drawImage(kiwiSliceSprite(), -p.s, -p.s, p.s * 2, p.s * 2); ctx.restore(); break;
      case 'chunk': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = skinGrad(ctx); ctx.fillRect(-p.s, -p.s * 1.4, p.s * 2, p.s * 2.8); ctx.strokeStyle = '#2e1a06'; ctx.lineWidth = 1.5; ctx.strokeRect(-p.s, -p.s * 1.4, p.s * 2, p.s * 2.8); ctx.restore(); break;
      case 'ring': ctx.strokeStyle = p.c; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.arc(p.x, p.y, p.s + (1 - k) * p.grow, 0, TAU); ctx.stroke(); break;
      case 'leaf': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); leafPath(ctx, p.s * 2, p.s * 0.8); ctx.fill(); ctx.restore(); break;
      case 'line': ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke(); break;
    }
  }
  ctx.globalAlpha = 1;
}
function pop(x, y, text, c, s, o) { S.pops.push(Object.assign({ x, y, text, c: c || '#fff', s: s || 22, life: 1, max: 1, vy: -70 }, o || {})); }
function drawPops(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of S.pops) {
    const age = p.max - p.life, k = easeBack(Math.min(1, age / 0.25));
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(k, k); if (p.rot) ctx.rotate(p.rot);
    ctx.font = `${p.s}px "Lilita One", system-ui, sans-serif`;
    ctx.lineWidth = p.s * 0.22; ctx.strokeStyle = 'rgba(30,10,40,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.c === 'rainbow' ? hsl((S.rt * 300) % 360, 100, 65) : p.c; ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// regenboogspoor achter de appel
function drawTrail(ctx, rainbow, fire) {
  const T = S.trail;
  if (T.length < 3) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const bands = fire ? ['#ffe14d', '#ff9a1f', '#ff3d1f'] : ['#ff3b3b', '#ff9a1f', '#ffe14d', '#3dff6b', '#3dc8ff', '#8a5bff'];
  const bw = fire ? 7 : 4.2;
  bands.forEach((col, i) => {
    const off = (i - (bands.length - 1) / 2) * bw;
    ctx.strokeStyle = col; ctx.lineWidth = bw + 0.6;
    ctx.beginPath();
    for (let j = 0; j < T.length; j++) {
      const p = T[j], wave = rainbow ? Math.sin(j * 0.6 - S.rt * 14) * 2 : 0;
      ctx.globalAlpha = 1;
      if (j) ctx.lineTo(p.x, p.y + off + wave); else ctx.moveTo(p.x, p.y + off + wave);
    }
    ctx.globalAlpha = 0.85; ctx.stroke();
  });
  ctx.globalAlpha = 1;
}
