/* Pregateste fisierele de pe server cerute de Google Play:
     confidentialitate.html, sterge-cont.html  (cu numele si e-mailul din date-publice.json)
     .well-known/assetlinks.json               (din aplicatie.json)

   node GooglePlay/pregateste-site.mjs        -> scrie in GooglePlay/site-gata/
   Folosit si de fa-pachet.ps1 si de serverul de test (cu date de proba). */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AICI = path.dirname(fileURLToPath(import.meta.url));

function citesteJson(fisier) {
  return JSON.parse(fs.readFileSync(path.join(AICI, fisier), 'utf8'));
}

export function assetlinks() {
  const app = citesteJson('aplicatie.json');
  const amprente = Object.values(app.amprenteSha256 || {}).filter((x) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(x));
  return JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: app.pachet,
      sha256_cert_fingerprints: amprente.map((x) => x.toUpperCase()),
    },
  }], null, 2) + '\n';
}

/** Intoarce { cale relativa -> continut }. Arunca eroare daca lipsesc datele publice (in afara de test). */
export function construiesteSite({ test = false } = {}) {
  let date;
  if (test) {
    date = { numeOperator: 'Nume Prenume (test)', emailContact: 'contact@exemplu.ro' };
  } else {
    const f = path.join(AICI, 'date-publice.json');
    if (!fs.existsSync(f)) throw new Error('Lipseste GooglePlay/date-publice.json (copiaza date-publice.exemplu.json si completeaza).');
    date = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!String(date.numeOperator || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(date.emailContact || ''))) {
      throw new Error('Completeaza numeOperator si emailContact in GooglePlay/date-publice.json.');
    }
  }

  const azi = new Date();
  const luni = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const dataText = azi.getDate() + ' ' + luni[azi.getMonth()] + ' ' + azi.getFullYear();

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const completeaza = (html) => html
    .replaceAll('{{NUME_OPERATOR}}', esc(date.numeOperator.trim()))
    .replaceAll('{{EMAIL_CONTACT}}', esc(date.emailContact.trim()))
    .replaceAll('{{DATA}}', dataText);

  const rezultat = {};
  for (const f of ['confidentialitate.html', 'sterge-cont.html']) {
    const html = completeaza(fs.readFileSync(path.join(AICI, 'site', f), 'utf8'));
    if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('Au ramas campuri necompletate in ' + f);
    rezultat[f] = html;
  }
  rezultat['.well-known/assetlinks.json'] = assetlinks();
  return rezultat;
}

// rulat direct: scrie in site-gata/
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const fisiere = construiesteSite();
    const iesire = path.join(AICI, 'site-gata');
    fs.rmSync(iesire, { recursive: true, force: true });
    for (const [rel, continut] of Object.entries(fisiere)) {
      const tinta = path.join(iesire, rel);
      fs.mkdirSync(path.dirname(tinta), { recursive: true });
      fs.writeFileSync(tinta, continut);
      console.log('  + ' + rel);
    }
    console.log('Gata: ' + iesire);
  } catch (e) {
    console.error('NU S-A PUTUT: ' + e.message);
    process.exit(2);
  }
}
