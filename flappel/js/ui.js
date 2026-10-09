'use strict';
// Flappel · menu's
// Schermen wisselen, de winkel, skins, het eindscherm en de knoppen.

let curScreen = 'menu';
const SCREENS = { menu: 'scrMenu', over: 'scrOver', pause: 'scrPause', shop: 'scrShop', skins: 'scrSkins', account: 'scrAccount', lb: 'scrLb' };
let shopBack = 'menu';
function showScreen(id) {
  curScreen = id;
  for (const k in SCREENS) $(SCREENS[k]).classList.toggle('active', k === id);
  $('btnPause').classList.toggle('hidden', id !== null || !(S.mode === 'play' || S.mode === 'ready'));
  if (id === 'menu' || id === 'over') uiRefresh();
  if (document.activeElement && document.activeElement.blur && id === null) document.activeElement.blur();
}
const canAfford = () => UPGRADES.some(u => upLv(u.id) < u.max && save.pitten >= u.cost[upLv(u.id)]);
function uiRefresh() {
  $('mBest').textContent = save.best;
  $('mPitten').textContent = save.pitten;
  const aff = canAfford();
  $('shopBadge').classList.toggle('hidden', !aff);
  $('shopBadge2').classList.toggle('hidden', !aff);
  $('btnSound').classList.toggle('off', !save.sound);
  $('btnMusic').classList.toggle('off', !save.music);
  $('btnCalm').classList.toggle('off', save.calm);
  $('btnCalm').textContent = save.calm ? '🌙' : '✨';
  $('btnCalm').title = save.calm ? 'Rustige effecten staan aan' : 'Rustige effecten (minder flitsen en schudden)';
}

// ---- spelen ----
function startGame() {
  audioInit();
  newRun(false);
  showScreen(null);
}
function toMenu() {
  newRun(true);
  showScreen('menu');
}
function pauseGame() {
  if (S.mode !== 'play' && S.mode !== 'ready') return;
  S.paused = S.mode; S.mode = 'pause';
  showScreen('pause');
}
function resumeGame() {
  if (S.mode !== 'pause') return;
  S.mode = S.paused; showScreen(null);
}

// ---- eindscherm ----
const OVER_TITLES = ['SPLAT!', 'KIWI\'D!', 'OEPS!', 'AU!', 'BONK!', 'PLOF!', 'NEEE!'];
const MEDALS = [[150, '🌈'], [100, '💎'], [50, '🥇'], [25, '🥈'], [10, '🥉'], [0, '🍏']];
let overAt = 0;
function uiGameOver(r) {
  $('oTitle').textContent = r.rec ? 'WAUW!' : pick(OVER_TITLES);
  $('oTitle').style.color = r.rec ? '#ffe14d' : '#ff5a5a';
  $('oTitle').classList.remove('wobble'); void $('oTitle').offsetWidth; $('oTitle').classList.add('wobble');
  $('oScore').textContent = r.score;
  $('oBest').textContent = r.best;
  $('oNew').classList.toggle('hidden', !r.rec);
  $('oMedal').textContent = MEDALS.find(m => r.score >= m[0])[1];
  $('oPit').textContent = r.earned;
  const mult = upEff('value');
  $('oPitInfo').textContent = `${r.coins} gepakt + ${r.score} voor je score` + (mult > 1 ? ` · oogst ×${mult.toFixed(2).replace(/\.?0+$/, '')}` : '');
  let lb = '';
  if (sbOn() && !ACC.user) lb = '👤 Log in om op de ranglijst te komen.';
  else if (sbOn() && !ACC.username) lb = '👤 Kies een gebruikersnaam om op de ranglijst te komen.';
  else if (r.rec && sbOn()) lb = '🏆 Je record staat op de ranglijst!';
  $('oLb').textContent = lb; $('oLb').className = 'msg ok';
  overAt = performance.now();
  showScreen('over');
}

// ---- winkel ----
function renderShop() {
  $('shopPit').textContent = save.pitten;
  $('shopList').innerHTML = UPGRADES.map(u => {
    const lv = upLv(u.id), max = lv >= u.max, cost = max ? 0 : u.cost[lv];
    const now = lv ? u.info(lv) : '', next = max ? '' : u.info(lv + 1);
    return `<div class="item ${max ? 'max' : ''}">
      <div class="ic">${u.icon}</div><div class="nm">${u.name}</div>
      <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <div class="ds">${max ? `<b>${escHtml(now)}</b><br>MAXIMAAL!` : (now ? escHtml(now) + '<br>' : '') + `→ <b>${escHtml(next)}</b>`}</div>
      <button class="btn ${max ? 'purple' : save.pitten >= cost ? 'play-s' : 'blue'}" data-up="${u.id}" ${max ? 'disabled' : ''}>${max ? '★ MAX' : `<i class="pit"></i> ${cost}`}</button>
    </div>`;
  }).join('');
  $('shopList').querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => buyUpgrade(b.dataset.up, b)));
}
function buyUpgrade(id, el) {
  const u = UP_BY_ID[id], lv = upLv(id);
  if (lv >= u.max) return;
  const cost = u.cost[lv];
  if (save.pitten < cost) { Sfx.nope(); el.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 220, iterations: 2 }); return; }
  save.pitten -= cost; save.upgrades[id] = lv + 1; persist();
  Sfx.buy();
  renderShop();
  confettiAt(el);
}
function openShop(from) { shopBack = from || 'menu'; audioInit(); renderShop(); showScreen('shop'); }

// ---- skins ----
function renderSkins() {
  $('skinPit').textContent = save.pitten;
  $('skinList').innerHTML = SKINS.map(s => {
    const own = save.skins.includes(s.id), sel = save.skin === s.id;
    const label = sel ? '✔ GEKOZEN' : own ? 'KIEZEN' : `<i class="pit"></i> ${s.cost}`;
    return `<div class="item ${sel ? 'sel' : ''}"><canvas data-skin="${s.id}" width="192" height="192"></canvas><div class="nm">${s.name}</div>
      <button class="btn ${sel ? 'teal' : own ? 'purple' : save.pitten >= s.cost ? 'play-s' : 'blue'}" data-sk="${s.id}" ${sel ? 'disabled' : ''}>${label}</button></div>`;
  }).join('');
  $('skinList').querySelectorAll('[data-sk]').forEach(b => b.addEventListener('click', () => pickSkin(b.dataset.sk, b)));
}
function drawSkinPreviews() {
  if (curScreen !== 'skins') return;
  $('skinList').querySelectorAll('canvas').forEach(c => {
    const g = c.getContext('2d'), sk = SKIN_BY_ID[c.dataset.skin];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.setTransform(3.2, 0, 0, 3.2, 96, 100);
    const t = performance.now() / 1000;
    drawApple(g, { x: 0, y: Math.sin(t * 3 + c.dataset.skin.length) * 3, rot: Math.sin(t * 2) * 0.1, s: 1, wing: (t * 2.5) % 1, mood: save.skin === sk.id ? 'yay' : 'happy', look: 0 }, sk, t);
  });
}
function pickSkin(id, el) {
  const s = SKIN_BY_ID[id];
  if (!save.skins.includes(id)) {
    if (save.pitten < s.cost) { Sfx.nope(); return; }
    save.pitten -= s.cost; save.skins.push(id);
    Sfx.buy(); confettiAt(el);
  } else Sfx.click();
  save.skin = id; persist();
  renderSkins();
}
function openSkins() { audioInit(); renderSkins(); showScreen('skins'); }

// confetti uit een knop (in de wereld, achter de kaart)
function confettiAt(el) {
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width / 2) / V.scale, y = (r.top + r.height / 2) / V.scale;
  burst(x, y, 40, { type: 'conf', c: 'rainbow', min: 120, max: 420, g: 500, life: 1.4 });
}

function uiInit() {
  $('hubLink').href = CONFIG.hubUrl;
  on('btnPlay', startGame);
  on('btnAgain', startGame);
  on('btnShop', () => openShop('menu'));
  on('btnOverShop', () => openShop('over'));
  on('btnShopBack', () => showScreen(shopBack));
  on('btnSkins', openSkins);
  on('btnSkinsBack', () => showScreen('menu'));
  on('btnOverMenu', toMenu);
  on('btnPause', pauseGame);
  on('btnResume', resumeGame);
  on('btnPauseMenu', () => { S.mode = 'over'; toMenu(); });
  on('btnSound', () => { save.sound = !save.sound; persist(); audioInit(); audioApply(); uiRefresh(); });
  on('btnMusic', () => { save.music = !save.music; persist(); audioInit(); audioApply(); uiRefresh(); });
  on('btnCalm', () => { save.calm = !save.calm; persist(); uiRefresh(); });
  uiRefresh();
}
