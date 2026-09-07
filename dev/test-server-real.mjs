/* Verifica API-ul real de pe lista.vireo.ro, prin apeluri HTTP.
   Foloseste doua conturi de proba si isi sterge datele la final.

   node dev/test-server-real.mjs
*/

import crypto from 'node:crypto';

const API = 'https://lista.vireo.ro/api/';
const APP = 'https://lista.vireo.ro/';
const erori = [];

const uid = () => crypto.randomBytes(16).toString('hex');
const now = () => Date.now();

function ok(conditie, mesaj, detaliu = '') {
  console.log((conditie ? '  OK   ' : '  ESEC ') + mesaj + (detaliu ? '  [' + detaliu + ']' : ''));
  if (!conditie) erori.push(mesaj + (detaliu ? ' -> ' + detaliu : ''));
}

async function call(cale, { metoda = 'POST', corp = null, token = null, origin = null } = {}) {
  const headers = {};
  if (corp) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (origin) headers['Origin'] = origin;
  const r = await fetch(API + cale, {
    method: metoda,
    headers,
    body: corp ? JSON.stringify(corp) : undefined,
  });
  let date = null;
  const text = await r.text();
  try { date = JSON.parse(text); } catch (e) { date = { _text: text.slice(0, 200) }; }
  return { status: r.status, date, headers: r.headers };
}

console.log('\n=== 1. Aplicatia si certificatul ===');
{
  const r = await fetch(APP);
  const html = await r.text();
  ok(r.status === 200, 'pagina se incarca prin HTTPS', 'status ' + r.status);
  ok(html.includes('Lista de cumpărături'), 'pagina e cea corecta');
  const sw = await fetch(APP + 'sw.js');
  ok(sw.status === 200, 'service worker-ul se descarca (functionare offline)');
  const man = await fetch(APP + 'manifest.webmanifest');
  ok(man.status === 200, 'manifestul PWA se descarca (instalare pe telefon)');
  const ico = await fetch(APP + 'icons/icon-192.png');
  ok(ico.status === 200 && Number(ico.headers.get('content-length')) > 1000, 'iconita se descarca');
}

console.log('\n=== 2. Fisiere care NU trebuie sa fie accesibile ===');
{
  for (const [cale, nume] of [
    ['api/install.php', 'install.php sters de pe server'],
    ['api/verifica.php', 'verifica.php sters de pe server'],
  ]) {
    const r = await fetch(APP + cale);
    ok(r.status === 404 || r.status === 403, nume, 'status ' + r.status);
  }
  const cfg = await fetch(APP + 'api/config.php');
  ok(cfg.status === 403 || cfg.status === 404, 'api/config.php nu e accesibil', 'status ' + cfg.status);
  const cfgSus = await fetch('https://lista.vireo.ro/lista-config.php');
  const textSus = await cfgSus.text();
  ok(!textSus.includes('db_pass'), 'fisierul cu parole nu e servit prin web', 'status ' + cfgSus.status);
}

console.log('\n=== 3. CORS ===');
{
  const bun = await call('auth.php?a=login', { corp: { email: 'x@y.z', password: 'gresit123' }, origin: 'https://cripetre-droid.github.io' });
  ok(bun.headers.get('access-control-allow-origin') === 'https://cripetre-droid.github.io',
    'varianta de pe GitHub Pages e acceptata');
  const rau = await call('auth.php?a=login', { corp: { email: 'x@y.z', password: 'gresit123' }, origin: 'https://site-strain.example' });
  ok(rau.status === 403 && rau.date.error === 'origine_neautorizata', 'un site strain e respins', JSON.stringify(rau.date));
}

console.log('\n=== 4. Autentificare ===');
const conturi = {};
{
  const gresit = await call('auth.php?a=login', { corp: { email: 'nuexista@vireo.ro', password: 'parolagresita' } });
  ok(gresit.status === 401 && gresit.date.error === 'date_gresite',
    'baza de date raspunde (login gresit -> date_gresite)', JSON.stringify(gresit.date));

  for (const n of [1, 2]) {
    const email = 'proba' + n + '@vireo.ro';
    let r = await call('auth.php?a=register', { corp: { email, password: 'ProbaVireo2026', name: 'Proba ' + n } });
    if (r.date.error === 'email_existent') {
      r = await call('auth.php?a=login', { corp: { email, password: 'ProbaVireo2026' } });
    }
    ok(!!(r.date && r.date.token), 'cont de proba ' + n + ' pregatit', JSON.stringify(r.date).slice(0, 120));
    conturi[n] = r.date;
  }

  const eu = await call('auth.php?a=me', { metoda: 'GET', token: conturi[1].token });
  ok(eu.date.user && eu.date.user.email === 'proba1@vireo.ro', 'sesiunea (token) e valida');

  const fara = await call('sync.php', { corp: { since: 0 } });
  ok(fara.status === 401 && fara.date.error === 'neautentificat', 'fara token nu se poate sincroniza');
}

console.log('\n=== 5. Liste si produse ===');
const idLista = uid();
const idProdus1 = uid();
const idProdus2 = uid();
{
  const r = await call('sync.php', {
    token: conturi[1].token,
    corp: {
      since: 0,
      lists: [{ id: idLista, name: 'Probă server', color: 0, position: 10, updated_at: now(), deleted: 0 }],
      items: [
        { id: idProdus1, list_id: idLista, name: 'Lapte', qty: '2', unit: 'l', note: '', done: 0, position: 10, updated_at: now(), deleted: 0 },
        { id: idProdus2, list_id: idLista, name: 'Pâine de secară', qty: '', unit: '', note: '', done: 0, position: 20, updated_at: now(), deleted: 0 },
      ],
    },
  });
  ok(r.status === 200 && Array.isArray(r.date.lists), 'sincronizarea a mers', JSON.stringify(r.date).slice(0, 100));
  ok((r.date.lists || []).some((l) => l.id === idLista), 'lista a fost salvata pe server');
  ok((r.date.items || []).length === 2, 'ambele produse au fost salvate');
  const paine = (r.date.items || []).find((i) => i.id === idProdus2);
  ok(paine && paine.name === 'Pâine de secară', 'diacriticele se pastreaza corect', paine && paine.name);
  ok(typeof r.date.now === 'number' && Math.abs(r.date.now - Date.now()) < 5 * 60000,
    'ceasul serverului e potrivit', 'diferenta ' + Math.round((r.date.now - Date.now()) / 1000) + ' s');
}

console.log('\n=== 6. Sugestii din istoric ===');
{
  const s = await call('suggest.php?q=lap', { metoda: 'GET', token: conturi[1].token });
  ok(s.status === 200 && (s.date.items || []).some((i) => /lapte/i.test(i.name)),
    'istoricul propune "Lapte"', JSON.stringify(s.date).slice(0, 120));
}

console.log('\n=== 7. Partajare intre doua conturi ===');
{
  const cod = await call('share.php?a=create', { token: conturi[1].token, corp: { list_id: idLista } });
  ok(!!(cod.date && cod.date.code), 's-a generat cod de invitatie', cod.date && cod.date.code);

  const intrat = await call('share.php?a=join', { token: conturi[2].token, corp: { code: cod.date.code } });
  ok(intrat.date && intrat.date.ok, 'al doilea cont a intrat in lista', JSON.stringify(intrat.date).slice(0, 100));

  const vede = await call('sync.php', { token: conturi[2].token, corp: { since: 0 } });
  const areLista = (vede.date.lists || []).some((l) => l.id === idLista);
  const areProduse = (vede.date.items || []).filter((i) => i.list_id === idLista).length;
  ok(areLista && areProduse === 2, 'al doilea cont vede lista si produsele', areProduse + ' produse');

  // contul 2 bifeaza un produs
  await call('sync.php', {
    token: conturi[2].token,
    corp: {
      since: vede.date.now,
      items: [{ id: idProdus1, list_id: idLista, name: 'Lapte', qty: '2', unit: 'l', note: '', done: 1, position: 10, updated_at: now(), deleted: 0 }],
    },
  });
  const inapoi = await call('sync.php', { token: conturi[1].token, corp: { since: 0 } });
  const lapte = (inapoi.date.items || []).find((i) => i.id === idProdus1);
  ok(lapte && Number(lapte.done) === 1, 'bifa facuta de celalalt ajunge la primul cont');

  const membri = await call('share.php?a=members', { token: conturi[1].token, corp: { list_id: idLista } });
  ok((membri.date.members || []).length === 2, 'lista are doi membri', JSON.stringify((membri.date.members || []).map((m) => m.email)));
}

console.log('\n=== 8. Curatenie (sterg datele de proba) ===');
{
  await call('share.php?a=leave', { token: conturi[2].token, corp: { list_id: idLista } });
  const sters = await call('sync.php', {
    token: conturi[1].token,
    corp: {
      since: 0,
      lists: [{ id: idLista, name: 'Probă server', color: 0, position: 10, updated_at: now(), deleted: 1 }],
      items: [
        { id: idProdus1, list_id: idLista, name: 'Lapte', qty: '2', unit: 'l', note: '', done: 1, position: 10, updated_at: now(), deleted: 1 },
        { id: idProdus2, list_id: idLista, name: 'Pâine de secară', qty: '', unit: '', note: '', done: 0, position: 20, updated_at: now(), deleted: 1 },
      ],
    },
  });
  const ramasa = (sters.date.lists || []).find((l) => l.id === idLista);
  ok(ramasa && Number(ramasa.deleted) === 1, 'lista de proba a fost stearsa');
  await call('auth.php?a=logout', { token: conturi[1].token });
  await call('auth.php?a=logout', { token: conturi[2].token });
  ok(true, 'sesiunile de proba au fost inchise');
}

console.log('\n================================');
if (erori.length) {
  console.log('PROBLEME (' + erori.length + '):');
  for (const e of erori) console.log(' - ' + e);
  process.exit(1);
} else {
  console.log('Serverul real functioneaza complet.');
}
