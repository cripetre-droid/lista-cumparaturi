/* Test automat al interfetei, cu Playwright (Chromium), pe serverul de test.
   Rulare:  node dev/test-ui.mjs
   Capturile ies in dev/capturi/.
*/

import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const { chromium } = require_('D:/VIREO/AI/incadrare/node_modules/playwright-core/index.js');
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AICI = path.dirname(fileURLToPath(import.meta.url));
const CAPTURI = path.join(AICI, 'capturi');
fs.mkdirSync(CAPTURI, { recursive: true });

// pornim propriul server, ca fiecare rulare sa plece de la zero
const PORT = 8790 + (process.pid % 50);
const BAZA = 'http://localhost:' + PORT;
const srv = spawn(process.execPath, [path.join(AICI, 'server-test.mjs')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
process.on('exit', () => srv.kill());
await new Promise((r) => setTimeout(r, 900));
const erori = [];
let pas = 0;

async function shot(page, nume) {
  pas++;
  await page.screenshot({ path: path.join(CAPTURI, String(pas).padStart(2, '0') + '-' + nume + '.png') });
}

function verifica(conditie, mesaj) {
  if (conditie) console.log('  OK   ' + mesaj);
  else { console.log('  ESEC ' + mesaj); erori.push(mesaj); }
}

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: EDGE });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 892 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'ro-RO',
});
const page = await ctx.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') { console.log('  [consola]', m.text()); erori.push('eroare in consola: ' + m.text()); }
});
page.on('pageerror', (e) => { console.log('  [pagina]', e.message); erori.push('exceptie: ' + e.message); });

console.log('1. Inregistrare cont');
await page.goto(BAZA, { waitUntil: 'networkidle' });
await shot(page, 'autentificare');
await page.click('#toggleMode');
await page.fill('#inName', 'Petre');
await page.fill('#inEmail', 'test@vireo.ro');
await page.fill('#inPass', 'parolatest123');
await shot(page, 'inregistrare');
await page.click('#authSubmit');
await page.waitForSelector('#screenLists:not(.hidden)', { timeout: 5000 });
verifica(await page.isVisible('#fabAddList'), 'am ajuns in ecranul cu liste');
await shot(page, 'liste-goale');

console.log('2. Creez trei liste');
for (const nume of ['Mega', 'Farmacie', 'Bebe Tei']) {
  await page.click('#fabAddList');
  await page.waitForSelector('#dialog:not([hidden])');
  await page.fill('#dialog input.dlg-input', nume);
  await page.click('#dialog .dialog-actions button:last-child');
  await page.waitForTimeout(300);
  // dupa creare intram automat in lista, ne intoarcem
  if (await page.isVisible('#screenItems:not(.hidden)')) {
    await page.click('#btnBack');
    await page.waitForTimeout(300);
  }
}
const nrListe = await page.locator('.list-card').count();
verifica(nrListe === 3, 'trei liste create (gasite: ' + nrListe + ')');
await shot(page, 'trei-liste');

console.log('3. Adaug produse in Mega');
await page.click('.list-card:has-text("Mega")');
await page.waitForSelector('#screenItems:not(.hidden)');
const produse = ['Sapun lichid', 'Telemea', '2 l lapte', 'Unt', '3 kg cartofi', 'Apa de gura'];
for (const p of produse) {
  await page.fill('#newItem', p);
  await page.click('#btnAdd');
  await page.waitForTimeout(150);
}
const nrProduse = await page.locator('.item').count();
verifica(nrProduse === produse.length, 'sase produse adaugate (gasite: ' + nrProduse + ')');
const textLapte = await page.locator('.item:has-text("lapte")').innerText();
verifica(/2\s*l/.test(textLapte), 'cantitatea "2 l" a fost desprinsa din text (' + textLapte.replace(/\n/g, ' ') + ')');
const textCartofi = await page.locator('.item:has-text("cartofi")').innerText();
verifica(/3\s*kg/.test(textCartofi), 'cantitatea "3 kg" a fost desprinsa din text');
await shot(page, 'produse');

console.log('4. Bifez doua produse');
await page.click('.item:has-text("Telemea")');
await page.waitForTimeout(200);
await page.click('.item:has-text("Unt")');
await page.waitForTimeout(300);
verifica(await page.isVisible('.divider'), 'a aparut sectiunea "In cos"');
verifica((await page.locator('.item.done').count()) === 2, 'doua produse bifate');
await shot(page, 'bifate');

console.log('5. Caut in lista');
await page.click('#btnSearchItems');
await page.fill('#qItems', 'ap');
await page.waitForTimeout(250);
const gasite = await page.locator('.item').count();
verifica(gasite === 3, 'cautarea "ap" gaseste sapun, lapte si apa (gasite: ' + gasite + ')');
verifica((await page.locator('mark').count()) > 0, 'textul cautat e evidentiat');
await shot(page, 'cautare-produse');
await page.click('#btnSearchItems');
await page.waitForTimeout(200);

console.log('6. Sterg un produs si anulez');
await page.click('.item:has-text("Sapun") .row-btn:not(.drag-handle)');
await page.waitForSelector('#sheet:not([hidden])');
await shot(page, 'meniu-produs');
await page.click('#sheet .sheet-item.danger');
await page.waitForTimeout(400);
verifica(!(await page.isVisible('.item:has-text("Sapun")')), 'produsul a fost sters');
verifica(await page.isVisible('#snackbar'), 'a aparut notificarea cu ANULEAZA');
await shot(page, 'sters-cu-undo');
await page.click('#snackAction');
await page.waitForTimeout(400);
verifica(await page.isVisible('.item:has-text("Sapun")'), 'stergerea a fost anulata (undo)');
await shot(page, 'dupa-undo');

console.log('7. Sortez alfabetic si anulez din bara de sus');
await page.click('#btnMenuItems');
await page.waitForSelector('#sheet:not([hidden])');
await shot(page, 'meniu-lista');
await page.click('#sheet .sheet-item:has-text("Sortează alfabetic")');
await page.waitForTimeout(400);
const primul = await page.locator('.item .item-name').first().innerText();
verifica(/apa/i.test(primul), 'dupa sortare primul produs incepe cu A (' + primul + ')');
verifica(await page.isVisible('#btnUndoItems'), 'butonul de anulare din bara e vizibil');
await page.click('#btnUndoItems');
await page.waitForTimeout(400);
const primulDupa = await page.locator('.item .item-name').first().innerText();
verifica(/sapun/i.test(primulDupa), 'sortarea a fost anulata (' + primulDupa + ')');

console.log('8. Sugestii din istoric');
await page.click('#btnBack');
await page.waitForTimeout(300);
await page.click('.list-card:has-text("Farmacie")');
await page.waitForSelector('#screenItems:not(.hidden)');
await page.fill('#newItem', 'ap');
await page.waitForTimeout(900);
const nrSug = await page.locator('.sug').count();
verifica(nrSug > 0, 'apar sugestii din istoric (gasite: ' + nrSug + ')');
await shot(page, 'sugestii');
if (nrSug) {
  await page.locator('.sug').first().click();
  await page.waitForTimeout(300);
  verifica((await page.locator('.item').count()) === 1, 'produsul din sugestie a fost adaugat');
}

console.log('9. Cautare globala din ecranul cu liste');
await page.click('#btnBack');
await page.waitForTimeout(300);
await page.click('#btnSearchLists');
await page.fill('#qLists', 'lapte');
await page.waitForTimeout(300);
verifica((await page.locator('.sr-item').count()) > 0, 'cautarea globala gaseste produsul in alta lista');
await shot(page, 'cautare-globala');
await page.locator('.sr-item').first().click();
await page.waitForTimeout(500);
verifica(await page.isVisible('#screenItems:not(.hidden)'), 'rezultatul deschide lista corecta');
await shot(page, 'rezultat-deschis');

console.log('10. Tema intunecata');
await page.click('#btnBack');
await page.waitForTimeout(300);
await page.click('#btnSearchLists');   // inchid cautarea globala
await page.waitForTimeout(300);
await page.click('#btnMenuLists');
await page.waitForSelector('#sheet:not([hidden])');
await shot(page, 'meniu-general');
await page.click('#sheet .sheet-item:has-text("Temă întunecată")');
await page.waitForTimeout(400);
verifica((await page.getAttribute('html', 'data-theme')) === 'dark', 'tema intunecata activa');
await shot(page, 'tema-intunecata');

console.log('11. Partajare (cod)');
await page.click('.list-card:has-text("Mega")');
await page.waitForTimeout(300);
await page.click('#btnShare');
await page.waitForSelector('#sheet:not([hidden])');
await page.click('#sheet .sheet-item:has-text("Invită")');
await page.waitForSelector('#dialog:not([hidden])', { timeout: 5000 });
const cod = (await page.locator('.code-box').innerText()).trim();
verifica(/^[A-Z0-9]{5,9}$/.test(cod), 'am primit un cod de invitatie (' + cod + ')');
await shot(page, 'cod-partajare');
await page.click('#dialog .dialog-actions button:last-child');

console.log('12. Sincronizare: reincarc pagina');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
verifica(await page.isVisible('#screenItems:not(.hidden)'), 'dupa reincarcare revin in aceeasi lista');
const dupaReload = await page.locator('.item').count();
verifica(dupaReload === 6, 'produsele s-au pastrat dupa reincarcare (gasite: ' + dupaReload + ')');
await shot(page, 'dupa-reincarcare');

console.log('13. Al doilea utilizator intra cu codul');
const ctx2 = await ctx.browser().newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ro-RO' });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => erori.push('exceptie utilizator 2: ' + e.message));
await p2.goto(BAZA, { waitUntil: 'networkidle' });
await p2.click('#toggleMode');
await p2.fill('#inName', 'Ana');
await p2.fill('#inEmail', 'ana@vireo.ro');
await p2.fill('#inPass', 'parolatest123');
await p2.click('#authSubmit');
await p2.waitForSelector('#screenLists:not(.hidden)');
await p2.click('#btnMenuLists');
await p2.waitForSelector('#sheet:not([hidden])');
await p2.click('#sheet .sheet-item:has-text("Intră într-o listă")');
await p2.waitForSelector('#dialog:not([hidden])');
await p2.fill('#dialog input.dlg-input', cod);
await p2.click('#dialog .dialog-actions button:last-child');
await p2.waitForTimeout(1500);
verifica((await p2.locator('.list-card:has-text("Mega")').count()) === 1, 'al doilea utilizator vede lista partajata');
await p2.screenshot({ path: path.join(CAPTURI, '99-utilizator2.png') });

console.log('14. Modificare de la utilizatorul 2, vizibila la utilizatorul 1');
await p2.click('.list-card:has-text("Mega")');
await p2.waitForSelector('#screenItems:not(.hidden)');
await p2.fill('#newItem', 'Ciocolata');
await p2.click('#btnAdd');
await p2.waitForTimeout(2500);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.click('#btnMenuItems');
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.click('#btnBack');
await page.waitForTimeout(200);
await page.click('#btnMenuLists');
await page.click('#sheet .sheet-item:has-text("Sincronizează acum")');
await page.waitForTimeout(2000);
await page.click('.list-card:has-text("Mega")');
await page.waitForTimeout(500);
verifica(await page.isVisible('.item:has-text("Ciocolata")'), 'produsul adaugat de celalalt utilizator a ajuns aici');
await shot(page, 'sincronizat-intre-utilizatori');

console.log('15. Anularea unei adaugari ajunge si la celalalt utilizator');
// utilizatorul 1 e in lista partajata "Mega"; adaug un produs, il las sa se sincronizeze,
// apoi anulez. Anularea trebuie sa ajunga si la utilizatorul 2.
await page.fill('#newItem', 'Produs de proba');
await page.click('#btnAdd');
await page.waitForTimeout(2600);
await p2.reload({ waitUntil: 'networkidle' });
await p2.waitForTimeout(2600);
verifica(await p2.isVisible('.item:has-text("Produs de proba")'), 'produsul a ajuns la utilizatorul 2');

await page.click('#btnUndoItems');
await page.waitForTimeout(2600);
verifica(!(await page.isVisible('.item:has-text("Produs de proba")')), 'produsul a disparut la utilizatorul 1');

await p2.reload({ waitUntil: 'networkidle' });
await p2.waitForTimeout(2600);
const laDoi = await p2.isVisible('.item:has-text("Produs de proba")');
verifica(!laDoi, 'anularea s-a propagat prin server la utilizatorul 2');
await shot(page, 'undo-propagat-la-server');
await p2.screenshot({ path: path.join(CAPTURI, '98-utilizator2-dupa-undo.png') });

console.log('16. Bifa celuilalt apare singura, fara reincarcare');
// utilizatorul 2 sta cu lista deschisa; utilizatorul 1 bifeaza; nu atingem nimic la 2
await p2.click('.list-card:has-text("Mega")').catch(() => {});
await p2.waitForTimeout(500);
if (!(await p2.isVisible('#screenItems:not(.hidden)'))) {
  await p2.click('.list-card:has-text("Mega")');
  await p2.waitForTimeout(500);
}
const eraBifat = await p2.locator('.item:has-text("Telemea").done').count();
await page.click('.item:has-text("Telemea")');     // utilizatorul 1 comuta bifa
await page.waitForTimeout(2000);                   // se trimite la server

const inceput = Date.now();
let aVazut = false;
while (Date.now() - inceput < 15000) {
  const acum = await p2.locator('.item:has-text("Telemea").done').count();
  if (acum !== eraBifat) { aVazut = true; break; }
  await p2.waitForTimeout(500);
}
const secunde = Math.round((Date.now() - inceput) / 100) / 10;
verifica(aVazut, 'schimbarea a aparut singura la celalalt telefon (in ' + secunde + ' s)');
verifica(secunde <= 12, 'a aparut in cel mult 12 secunde (' + secunde + ' s)');
await shot(page, 'propagare-automata');

console.log('17. Verificarile tacute nu deranjeaza');
await p2.evaluate(() => {
  window.__clipiri = 0;
  const b = document.getElementById('syncBadge');
  new MutationObserver(() => { if (!b.hidden) window.__clipiri++; }).observe(b, { attributes: true });
});
await p2.waitForTimeout(14000);        // ~2 verificari, fara nicio schimbare pe server
const clipiri = await p2.evaluate(() => window.__clipiri);
verifica(clipiri === 0, 'indicatorul nu apare cand nu s-a schimbat nimic (' + clipiri + ' aparitii)');

console.log('18. In liniste se fac doar verificari ieftine');
const stat = async () => (await (await fetch(BAZA + '/__stat')).json());
const inainte = await stat();
await p2.waitForTimeout(12000);          // ~4 verificari la 3 secunde, nimic de schimbat
const dupa = await stat();
const pinguriNoi = dupa.pinguri - inainte.pinguri;
const syncNoi = dupa.sincronizari - inainte.sincronizari;
verifica(pinguriNoi >= 2, 'se fac verificari dese (' + pinguriNoi + ' in 12 s)');
verifica(syncNoi === 0, 'niciuna nu a cerut sincronizare completa (' + syncNoi + ')');

await browser.close();
srv.kill();

console.log('\n================================');
if (erori.length) {
  console.log('PROBLEME (' + erori.length + '):');
  for (const e of erori) console.log(' - ' + e);
  process.exit(1);
} else {
  console.log('Toate verificarile au trecut.');
}
