/* Carduri de fidelitate pe aplicatia reala (lista.vireo.ro), in browser,
   cu o camera falsa care arata un cod EAN-13. Isi sterge cardul la final.

   node dev/test-live-carduri.mjs
*/

import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scrieVideoEan13 } from './cod-video.mjs';

const req = createRequire(import.meta.url);
const { chromium } = req('D:/VIREO/AI/incadrare/node_modules/playwright-core/index.js');

const AICI = path.dirname(fileURLToPath(import.meta.url));
const CAPTURI = path.join(AICI, 'capturi');
fs.mkdirSync(CAPTURI, { recursive: true });
const VIDEO = path.join(CAPTURI, 'camera-live.y4m');
const COD = scrieVideoEan13(VIDEO, '594987654321');
const APP = 'https://lista.vireo.ro/';

const erori = [];
const ok = (c, m) => { console.log((c ? '  OK   ' : '  ESEC ') + m); if (!c) erori.push(m); };

const b = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + VIDEO],
});
const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ro-RO' });
await ctx.grantPermissions(['camera'], { origin: 'https://lista.vireo.ro' });
const p = await ctx.newPage();
p.on('pageerror', (e) => erori.push('exceptie: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') erori.push('consola: ' + m.text()); });

await p.goto(APP, { waitUntil: 'networkidle' });
await p.fill('#inEmail', 'proba1@vireo.ro');
await p.fill('#inPass', 'ProbaVireo2026');
await p.click('#authSubmit');
await p.waitForSelector('#screenLists:not(.hidden)', { timeout: 15000 });
ok(await p.isVisible('#tabbar'), 'bara de jos "Liste | Carduri" apare pe serverul real');
ok((await p.evaluate(() => import('./js/config.js').then((m) => m.APP_VERSION))) === '1.3.0', 'ruleaza versiunea 1.3.0');

await p.click('#tabCards');
await p.waitForSelector('#screenCards:not(.hidden)');
await p.click('#fabAddCard');
await p.waitForSelector('.panou .magazin[data-store="kaufland"]');
await p.click('.panou .magazin[data-store="kaufland"]');
let citit = false;
try { await p.waitForSelector('#cardNumar', { timeout: 25000 }); citit = true; } catch (e) { /* nu */ }
ok(citit, 'camera a citit codul (ZXing incarcat de pe server)');
if (citit) {
  ok((await p.inputValue('#cardNumar')) === COD, 'numarul citit e corect: ' + COD);
  await p.click('#cardSalveaza');
  await p.waitForSelector('#cardView svg', { timeout: 8000 });
  ok(true, 'cardul salvat se afiseaza cu cod de bare');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: path.join(CAPTURI, '60-live-card.png') });

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  ok(await p.isVisible('#cardView svg'), 'dupa reincarcare cardul vine de pe server');

  await p.click('#cardManage .gest.danger');
  await p.waitForTimeout(3500);
  ok((await p.locator('#cardsGrid .lcard[aria-label="Kaufland"]').count()) === 0, 'cardul de proba a fost sters');
}
await b.close();
console.log(erori.length ? '\nPROBLEME:\n - ' + erori.join('\n - ') : '\nCardurile merg pe serverul real.');
process.exit(erori.length ? 1 : 0);
