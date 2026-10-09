'use strict';
// Flappel · instellingen
// Hetzelfde Supabase-project als Andy Apples (github.com/Stoin3/andy-apple, js/config.js): één account voor beide games.

const CONFIG = {
  // Supabase-project van Andy Apples: de "Project URL" en de publishable key. Leeg = alleen offline spelen.
  supabase: { url: 'https://vzkkyjfuyzzxnynhafmy.supabase.co/', key: 'sb_publishable_FSL3mmqd9Vn8PSBYq6FmTg_zGuUR69B' },
  // Dezelfde opslagsleutel voor de inlogsessie als Andy Apples: op hetzelfde domein (stijnbarendse.nl)
  // ben je dus in beide games tegelijk ingelogd. Niet veranderen, anders moet je per game apart inloggen.
  authKey: 'andyApples.auth',
  // Adres waar Flappel online staat (voor de bevestigingsmail bij een nieuw account). Leeg = het huidige adres.
  siteUrl: 'https://stijnbarendse.nl/flappel',
  // Het keuzescherm met alle games (knop linksboven in het menu). Relatief, zodat het ook lokaal werkt.
  hubUrl: '../game',
};
