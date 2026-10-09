// Flappel · rooktest
// Start een kleine webserver, opent het keuzescherm en Flappel in headless Chromium en klikt alles door:
// spelen, alle stijlen, alle power-ups, schild en tweede kans, winkel, skins, account (met een nep-Supabase) en de ranglijst.
// Faalt bij elke JavaScript-fout. Meet ook hoe ver een simpele computerspeler komt (is het spel makkelijk genoeg?).
//   node tools/smoke.mjs            (Node 18+, en Playwright: npm i -g playwright)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pw;
for (const m of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) { try { pw = await import(m); break; } catch (e) { /* volgende */ } }
if (!pw) { console.error('Playwright niet gevonden: npm i -g playwright'); process.exit(2); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;

// nep-Supabase: genoeg om inloggen, de online save en de ranglijst te testen
const MOCK = () => {
  const user = { id: 'u1', email: 'test@example.com', user_metadata: {} };
  let cb = null, on = false;
  const table = { profiles: [{ username: 'Tester' }], flappel_leaderboard: [{ name: 'Tester', score: 12 }, { name: 'Kiwi', score: 9 }] };
  const q = (rows) => {
    const b = { select: () => b, eq: () => b, order: () => b, limit: () => Promise.resolve({ data: rows, error: null }),
      maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }), upsert: () => Promise.resolve({ error: null }) };
    return b;
  };
  window.__mock = { user, rpcs: [] };
  window.supabase = { createClient: () => ({
    auth: {
      onAuthStateChange(f) { cb = f; if (on) setTimeout(() => f('INITIAL_SESSION', { user }), 0); },
      async signInWithPassword() { on = true; setTimeout(() => cb && cb('SIGNED_IN', { user }), 0); return { data: { user, session: {} }, error: null }; },
      async signUp() { return { data: { user, session: null }, error: null }; },
      async getUser() { return { data: { user }, error: null }; },
      async updateUser(o) { Object.assign(user.user_metadata, o.data); return { data: { user }, error: null }; },
      async signOut() { on = false; cb && cb('SIGNED_OUT', null); return { error: null }; },
    },
    from: t => q(table[t] || []),
    async rpc(name, args) { window.__mock.rpcs.push([name, args]); return { error: null }; },
  }) };
};

const b = await pw.chromium.launch();
const errs = [];
const page = async (vp) => {
  const p = await b.newPage({ viewport: vp || { width: 1100, height: 650 } });
  p.on('pageerror', e => errs.push('JS-fout: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) errs.push('console.error: ' + m.text()); });
  await p.addInitScript(MOCK);
  return p;
};
const ok = (c, msg) => { if (!c) errs.push('Mislukt: ' + msg); else console.log('  ✓ ' + msg); };

// ---- keuzescherm ----
{
  const p = await page();
  await p.goto(BASE + '/game/');
  await p.waitForTimeout(600);
  ok(await p.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0)), 'keuzescherm: alle plaatjes geladen');
  ok(await p.evaluate(() => document.querySelector('.game.andy').getAttribute('href') === '../appel' && document.querySelector('.game.flappel').getAttribute('href') === '../flappel'), 'keuzescherm: links naar /appel en /flappel');
  await p.click('.game.flappel', { force: true });
  await p.waitForURL(/\/flappel\/?$/, { timeout: 5000 }).catch(() => {});
  ok(/\/flappel\/?$/.test(p.url()), 'keuzescherm: klik op Flappel opent /flappel');
  await p.close();
}

// ---- Flappel ----
const p = await page();
await p.goto(BASE + '/flappel/');
await p.waitForTimeout(800);
const ev = (f, a) => p.evaluate(f, a);
// laat de appel zelf spelen (zoals in het menu)
const autoplay = (ms) => ev(ms => new Promise(res => {
  const t0 = performance.now();
  const id = setInterval(() => { if (S.mode === 'play') demoAI(); if (performance.now() - t0 > ms) { clearInterval(id); res(); } }, 16);
}), ms);
ok(await ev(() => S.mode === 'demo' && curScreen === 'menu'), 'menu met demo erachter');
await p.click('#btnPlay', { force: true });
ok(await ev(() => S.mode === 'ready'), 'spelen: wacht op de eerste tik');
await p.keyboard.press('Space');
ok(await ev(() => S.mode === 'play'), 'spatie start het spel');
await autoplay(2500);
for (let i = 0; i < THEMES_N(); i++) { await ev(i => { setTheme(i, true); S.inv = 9; }, i); await p.waitForTimeout(250); }
function THEMES_N() { return 11; }
ok(true, 'alle 11 stijlen getekend (ook tijdens de wissel)');
for (const k of ['star', 'rocket', 'magnet', 'double', 'slow', 'mini']) { await ev(k => givePower(k, 1.2), k); await autoplay(400); }
ok(true, 'alle power-ups');
await ev(() => { for (const k in S.pow) delete S.pow[k]; S.inv = 0; S.shields = 1; S.revives = 1; S.A.y = V.gy + 5; });
await p.waitForTimeout(150);
ok(await ev(() => S.shields === 0 && S.mode === 'play'), 'schild vangt een botsing op');
await ev(() => { S.inv = 0; S.A.y = V.gy + 5; });
await p.waitForTimeout(150);
ok(await ev(() => S.revives === 0 && S.mode === 'play'), 'tweede kans');
await ev(() => { S.inv = 0; S.A.y = V.gy + 5; });
await p.waitForTimeout(1600);
ok(await ev(() => S.mode === 'over' && curScreen === 'over' && save.runs === 1), 'game over en het eindscherm');
// winkel en skins
await ev(() => { save.pitten = 5000; persist(); });
await p.click('#btnOverShop', { force: true });
await p.click('[data-up="gap"]', { force: true });
ok(await ev(() => save.upgrades.gap === 1 && save.pitten < 5000), 'upgrade kopen');
await p.click('#btnShopBack', { force: true });
await p.waitForTimeout(350);
await p.click('#btnOverMenu', { force: true });
await p.waitForTimeout(350);
await p.click('#btnSkins', { force: true });
await p.waitForTimeout(350);
await p.click('[data-sk="goud"]', { force: true });
ok(await ev(() => save.skin === 'goud' && save.skins.includes('goud')), 'skin kopen en kiezen');
await p.waitForTimeout(300);
await p.click('#btnSkinsBack', { force: true });
await p.waitForTimeout(350);
// account (nep-Supabase)
await p.click('#btnAccount', { force: true });
await p.fill('#accEmail', 'test@example.com');
await p.fill('#accPass', 'geheim123');
await p.click('#btnAccLogin', { force: true });
await p.waitForTimeout(800);
ok(await ev(() => ACC.user && ACC.username === 'Tester'), 'inloggen en de gebruikersnaam ophalen');
ok(await ev(() => !!(__mock.user.user_metadata.flappel && __mock.user.user_metadata.flappel.skin === 'goud')), 'voortgang online bewaard (user_metadata.flappel)');
ok(await ev(() => __mock.rpcs.some(r => r[0] === 'flappel_submit')), 'record naar de ranglijst gestuurd');
await p.click('#btnAccBack', { force: true });
await p.waitForTimeout(350);
await p.click('#btnLb', { force: true });
await p.waitForTimeout(400);
ok(await ev(() => document.querySelectorAll('#lbList li').length === 2 && document.querySelector('#lbList li.me')), 'ranglijst met jezelf gemarkeerd');

// ---- balans: hoe ver komt een simpele computerspeler (zonder upgrades)? ----
const scores = await ev(() => {
  const out = [];
  const keep = JSON.stringify(save);
  save = normalizeSave(null);
  Sfx.quiet = true;
  for (let r = 0; r < 12; r++) {
    newRun(false); S.mode = 'play';
    // de computer reageert pas na een kleine vertraging, zoals een mens
    let lag = 0;
    for (let i = 0; i < 120 * 180 && S.mode === 'play'; i++) {
      if (--lag <= 0) { lag = 8 + Math.floor(Math.random() * 10); const A = S.A, q = nextPipe(), t = q ? q.gy + 14 : midY(); if (A.y > t + (Math.random() - 0.5) * 20 && A.vy > -40) flap(); }
      step(1 / 120);
    }
    out.push(S.score);
  }
  save = normalizeSave(JSON.parse(keep)); Sfx.quiet = false;
  return out;
});
const avg = scores.reduce((a, c) => a + c, 0) / scores.length;
console.log(`  · computerspeler (trage reactie): ${scores.join(', ')} (gemiddeld ${avg.toFixed(1)})`);
ok(avg >= 10, 'het spel is makkelijk genoeg (gemiddeld 10+ punten)');

await b.close();
server.close();
if (errs.length) { console.error('\nFOUTEN:\n' + errs.join('\n')); process.exit(1); }
console.log('\nAlles in orde.');
