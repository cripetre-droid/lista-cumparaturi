import { createRequire } from 'node:module';
const req = createRequire('file:///D:/x.js');
const { chromium } = req('D:/VIREO/AI/incadrare/node_modules/playwright-core/index.js');
const erori = [];
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ro-RO' });
const p = await ctx.newPage();
p.on('pageerror', (e) => erori.push('exceptie: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') erori.push('consola: ' + m.text()); });
const ok = (c, m) => console.log((c ? '  OK   ' : '  ESEC ') + m) || (!c && erori.push(m));

await p.goto('https://lista.vireo.ro/', { waitUntil: 'networkidle' });
await p.fill('#inEmail', 'proba1@vireo.ro');
await p.fill('#inPass', 'ProbaVireo2026');
await p.click('#authSubmit');
await p.waitForSelector('#screenLists:not(.hidden)', { timeout: 15000 });
ok(true, 'autentificare pe serverul real');

await p.click('#fabAddList');
await p.waitForSelector('#dialog:not([hidden])');
await p.fill('#dialog input.dlg-input', 'Test din browser');
await p.click('#dialog .dialog-actions button:last-child');
await p.waitForSelector('#screenItems:not(.hidden)', { timeout: 10000 });
for (const t of ['3 kg cartofi', 'Pâine', 'Lapte']) {
  await p.fill('#newItem', t); await p.click('#btnAdd'); await p.waitForTimeout(250);
}
ok((await p.locator('.item').count()) === 3, 'trei produse adaugate');
await p.click('.item:has-text("Pâine")');
await p.waitForTimeout(300);
ok((await p.locator('.item.done').count()) === 1, 'bifarea merge');
await p.waitForTimeout(3000);   // lasam sincronizarea sa ajunga la server
await p.screenshot({ path: 'dev/capturi/50-live-lista.png' });

await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(3500);
ok((await p.locator('.item').count()) === 3, 'dupa reincarcare produsele vin de pe server');
ok((await p.locator('.item.done').count()) === 1, 'bifa s-a pastrat pe server');

await p.click('#btnMenuItems');
await p.waitForSelector('#sheet:not([hidden])');
await p.click('#sheet .sheet-item:has-text("Golește lista")');
await p.waitForSelector('#dialog:not([hidden])');
await p.click('#dialog .dialog-actions button:last-child');
await p.waitForTimeout(600);
ok((await p.locator('.item').count()) === 0, 'golirea listei merge');
await p.click('#snackAction');   // ANULEAZA
await p.waitForTimeout(600);
ok((await p.locator('.item').count()) === 3, 'anularea (undo) readuce produsele');

// curatenie: sterg lista de test
await p.click('#btnMenuItems');
await p.waitForSelector('#sheet:not([hidden])');
await p.click('#sheet .sheet-item:has-text("Șterge lista")');
await p.waitForSelector('#dialog:not([hidden])');
await p.click('#dialog .dialog-actions button:last-child');
await p.waitForTimeout(3000);
ok(await p.isVisible('#screenLists:not(.hidden)'), 'lista de test a fost stearsa');
await p.screenshot({ path: 'dev/capturi/51-live-final.png' });
await b.close();
console.log(erori.length ? '\nPROBLEME:\n - ' + erori.join('\n - ') : '\nInterfata reala functioneaza complet.');
process.exit(erori.length ? 1 : 0);
