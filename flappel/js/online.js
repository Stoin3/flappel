'use strict';
// Flappel · account en ranglijst (Supabase)
// Hetzelfde Supabase-project, dezelfde inlogsessie en dezelfde gebruikersnaam (tabel "profiles") als Andy Apples.
// Flappel bewaart zijn voortgang in de user_metadata van het account (sleutel "flappel"): daar is geen
// extra tabel voor nodig, en de save van Andy Apples (tabel "saves") blijft onaangeroerd.
// De ranglijst van Flappel heeft wel een eigen tabel en functie nodig: zie README ("Supabase instellen").

const sbOn = () => !!(CONFIG.supabase.url && CONFIG.supabase.key);
const SB_LIBS = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'];
let sbClient = null, sbLoading = null;
function loadScript(src) {
  return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => { el.remove(); rej(new Error('laden mislukt')); }; document.head.appendChild(el); });
}
function getSb() {
  if (!sbOn()) return Promise.reject(new Error('Online spelen is nog niet ingesteld.'));
  if (sbClient) return Promise.resolve(sbClient);
  if (!sbLoading) sbLoading = (async () => {
    for (const src of SB_LIBS) {
      if (window.supabase && window.supabase.createClient) break;
      try { await loadScript(src); } catch (e) { /* volgende bron proberen */ }
    }
    if (!(window.supabase && window.supabase.createClient)) { sbLoading = null; throw new Error('Geen verbinding met de server. Heb je internet?'); }
    sbClient = window.supabase.createClient(CONFIG.supabase.url.replace(/\/+$/, ''), CONFIG.supabase.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: /^https?:$/.test(location.protocol), storageKey: CONFIG.authKey },
    });
    return sbClient;
  })();
  return sbLoading;
}

// =====================================================================
//  Account: voortgang online bewaren
// =====================================================================
const SYNC_KEY = 'flappel.sync';   // { uid, at: tijd van de laatst gesynchroniseerde online save, dirty }
const ACC = { user: null, username: null, rev: 0, timer: 0, applying: false, status: '', listening: false, back: 'menu' };
function syncState() { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } }
function setSync(o) { try { localStorage.setItem(SYNC_KEY, JSON.stringify(o)); } catch (e) { /* negeren */ } }
const hasProgress = sv => sv.runs > 0 || sv.pitten > 0;
// twee saves samenvoegen: van alles het beste (records, upgrades, skins), zodat je nooit iets kwijtraakt
function mergeSaves(a, b) {
  const m = normalizeSave(a);
  m.pitten = Math.max(a.pitten, b.pitten); m.best = Math.max(a.best, b.best);
  m.runs = Math.max(a.runs, b.runs); m.total = Math.max(a.total, b.total);
  for (const u of UPGRADES) m.upgrades[u.id] = Math.max(a.upgrades[u.id] || 0, b.upgrades[u.id] || 0);
  m.skins = [...new Set([...a.skins, ...b.skins])];
  return m;
}
// aangeroepen bij elke persist(): markeer als gewijzigd en bewaar straks online
function cloudDirty() {
  if (ACC.applying || !ACC.user) return;
  ACC.rev++;
  const st = syncState();
  if (st.uid === ACC.user.id && !st.dirty) setSync(Object.assign(st, { dirty: true }));
  clearTimeout(ACC.timer);
  ACC.timer = setTimeout(() => cloudPush().catch(() => { ACC.status = 'Online opslaan lukte niet; wordt later opnieuw geprobeerd.'; accRender(); }), 3000);
}
function applyCloud(data, at) {
  ACC.applying = true;
  try { save = normalizeSave(data); persist(); } finally { ACC.applying = false; }
  setSync({ uid: ACC.user.id, at, dirty: false });
  audioApply(); uiRefresh();
}
async function cloudPush(force) {
  const u = ACC.user;
  if (!u) return;
  clearTimeout(ACC.timer);
  const st = syncState();
  if (!force && st.uid === u.id && !st.dirty) return;
  const sb = await getSb(), rev = ACC.rev, at = new Date().toISOString();
  const { error } = await sb.auth.updateUser({ data: { flappel: Object.assign(JSON.parse(JSON.stringify(save)), { at }) } });
  if (error) throw error;
  if (ACC.user !== u) return;
  setSync({ uid: u.id, at, dirty: ACC.rev !== rev });
  ACC.status = 'Online bewaard om ' + new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  accRender();
}
async function cloudPull() {
  const u = ACC.user;
  if (!u) return;
  ACC.status = 'Synchroniseren…'; accRender();
  try {
    const sb = await getSb();
    const { data, error } = await sb.auth.getUser();
    if (error) throw error;
    if (ACC.user !== u) return;
    const cloud = data.user && data.user.user_metadata && data.user.user_metadata.flappel;
    const st = syncState(), mine = st.uid === u.id;
    if (!cloud || typeof cloud !== 'object') await cloudPush(true);                 // nog niets online: uploaden
    else if (mine && !st.dirty) {                                                      // hier niets gewijzigd: online versie nemen
      if (cloud.at !== st.at) applyCloud(cloud, cloud.at);
      ACC.status = 'Voortgang is bijgewerkt.';
    } else if (mine && cloud.at === st.at) await cloudPush(true);                    // alleen hier gewijzigd
    else {                                                                             // beide kanten (of eerste keer op dit apparaat)
      const c = normalizeSave(cloud);
      if (!hasProgress(save)) applyCloud(cloud, cloud.at);
      else { applyCloud(mergeSaves(save, c), cloud.at); await cloudPush(true); }
      ACC.status = 'Online voortgang geladen.';
    }
  } catch (e) { if (ACC.user === u) ACC.status = 'Online opslaan lukt nu niet. Je voortgang blijft op dit apparaat bewaard.'; }
  accRender();
}
async function accEnsure() {
  const sb = await getSb();
  if (!ACC.listening) {
    ACC.listening = true;
    sb.auth.onAuthStateChange((ev, session) => {
      const u = session ? session.user : null, prev = ACC.user;
      ACC.user = u;
      if (u && (!prev || prev.id !== u.id)) { ACC.username = null; setTimeout(() => { cloudPull(); loadProfile(); }, 0); }
      if (!u) { ACC.status = ''; ACC.username = null; }
      accRender();
    });
  }
  return sb;
}
function accErr(e) {
  const m = String((e && e.message) || e || '');
  if (/invalid login/i.test(m)) return 'Onjuist e-mailadres of wachtwoord.';
  if (/not confirmed/i.test(m)) return 'Bevestig eerst je e-mailadres via de link in je mail.';
  if (/already registered|already exists/i.test(m)) return 'Er bestaat al een account met dit e-mailadres. Log in.';
  if (/rate limit|too many/i.test(m)) return 'Te veel pogingen. Probeer het over een paar minuten opnieuw.';
  if (/password/i.test(m)) return 'Kies een sterker wachtwoord (minstens 6 tekens).';
  if (/fetch|network|internet/i.test(m)) return 'Geen verbinding met de server. Heb je internet?';
  return 'Er ging iets mis: ' + m;
}
// ---- Gebruikersnaam: dezelfde tabel "profiles" als Andy Apples ----
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
async function loadProfile() {
  const u = ACC.user;
  if (!u) return;
  try {
    const { data, error } = await (await getSb()).from('profiles').select('username').eq('user_id', u.id).maybeSingle();
    if (error) throw error;
    if (ACC.user !== u) return;
    ACC.username = data ? data.username : null;
    accRender();
    if (ACC.username) lbSubmit().catch(() => { /* later opnieuw */ });
  } catch (e) { /* offline: geen naam */ }
}
const suggestName = email => String(email || '').split('@')[0].replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);
async function saveUsername() {
  const u = ACC.user, name = $('accName').value.trim();
  if (!u) return;
  if (!USERNAME_RE.test(name)) { accMsg('Een gebruikersnaam heeft 3 tot 16 tekens: letters, cijfers of _.'); return; }
  if (name === ACC.username) { accMsg('Dat is al je gebruikersnaam.', true); return; }
  $('btnAccName').disabled = true;
  try {
    const { error } = await (await getSb()).from('profiles').upsert({ user_id: u.id, username: name, updated_at: new Date().toISOString() });
    if (error) {
      if (error.code === '23505') accMsg(`De naam "${name}" is al bezet. Kies een andere.`);
      else if (error.code === '23514') accMsg('Een gebruikersnaam heeft 3 tot 16 tekens: letters, cijfers of _.');
      else accMsg(accErr(error));
    } else {
      const first = !ACC.username;
      ACC.username = name; accRender();
      accMsg(first ? `Welkom op de ranglijst, ${name}!` : 'Gebruikersnaam aangepast (ook in Andy Apples).', true);
      lbSubmit(true).catch(() => { /* later opnieuw */ });
    }
  } catch (e) { accMsg(accErr(e)); }
  $('btnAccName').disabled = false;
}
function accMsg(t, ok) { const el = $('accMsg'); el.textContent = t || ''; el.className = 'msg ' + (ok ? 'ok' : 'err'); }
function accRender() {
  const u = ACC.user;
  $('accOut').classList.toggle('hidden', !!u);
  $('accIn').classList.toggle('hidden', !u);
  $('accWho').textContent = u ? u.email || '' : '';
  const inp = $('accName');
  if (u && document.activeElement !== inp) inp.value = ACC.username || suggestName(u.email);
  $('accNameHint').textContent = u && !ACC.username ? 'Kies een gebruikersnaam om op de ranglijst te komen.' : 'Deze naam zie je op de ranglijst, in Flappel én in Andy Apples.';
  $('accSync').textContent = ACC.status;
  $('mmAcc').textContent = u ? '👤 ' + (ACC.username || 'Ingelogd') : '👤 Account';
}
async function accLogin(signup) {
  const email = $('accEmail').value.trim(), password = $('accPass').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { accMsg('Vul een geldig e-mailadres in.'); return; }
  if (password.length < 6) { accMsg('Het wachtwoord moet minstens 6 tekens hebben.'); return; }
  $('btnAccLogin').disabled = $('btnAccSignup').disabled = true;
  accMsg(signup ? 'Account maken…' : 'Inloggen…', true);
  try {
    const sb = await accEnsure();
    const redirect = CONFIG.siteUrl || (/^https?:$/.test(location.protocol) ? location.origin + location.pathname : undefined);
    const r = signup ? await sb.auth.signUp({ email, password, options: redirect ? { emailRedirectTo: redirect } : {} })
      : await sb.auth.signInWithPassword({ email, password });
    if (r.error) accMsg(accErr(r.error));
    else if (signup && r.data.user && Array.isArray(r.data.user.identities) && !r.data.user.identities.length) accMsg('Er bestaat al een account met dit e-mailadres. Log in.');
    else if (signup && !r.data.session) accMsg('Bijna klaar: klik op de link in de e-mail die je net kreeg, en log daarna hier in.', true);
    else { $('accPass').value = ''; accMsg('Ingelogd! 🎉', true); }
  } catch (e) { accMsg(accErr(e)); }
  $('btnAccLogin').disabled = $('btnAccSignup').disabled = false;
}
function openAccount(from) {
  ACC.back = from || 'menu';
  accMsg(''); accRender(); showScreen('account');
  if (sbOn()) accEnsure().catch(e => accMsg(accErr(e)));
}
function accountInit() {
  $('btnAccount').classList.toggle('hidden', !sbOn());
  $('btnLb').classList.toggle('hidden', !sbOn());
  on('btnAccount', () => openAccount('menu'));
  on('btnAccBack', () => { if (ACC.back === 'lb') openLb(lbReturn); else showScreen(ACC.back); });
  on('btnAccName', saveUsername);
  $('accName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveUsername(); } });
  on('btnAccLogin', () => accLogin(false));
  on('btnAccSignup', () => accLogin(true));
  $('accPass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); accLogin(false); } });
  on('btnAccLogout', async () => {
    try { await cloudPush(); } catch (e) { /* offline: lokaal blijft alles staan */ }
    try { await (await getSb()).auth.signOut({ scope: 'local' }); } catch (e) { /* */ }
    ACC.user = null; ACC.username = null; setSync({}); accRender();
    accMsg('Uitgelogd. Je voortgang staat nog op dit apparaat.', true);
  });
  window.addEventListener('pagehide', () => { if (ACC.user && syncState().dirty) cloudPush().catch(() => { /* */ }); });
  // al ingelogd (bijvoorbeeld via Andy Apples op hetzelfde domein)? Dan stil de sessie ophalen.
  try { if (sbOn() && (localStorage.getItem(CONFIG.authKey) || /access_token|code=/.test(location.hash + location.search))) accEnsure().catch(() => { /* offline */ }); } catch (e) { /* */ }
}

// =====================================================================
//  Ranglijst: alleen spelers met een account en een gebruikersnaam
// =====================================================================
const LB_SENT_KEY = 'flappel.lbSent';
let lbReturn = 'menu';
const lbReady = () => !!(ACC.user && ACC.username);
async function lbSubmit(force) {
  if (!sbOn() || !lbReady() || save.best < 1) return;
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(LB_SENT_KEY)) || {}; } catch (e) { /* niets verstuurd */ }
  if (!force && sent.u === ACC.user.id && sent.s >= save.best) return;
  const { error } = await (await getSb()).rpc('flappel_submit', { p_score: save.best });
  if (error) throw error;
  try { localStorage.setItem(LB_SENT_KEY, JSON.stringify({ u: ACC.user.id, s: save.best })); } catch (e) { /* negeren */ }
}
async function lbShow() {
  const list = $('lbList'), me = ACC.username;
  $('lbSub').textContent = save.best ? `Jouw record: ${save.best}` : 'De beste fladderaars';
  $('lbMsg').textContent = '';
  $('lbJoin').classList.toggle('hidden', !sbOn() || lbReady());
  $('lbJoinTxt').textContent = ACC.user ? 'Kies een gebruikersnaam om op de ranglijst te komen.' : 'Log in (met je Andy Apples-account) om op de ranglijst te komen.';
  if (!sbOn()) { list.innerHTML = '<li class="empty">De ranglijst is nog niet ingesteld.</li>'; return; }
  list.innerHTML = '<li class="empty">Laden…</li>';
  try {
    const sb = await getSb();
    await lbSubmit().catch(() => { /* versturen mislukt: de lijst toch laten zien */ });
    const { data, error } = await sb.from('flappel_leaderboard').select('name,score').order('score', { ascending: false }).order('updated_at', { ascending: true }).limit(50);
    if (error) throw error;
    let mine = false;
    list.innerHTML = data.length ? data.map((r, i) => {
      const isMe = !mine && !!me && r.name.toLowerCase() === me.toLowerCase();
      if (isMe) mine = true;
      return `<li class="${isMe ? 'me' : ''}"><b>${i + 1}</b><span>${escHtml(r.name)}</span><span>${r.score | 0}</span></li>`;
    }).join('') : '<li class="empty">Nog niemand. Word de eerste!</li>';
  } catch (e) {
    const m = String((e && (e.message || e.code)) || '');
    list.innerHTML = /flappel_leaderboard|42P01|PGRST20|does not exist|schema cache/i.test(m)
      ? '<li class="empty">De ranglijst moet nog worden ingericht (zie README).</li>'
      : '<li class="empty">Kon de ranglijst niet laden. Heb je internet?</li>';
  }
}
function openLb(from) { lbReturn = from || 'menu'; showScreen('lb'); lbShow(); }
function lbInit() {
  on('btnLb', () => openLb('menu'));
  on('btnLbBack', () => showScreen(lbReturn));
  on('btnLbAcc', () => openAccount('lb'));
}
