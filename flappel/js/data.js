'use strict';
// Flappel · inhoud en balans
// Constanten, stijlen (thema's), upgrades, skins, power-ups en de save.

// =====================================================================
//  Balans: alles in wereld-eenheden (het speelveld is minstens 600 hoog)
// =====================================================================
const WORLD_H = 600;          // hoogte van het speelveld waar het beeld op schaalt
const WORLD_MIN_W = 400;      // smaller wordt het speelveld nooit (telefoon rechtop)
const GROUND_H = 64;          // hoogte van de grond
const JUMP_H = 62;            // hoe hoog een fladder de appel tilt (onafhankelijk van de zwaartekracht)
const GRAVITY = 1250;
const MAX_FALL = 600;
const APPLE_R = 22;           // tekenformaat van de appel
const HIT_R = 14;             // botsingsstraal: flink kleiner dan de tekening, zodat schampen mag
const PIPE_W = 80;
const CAP_H = 30, CAP_OVER = 8;
const SPEED0 = 150, SPEED_MAX = 225, SPEED_UP = 1.6;   // snelheid: start, plafond, erbij per buis
const GAP0 = 215, GAP_MIN = 168, GAP_DOWN = 1.4;       // gat tussen de buizen: start, minimum, eraf per buis
const SPACE0 = 285, SPACE_MIN = 240;                    // afstand tussen buizen
const THEME_EVERY = 8;        // elke zoveel punten een nieuwe stijl
const PERFECT_D = 20;         // zo dicht bij het midden van het gat = PERFECT

// =====================================================================
//  Stijlen: de wereld wisselt tijdens het spelen (tekenen: render-bg.js, muziek: audio.js)
// =====================================================================
// pipe: hoe de kiwibuizen eruitzien ('kiwi', 'neon', 'sketch', 'candy', 'ice'), tint: kleur over de buizen
// music: bpm, grondtoon (midi), toonladder, akkoordenschema (trappen), klankkleuren en drumstijl
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], penta: [0, 2, 4, 7, 9, 12, 14], mixo: [0, 2, 4, 5, 7, 9, 10] };
const THEMES = [
  { id: 'boomgaard', name: 'Zonnige Boomgaard', emoji: '🌳', pipe: 'kiwi', tint: null, text: '#fff', glow: '#ffe66b',
    music: { bpm: 122, root: 60, scale: 'major', prog: [0, 4, 5, 3], lead: 'square', bass: 'triangle', drums: 'pop' } },
  { id: 'zonsondergang', name: 'Zonsondergang', emoji: '🌅', pipe: 'kiwi', tint: ['#ff6a3d', 0.18], text: '#fff', glow: '#ffb86b',
    music: { bpm: 104, root: 57, scale: 'dorian', prog: [0, 3, 6, 4], lead: 'triangle', bass: 'sine', drums: 'chill' } },
  { id: 'onderwater', name: 'Onderwaterwereld', emoji: '🐠', pipe: 'kiwi', tint: ['#2d8cff', 0.22], text: '#fff', glow: '#7ff3ff',
    music: { bpm: 96, root: 62, scale: 'penta', prog: [0, 5, 3, 4], lead: 'sine', bass: 'triangle', drums: 'chill' } },
  { id: 'synthwave', name: 'Synthwave', emoji: '🌆', pipe: 'neon', tint: null, text: '#ffe8ff', glow: '#ff3df5',
    music: { bpm: 118, root: 57, scale: 'minor', prog: [0, 5, 2, 6], lead: 'sawtooth', bass: 'sawtooth', drums: 'four' } },
  { id: 'snoepland', name: 'Snoepland', emoji: '🍭', pipe: 'candy', tint: null, text: '#fff', glow: '#ff8ad8',
    music: { bpm: 132, root: 65, scale: 'major', prog: [0, 3, 4, 3], lead: 'square', bass: 'square', drums: 'pop' } },
  { id: 'ruimte', name: 'De Ruimte', emoji: '🚀', pipe: 'kiwi', tint: ['#6a3dff', 0.25], text: '#fff', glow: '#a98bff',
    music: { bpm: 110, root: 55, scale: 'minor', prog: [0, 6, 5, 4], lead: 'triangle', bass: 'sawtooth', drums: 'four' } },
  { id: 'pixel', name: 'Pixelwereld', emoji: '👾', pipe: 'kiwi', tint: null, pixel: true, text: '#fff', glow: '#fff36b',
    music: { bpm: 140, root: 60, scale: 'major', prog: [0, 5, 3, 4], lead: 'square', bass: 'square', drums: 'chip' } },
  { id: 'winter', name: 'Winterwonderland', emoji: '❄️', pipe: 'ice', tint: null, text: '#fff', glow: '#9ffcff',
    music: { bpm: 100, root: 64, scale: 'major', prog: [0, 5, 3, 4], lead: 'sine', bass: 'triangle', drums: 'chill' } },
  { id: 'vulkaan', name: 'Vulkaaneiland', emoji: '🌋', pipe: 'kiwi', tint: ['#ff3a1a', 0.2], text: '#fff', glow: '#ff9a3d',
    music: { bpm: 128, root: 52, scale: 'minor', prog: [0, 0, 5, 6], lead: 'sawtooth', bass: 'sawtooth', drums: 'rock' } },
  { id: 'tekenland', name: 'Tekenland', emoji: '✏️', pipe: 'sketch', tint: null, text: '#2a2a6a', glow: '#3a6bff',
    music: { bpm: 112, root: 62, scale: 'mixo', prog: [0, 3, 0, 4], lead: 'triangle', bass: 'triangle', drums: 'pop' } },
  { id: 'disco', name: 'Disco Inferno', emoji: '🪩', pipe: 'neon', tint: null, text: '#fff', glow: '#ffef3d',
    music: { bpm: 124, root: 58, scale: 'dorian', prog: [0, 3, 0, 4], lead: 'square', bass: 'sawtooth', drums: 'disco' } },
];
const THEME_BY_ID = Object.fromEntries(THEMES.map((t, i) => [t.id, i]));

// =====================================================================
//  Power-ups: zwevende bellen in de gaten
// =====================================================================
const POWERS = {
  star:   { icon: '⭐', name: 'Superster', dur: 6, color: '#ffd23d', desc: 'Je bent onkwetsbaar en ramt kiwi\'s kapot' },
  rocket: { icon: '🚀', name: 'Raket', dur: 3.2, color: '#ff5a3d', desc: 'Volle vaart vooruit, vanzelf door de gaten' },
  magnet: { icon: '🧲', name: 'Magneet', dur: 9, color: '#ff4d8d', desc: 'Pitten vliegen naar je toe' },
  double: { icon: '✖️2', name: 'Dubbel', dur: 10, color: '#3dff8b', desc: 'Dubbele punten en pitten' },
  slow:   { icon: '🐌', name: 'Slowmo', dur: 6, color: '#3dc8ff', desc: 'Alles gaat langzamer' },
  mini:   { icon: '🍒', name: 'Mini-appel', dur: 9, color: '#c43dff', desc: 'Je bent piepklein' },
};
const POWER_IDS = Object.keys(POWERS);

// =====================================================================
//  Upgrades: blijvend, te koop met pitten
// =====================================================================
// eff(lv) geeft de waarde bij een niveau; info(lv) de tekst op de kaart
const UPGRADES = [
  { id: 'gap', icon: '↕️', name: 'Brede buizen', max: 5, cost: [30, 70, 140, 240, 380], eff: lv => lv * 7,
    info: lv => `Gaten ${lv * 7} groter` },
  { id: 'shield', icon: '🛡️', name: 'Kiwischild', max: 3, cost: [60, 200, 480], eff: lv => lv,
    info: lv => lv ? `Start met ${lv} schild${lv > 1 ? 'en' : ''}` : 'Een botsing ramt de kiwi kapot' },
  { id: 'float', icon: '🪶', name: 'Zweefblaadjes', max: 5, cost: [40, 90, 170, 280, 420], eff: lv => 1 - lv * 0.05,
    info: lv => `${lv * 5}% zachter vallen` },
  { id: 'revive', icon: '❤️', name: 'Tweede kans', max: 2, cost: [150, 600], eff: lv => lv,
    info: lv => lv ? `${lv}× per potje opnieuw` : 'Ga door na een botsing' },
  { id: 'magnet', icon: '🧲', name: 'Pittenmagneet', max: 5, cost: [35, 80, 150, 250, 400], eff: lv => lv * 16,
    info: lv => `Pakt pitten tot ${22 + lv * 16} ver` },
  { id: 'value', icon: '💰', name: 'Pittenoogst', max: 5, cost: [50, 120, 220, 360, 550], eff: lv => 1 + lv * 0.25,
    info: lv => `+${lv * 25}% pitten` },
  { id: 'luck', icon: '🍀', name: 'Klavertje vier', max: 5, cost: [45, 100, 180, 300, 450], eff: lv => 9 - lv,
    info: lv => `Elke ${9 - lv} buizen een power-up` },
  { id: 'power', icon: '⏳', name: 'Power-boost', max: 5, cost: [40, 95, 175, 290, 440], eff: lv => 1 + lv * 0.15,
    info: lv => `Power-ups ${lv * 15}% langer` },
  { id: 'start', icon: '🚀', name: 'Raketstart', max: 3, cost: [120, 300, 650], eff: lv => lv * 3.2,
    info: lv => lv ? `Start met ${Math.round(lv * 3.2)} s raket` : 'Begin met een raketvlucht' },
];
const UP_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// =====================================================================
//  Skins: hoe je appel eruitziet (tekenen: render-apple.js)
// =====================================================================
// c: [licht, basis, donker, rand], trail: spoortje
const SKINS = [
  { id: 'rood', name: 'Rode Appel', cost: 0, c: ['#ff8a7a', '#ef2b2b', '#a8121a', '#5c0710'], trail: 'spark' },
  { id: 'groen', name: 'Granny Smith', cost: 120, c: ['#d8ff8a', '#7ed321', '#3f8f12', '#1f4d06'], trail: 'leaf' },
  { id: 'roze', name: 'Pink Lady', cost: 180, c: ['#ffd1e8', '#ff6fb5', '#c43a82', '#6a1240'], trail: 'heart' },
  { id: 'toffee', name: 'Toffee-appel', cost: 320, c: ['#ffd9a0', '#d9822b', '#8a4a10', '#4a2405'], trail: 'spark', stick: true },
  { id: 'goud', name: 'Gouden Appel', cost: 500, c: ['#fff6b0', '#ffc928', '#c98a00', '#6b4500'], trail: 'gold', shine: true },
  { id: 'ijs', name: 'IJsappel', cost: 650, c: ['#ffffff', '#9ae8ff', '#3fa6d8', '#14506e'], trail: 'snow', shine: true },
  { id: 'regenboog', name: 'Regenboog', cost: 900, c: ['#fff', '#f33', '#a00', '#400'], trail: 'rainbow', rainbow: true },
  { id: 'galaxy', name: 'Galaxy-appel', cost: 1200, c: ['#b28bff', '#3a1a8a', '#1a0a45', '#05020f'], trail: 'stars', galaxy: true },
  { id: 'diamant', name: 'Diamant', cost: 1800, c: ['#ffffff', '#7ff6ff', '#2bb8d8', '#0b4f63'], trail: 'gold', diamond: true, shine: true },
];
const SKIN_BY_ID = Object.fromEntries(SKINS.map(s => [s.id, s]));

// =====================================================================
//  Opslag (localStorage; online via een account, zie online.js)
// =====================================================================
const SAVE_KEY = 'flappel.save.v1';
function defaultSave() {
  return { v: 1, pitten: 0, best: 0, runs: 0, total: 0, upgrades: {}, skins: ['rood'], skin: 'rood', sound: true, music: true, calm: false };
}
function normalizeSave(o) {
  const s = defaultSave();
  for (const u of UPGRADES) s.upgrades[u.id] = 0;
  if (!o || typeof o !== 'object') return s;
  const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  s.pitten = Math.min(num(o.pitten), 1e7);
  s.best = Math.min(num(o.best), 100000);
  s.runs = num(o.runs);
  s.total = num(o.total);
  const up = (o.upgrades && typeof o.upgrades === 'object') ? o.upgrades : {};
  for (const u of UPGRADES) s.upgrades[u.id] = clamp(num(up[u.id]), 0, u.max);
  s.skins = [...new Set(['rood', ...(Array.isArray(o.skins) ? o.skins.filter(id => SKIN_BY_ID[id]) : [])])];
  s.skin = s.skins.includes(o.skin) ? o.skin : 'rood';
  s.sound = o.sound !== false;
  s.music = o.music !== false;
  s.calm = o.calm === true;
  return s;
}
function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return normalizeSave(JSON.parse(raw)); } catch (e) { /* kapotte of geblokkeerde opslag */ }
  return normalizeSave(null);
}
function persist() {
  try { cloudDirty(); } catch (e) { /* account-code nog niet geladen */ }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch (e) { return false; }
}
let save = loadSave();
const upLv = id => save.upgrades[id] || 0;
const upEff = id => UP_BY_ID[id].eff(upLv(id));
