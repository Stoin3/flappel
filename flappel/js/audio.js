'use strict';
// Flappel · geluid en muziek
// Alles wordt tijdens het spelen gemaakt met WebAudio: geen geluidsbestanden.

const AU = { ctx: null, master: null, sfx: null, mus: null, delay: null, noise: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const c = AU.ctx = new AC();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  comp.connect(c.destination);
  AU.master = c.createGain(); AU.master.gain.value = 0.9; AU.master.connect(comp);
  AU.sfx = c.createGain(); AU.sfx.connect(AU.master);
  AU.mus = c.createGain(); AU.mus.connect(AU.master);
  // echo voor de muziek: geeft ruimte
  const d = AU.delay = c.createDelay(1); d.delayTime.value = 0.27;
  const fb = c.createGain(); fb.gain.value = 0.3;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(AU.mus);
  const len = c.sampleRate;
  const buf = AU.noise = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  audioApply();
  Music.start();
}
function audioApply() {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  AU.sfx.gain.setTargetAtTime(save.sound ? 0.8 : 0, t, 0.02);
  AU.mus.gain.setTargetAtTime(save.music ? 0.32 : 0, t, 0.1);
}
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

// ---- bouwstenen ----
function tone(o) {
  const c = AU.ctx; if (!c) return;
  const t = (o.at || c.currentTime) + (o.delay || 0), dur = o.dur || 0.15;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide || dur));
  if (o.detune) osc.detune.value = o.detune;
  const v = o.vol === undefined ? 0.3 : o.vol;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  let out = g;
  if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 1; g.connect(f); out = f; }
  out.connect(o.to || AU.sfx);
  if (o.echo) out.connect(AU.delay);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function noise(o) {
  const c = AU.ctx; if (!c) return;
  const t = (o.at || c.currentTime) + (o.delay || 0), dur = o.dur || 0.1;
  const src = c.createBufferSource(); src.buffer = AU.noise;
  src.playbackRate.value = o.rate || 1;
  const f = c.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 2000, t); f.Q.value = o.q || 1;
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  const g = c.createGain(); const v = o.vol === undefined ? 0.3 : o.vol;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(o.to || AU.sfx);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}

// =====================================================================
//  Geluidseffecten
// =====================================================================
const Sfx = {
  quiet: false,
  ok() { return AU.ctx && save.sound && !this.quiet; },
  click() { if (!this.ok()) return; tone({ f: 700, f2: 1100, dur: 0.06, type: 'triangle', vol: 0.15 }); },
  flap() {
    if (!this.ok()) return;
    const p = rand(0.92, 1.08);
    noise({ f: 1400 * p, f2: 500, dur: 0.12, q: 0.8, vol: 0.22 });
    tone({ f: 380 * p, f2: 720 * p, dur: 0.09, type: 'triangle', vol: 0.12 });
  },
  score(n) {
    if (!this.ok()) return;
    const b = 72 + (n % 5) * 2;
    tone({ f: midiHz(b), dur: 0.12, type: 'square', vol: 0.08, lp: 3000 });
    tone({ f: midiHz(b + 7), dur: 0.22, type: 'triangle', vol: 0.16, delay: 0.06, echo: true });
  },
  perfect(k) {
    if (!this.ok()) return;
    const base = 76 + Math.min(k, 8);
    [0, 4, 7, 12].forEach((s, i) => tone({ f: midiHz(base + s), dur: 0.16, type: 'square', vol: 0.07, delay: i * 0.045, lp: 4000, echo: i === 3 }));
  },
  pit(k) {
    if (!this.ok()) return;
    tone({ f: midiHz(88 + (k % 6)), f2: midiHz(95 + (k % 6)), dur: 0.08, type: 'sine', vol: 0.12, slide: 0.04 });
  },
  power() {
    if (!this.ok()) return;
    [0, 4, 7, 11, 12, 16, 19, 24].forEach((s, i) => tone({ f: midiHz(64 + s), dur: 0.1, type: 'square', vol: 0.06, delay: i * 0.035, lp: 5000 }));
    noise({ f: 3000, f2: 9000, dur: 0.35, q: 0.5, vol: 0.08, ft: 'highpass' });
  },
  smash() {
    if (!this.ok()) return;
    noise({ f: 900, f2: 200, dur: 0.3, q: 0.7, vol: 0.45 });
    noise({ f: 3000, dur: 0.12, q: 1.5, vol: 0.2, delay: 0.02 });
    tone({ f: 160, f2: 50, dur: 0.25, type: 'sine', vol: 0.5 });
  },
  shield() {
    if (!this.ok()) return;
    tone({ f: 900, f2: 300, dur: 0.3, type: 'sawtooth', vol: 0.08, lp: 2500 });
    this.smash();
  },
  hit() {
    if (!this.ok()) return;
    noise({ f: 600, f2: 120, dur: 0.35, q: 0.6, vol: 0.5 });
    tone({ f: 220, f2: 40, dur: 0.4, type: 'sine', vol: 0.55 });
    tone({ f: 520, f2: 140, dur: 0.5, type: 'square', vol: 0.06, lp: 1500, delay: 0.1 });
  },
  bonk() { if (!this.ok()) return; tone({ f: 120, f2: 60, dur: 0.18, type: 'sine', vol: 0.4 }); noise({ f: 300, dur: 0.12, vol: 0.2 }); },
  over() {
    if (!this.ok()) return;
    [67, 64, 60, 55].forEach((m, i) => tone({ f: midiHz(m), dur: 0.25, type: 'triangle', vol: 0.16, delay: 0.15 + i * 0.13 }));
  },
  record() {
    if (!this.ok()) return;
    const n = [60, 64, 67, 72, 67, 72, 76, 79, 84];
    n.forEach((m, i) => tone({ f: midiHz(m), dur: i === n.length - 1 ? 0.6 : 0.14, type: 'square', vol: 0.07, delay: i * 0.09, lp: 4000, echo: true }));
  },
  whoosh() {
    if (!this.ok()) return;
    noise({ f: 300, f2: 6000, dur: 0.7, q: 2, vol: 0.25 });
    tone({ f: 200, f2: 1600, dur: 0.6, type: 'sawtooth', vol: 0.05, lp: 3000 });
    [0, 7, 12, 19, 24].forEach((s, i) => tone({ f: midiHz(72 + s), dur: 0.2, type: 'triangle', vol: 0.1, delay: 0.35 + i * 0.05, echo: true }));
  },
  revive() {
    if (!this.ok()) return;
    [60, 67, 72, 79, 84].forEach((m, i) => tone({ f: midiHz(m), dur: 0.3, type: 'sine', vol: 0.15, delay: i * 0.07, echo: true }));
  },
  buy() {
    if (!this.ok()) return;
    [72, 76, 79, 84].forEach((m, i) => tone({ f: midiHz(m), dur: 0.12, type: 'square', vol: 0.07, delay: i * 0.05, lp: 4500 }));
    noise({ f: 6000, dur: 0.2, vol: 0.06, ft: 'highpass' });
  },
  nope() { if (!this.ok()) return; tone({ f: 200, f2: 150, dur: 0.18, type: 'square', vol: 0.08, lp: 1200 }); },
};

// =====================================================================
//  Muziek: een kleine sequencer, per stijl een eigen liedje
// =====================================================================
// Elke maat heeft 16 zestienden. Akkoord = prog[maat % 4] (trap in de toonladder). De melodie wordt per maat
// uit een vaste seed gemaakt, zodat het liedje elke 4 maten terugkomt (pakkend) en per stijl anders klinkt.
const DRUMS = {
  pop:   { k: [0, 8, 10], s: [4, 12], h: [2, 6, 10, 14] },
  chill: { k: [0, 7, 10], s: [8], h: [0, 4, 8, 12] },
  four:  { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14] },
  chip:  { k: [0, 6, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  rock:  { k: [0, 3, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  disco: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], o: true },
};
const Music = {
  theme: null, next: null, step: 0, nextT: 0, timer: 0, kicks: [], intensity: 0, tempoK: 1,
  start() {
    if (this.timer || !AU.ctx) return;
    this.nextT = AU.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 25);
  },
  setTheme(th) { if (!this.theme) this.theme = th; else if (th !== this.theme) this.next = th; },
  tick() {
    const c = AU.ctx; if (!c || !this.theme) return;
    if (c.state !== 'running') { this.nextT = c.currentTime + 0.05; return; }
    if (this.nextT < c.currentTime - 0.3) this.nextT = c.currentTime + 0.05; // tab was weg: niet inhalen
    while (this.nextT < c.currentTime + 0.12) {
      if (this.step % 16 === 0 && this.next) { this.theme = this.next; this.next = null; }
      this.play(this.step, this.nextT);
      const m = this.theme.music;
      this.nextT += 60 / (m.bpm * this.tempoK) / 4;
      this.step++;
    }
  },
  play(step, t) {
    const m = this.theme.music, s = step % 16, bar = Math.floor(step / 16);
    const sc = SCALES[m.scale], prog = m.prog, deg = prog[bar % prog.length];
    const note = (d, oct) => m.root + 12 * (oct + Math.floor(d / sc.length)) + sc[mod(d, sc.length)];
    const dr = DRUMS[m.drums], on = save.music;
    if (!on) { if (dr.k.includes(s)) this.kicks.push(t); this.trim(); return; }
    const out = AU.mus;
    // drums
    if (dr.k.includes(s)) {
      tone({ at: t, f: 150, f2: 45, dur: 0.22, slide: 0.12, type: 'sine', vol: 0.55, to: out });
      this.kicks.push(t);
    }
    if (dr.s.includes(s)) noise({ at: t, f: 1800, dur: m.drums === 'chill' ? 0.08 : 0.16, q: 0.8, vol: 0.22, to: out });
    const hatMore = this.intensity > 0.4 && s % 2 === 1 && m.drums !== 'chill';
    if (dr.h.includes(s) || hatMore) noise({ at: t, f: 9000, dur: dr.o && s % 4 === 2 ? 0.12 : 0.035, q: 0.6, vol: hatMore ? 0.05 : 0.08, ft: 'highpass', to: out });
    // bas
    const bassHits = m.drums === 'disco' ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 3, 6, 8, 11, 14];
    if (bassHits.includes(s)) {
      const oct = m.drums === 'disco' && s % 4 === 2 ? -1 : -2;
      tone({ at: t, f: midiHz(note(deg, oct)), dur: 0.18, type: m.bass, vol: m.bass === 'sawtooth' ? 0.12 : 0.22, lp: 900, q: 4, to: out });
    }
    // arpeggio
    if (s % 2 === 0) {
      const ch = [0, 2, 4, 7][(s / 2) % 4];
      tone({ at: t, f: midiHz(note(deg + ch, 0)), dur: 0.12, type: m.lead === 'sawtooth' ? 'triangle' : m.lead, vol: 0.035, lp: 3500, to: out });
    }
    // melodie (vaste seed per maat in een blok van 4)
    const seed = bar % 4 + THEMES.indexOf(this.theme) * 13;
    if (hash(seed * 16 + s, 7) < (s % 4 === 0 ? 0.7 : s % 2 === 0 ? 0.35 : 0.1)) {
      const d = deg + Math.floor(hash(seed * 16 + s, 9) * 7) - 1;
      tone({ at: t, f: midiHz(note(d, 1)), dur: 0.2, type: m.lead, vol: m.lead === 'sine' ? 0.09 : 0.045, lp: 3000, att: 0.01, to: out, echo: true });
    }
    // pad-akkoord aan het begin van de maat
    if (s === 0) [0, 2, 4].forEach(o => tone({ at: t, f: midiHz(note(deg + o, 0)), dur: 60 / m.bpm * 3.6, type: 'triangle', vol: 0.025, att: 0.3, lp: 1500, to: out }));
    this.trim();
  },
  trim() { const c = AU.ctx; while (this.kicks.length > 1 && this.kicks[1] <= c.currentTime) this.kicks.shift(); },
  // 1 vlak na een bassdrum, zakt daarna weg: voor beelden die meebewegen met de muziek
  pulse() {
    const c = AU.ctx;
    if (!c || c.state !== 'running' || !this.kicks.length) return Math.pow(1 - (performance.now() / 500) % 1, 3);
    const k = this.kicks[0];
    const dt = c.currentTime - k;
    return dt < 0 ? 0 : Math.exp(-dt * 7);
  },
};
