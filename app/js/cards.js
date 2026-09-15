/* =========================================================
   Carduri de fidelitate: grila, cardul deschis, adaugarea
   (cu scanare), editarea si partajarea.
   ========================================================= */

import { api, mesajEroare } from './api.js';
import {
  state, save, uid, norm, mutate, visibleCards, visibleLists, cardsForList, noteCardUse, clearUndo,
} from './store.js';
import { sync, syncSoon } from './sync.js';
import {
  $, el, highlight, icon, sheet, confirmBox, dialogHtml, closeDialog, badge,
} from './ui.js';
import { MAGAZINE, CULORI_CARD, magazin, aspectCard } from './stores.js';
import {
  FORMATE, detecteazaFormat, verificaNumar, deseneazaCod, numarAfisat, numeFormat, numarPentruCod,
} from './barcode.js';
import { areCamera, pornesteScanarea } from './scanner.js';

let ctx = null;   // functii din app.js: randeaza, aratUndo, deschideLista, deschideCard, inapoi

export function initCarduri(context) {
  ctx = context;
  window.addEventListener('popstate', () => { if (panouDeschis) inchidePanou(false); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && lockDorit) cereEcranAprins();
  });
}

/* ---------------- utilitare ---------------- */

export function pluralCarduri(n) {
  if (n === 1) return '1 card de fidelitate';
  if (n % 100 >= 20 || n === 0) return n + ' de carduri de fidelitate';
  return n + ' carduri de fidelitate';
}

function stilEticheta(st) {
  const s = st || '';
  let css = 'font-weight:' + (s.includes('b') ? '800' : '600') + ';';
  if (s.includes('i')) css += 'font-style:italic;';
  if (s.includes('u')) css += 'text-transform:uppercase;';
  if (s.includes('s')) css += 'letter-spacing:.14em;';
  return css;
}

/** Sigla magazinului ca <img>; daca fisierul nu se incarca, pune in loc textul. */
function imgSigla(logo, alb, laEsec) {
  const img = el('img', { class: 'sigla' + (alb ? ' alb' : ''), src: logo, alt: '', draggable: 'false', decoding: 'async' });
  img.addEventListener('error', () => { if (laEsec) img.replaceWith(laEsec()); else img.remove(); }, { once: true });
  return img;
}

/** Fata unui card (folosita in grila, in previzualizare si in cercuri). */
export function fataCard(card, { mic = false } = {}) {
  const a = aspectCard(card);
  const lung = (a.label || '').length;
  const marime = mic ? 13 : (lung > 12 ? 17 : lung > 8 ? 21 : 26);
  const text = () => el('span', { class: 'lcard-label', style: stilEticheta(a.st) + 'font-size:' + marime + 'px', text: a.label });
  return el('div', {
    class: 'lcard-face' + (mic ? ' mic' : '') + (a.logo ? ' cu-sigla' : ''),
    style: 'background:' + a.bg + ';color:' + a.fg + ';' + (a.bg.toUpperCase() === '#FFFFFF' ? 'box-shadow:inset 0 0 0 1px #DDE7F3;' : ''),
  }, a.logo ? imgSigla(a.logo, a.alb, text) : text());
}

/* =========================================================
   GRILA
   ========================================================= */

export function randeazaCarduri(q) {
  const toate = visibleCards();
  const nq = norm(q || '');
  const gasite = nq
    ? toate.filter((c) => {
      const m = c.store ? magazin(c.store) : null;
      return norm(c.name).includes(nq) || norm(c.note || '').includes(nq) ||
        (m && norm(m.name).includes(nq)) || String(c.number || '').replace(/\s/g, '').includes(nq.replace(/\s/g, ''));
    })
    : toate;

  const ordine = state.cardSort || 'alfa';
  const folosiri = (c) => (state.cardUses[c.id] || {}).n || 0;
  gasite.sort((a, b) => {
    if (ordine === 'des') return folosiri(b) - folosiri(a) || a.name.localeCompare(b.name, 'ro');
    if (ordine === 'recent') return (b.updated_at || 0) - (a.updated_at || 0);
    return a.name.localeCompare(b.name, 'ro');
  });

  // cele folosite des, in cercuri (doar fara cautare)
  const cercuri = $('#cardsFrecvente');
  cercuri.innerHTML = '';
  const frecvente = nq ? [] : toate.filter((c) => folosiri(c) > 0)
    .sort((a, b) => folosiri(b) - folosiri(a)).slice(0, 8);
  for (const c of frecvente) {
    const a = aspectCard(c);
    cercuri.append(el('button', {
      class: 'cerc-card', type: 'button', 'data-id': c.id,
      onclick: () => ctx.deschideCard(c.id),
    },
      el('span', { class: 'cerc' + (a.logo ? ' cu-sigla' : ''), style: 'background:' + a.bg + ';color:' + a.fg },
        a.logo
          ? imgSigla(a.logo, a.alb, () => el('span', { style: stilEticheta(a.st) + 'font-size:' + marimeText(a.label, 52, 15, a.st), text: a.label }))
          : el('span', { style: stilEticheta(a.st) + 'font-size:' + marimeText(a.label, 52, 15, a.st), text: a.label })),
      el('span', { class: 'cerc-nume', text: c.name }),
    ));
  }
  cercuri.hidden = frecvente.length === 0;
  $('#cardsFrecventeTitlu').hidden = frecvente.length === 0;

  $('#cardsCount').textContent = nq
    ? gasite.length + (gasite.length === 1 ? ' rezultat' : ' rezultate')
    : pluralCarduri(toate.length);
  $('#cardsHead').hidden = toate.length === 0;

  const grila = $('#cardsGrid');
  grila.innerHTML = '';
  for (const c of gasite) {
    const fata = fataCard(c);
    const buton = el('button', {
      class: 'lcard', type: 'button', 'data-id': c.id,
      'aria-label': c.name,
      onclick: () => ctx.deschideCard(c.id),
    }, fata);
    const nr = state.cardShared[c.id] || 0;
    if (nr > 1) {
      const b = el('span', { class: 'lcard-share' });
      b.append(icon('people'));
      b.append(el('span', { text: String(nr) }));
      buton.append(b);
    }
    if (nq) buton.append(el('span', { class: 'lcard-sub', html: highlight(c.name, q, norm) }));
    grila.append(buton);
  }

  $('#cardsEmpty').hidden = toate.length > 0;
  $('#cardsNimic').hidden = !(nq && !gasite.length);
}

/** Marimea textului ca eticheta sa incapa intr-o latime data (in px). */
function marimeText(text, latime, max, st = '') {
  const n = Math.max(1, String(text || '').length);
  // majusculele si literele distantate ocupa mai mult loc
  const k = (st.includes('s') ? 0.62 : 1) * (st.includes('u') ? 0.82 : 1);
  return Math.max(6, Math.min(max, (latime * 1.7 * k) / n)).toFixed(1) + 'px';
}

export function meniuSortare() {
  const o = state.cardSort || 'alfa';
  sheet('Sortează după', [
    { icon: 'sort', text: 'Nume (A–Z)', on: o === 'alfa', run: () => { state.cardSort = 'alfa'; save(); ctx.randeaza(); } },
    { icon: 'people', text: 'Folosite des', on: o === 'des', run: () => { state.cardSort = 'des'; save(); ctx.randeaza(); } },
    { icon: 'redo', text: 'Modificate recent', on: o === 'recent', run: () => { state.cardSort = 'recent'; save(); ctx.randeaza(); } },
  ]);
}

/* =========================================================
   CARDUL DESCHIS
   ========================================================= */

let cardAratat = null;

export function randeazaCard(id) {
  const c = state.cards[id];
  if (!c || c.deleted) return false;

  if (cardAratat !== id) {
    cardAratat = id;
    noteCardUse(id);
  }
  lockDorit = true;
  cereEcranAprins();

  $('#cardTitle').textContent = c.name;
  const a = aspectCard(c);
  const box = $('#cardView');
  box.innerHTML = '';

  const numeText = () => el('span', { class: 'lc-nume', style: stilEticheta(a.st), text: a.label });
  const antet = el('div', { class: 'lc-antet' + (a.logo ? ' cu-sigla' : ''), style: 'background:' + a.bg + ';color:' + a.fg },
    a.logo ? el('span', { class: 'lc-sigla' }, imgSigla(a.logo, a.alb, numeText)) : numeText(),
  );
  // numele propriu al cardului (ex. "Mega Image - Ana") apare langa sigla
  if (a.logo && c.name && magazin(c.store) && c.name !== magazin(c.store).name) {
    antet.append(el('span', { class: 'lc-subnume', text: c.name }));
  }
  const nr = state.cardShared[c.id] || 0;
  if (nr > 1) {
    const p = el('span', { class: 'lc-pill' });
    p.append(icon('people'));
    p.append(el('span', { text: nr + ' persoane' }));
    antet.append(p);
  }

  const zona = el('button', { class: 'lc-cod', type: 'button', title: 'Arată codul pe tot ecranul', onclick: () => codPeTotEcranul(c.id) });
  const desen = el('div', { class: 'lc-desen' });
  const numar = el('div', { class: 'lc-numar', text: numarAfisat(c.number, c.format) });
  zona.append(desen, numar);
  box.append(antet, zona);

  deseneazaCod(desen, c.number, c.format).then((ok) => {
    if (!ok) {
      desen.append(el('div', { class: 'lc-farabare' },
        el('b', { text: c.format === 'NUMAI_TEXT' ? 'Arată numărul la casă' : 'Codul „' + numeFormat(c.format) + '” nu poate fi desenat aici' }),
        el('span', { text: 'Casierul poate tasta numărul de mai jos.' })));
    }
  });

  // notita si lista legata
  const extra = $('#cardExtra');
  extra.innerHTML = '';
  if (c.note) {
    const n = el('div', { class: 'lc-nota' });
    n.append(icon('note'));
    n.append(el('div', { text: c.note }));
    extra.append(n);
  }

  const lista = c.list_id && state.lists[c.list_id] && !state.lists[c.list_id].deleted ? state.lists[c.list_id] : null;

  const rand = (ic, text, run, cls = '', sub = '') => {
    const b = el('button', { class: 'gest ' + cls, type: 'button', onclick: run });
    b.append(icon(ic));
    b.append(el('span', { class: 'gest-text' }, el('span', { text }), sub ? el('small', { text: sub }) : null));
    b.append(el('span', { class: 'gest-sageata', text: '›' }));
    return b;
  };

  const gest = $('#cardManage');
  gest.innerHTML = '';
  gest.append(
    rand('edit', 'Editează cardul', () => formularCard({ id: c.id })),
    rand('list', lista ? 'Deschide lista „' + lista.name + '”' : 'Leagă de o listă', () => {
      if (lista) ctx.deschideLista(lista.id);
      else alegeLista(c.id);
    }, '', lista ? 'cardul apare direct în listă' : 'ca să-l ai la îndemână când faci cumpărăturile'),
    rand('expand', 'Arată codul pe tot ecranul', () => codPeTotEcranul(c.id)),
    rand('share', 'Partajează cardul', () => meniuPartajareCard(c.id)),
    c.owner === 0
      ? rand('exit', 'Renunță la acest card', () => renuntaLaCard(c.id), 'danger', 'rămâne la ceilalți')
      : rand('trash', 'Șterge cardul', () => stergeCard(c.id), 'danger'),
  );
  return true;
}

export function parasesteCard() {
  cardAratat = null;
  lockDorit = false;
  elibereazaEcranAprins();
}

/* ---------------- ecranul nu se stinge ---------------- */

let lock = null;
let lockDorit = false;

async function cereEcranAprins() {
  if (!('wakeLock' in navigator) || lock) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch (e) { lock = null; /* baterie slaba sau refuzat: nu e grav */ }
}

function elibereazaEcranAprins() {
  if (lock) { lock.release().catch(() => {}); lock = null; }
}

/* ---------------- cod pe tot ecranul ---------------- */

function codPeTotEcranul(id) {
  const c = state.cards[id];
  if (!c) return;
  const liniar = !['QR_CODE', 'NUMAI_TEXT', 'DATA_MATRIX', 'PDF_417', 'AZTEC'].includes(c.format);
  deschidePanou((p) => {
    p.classList.add('panou-cod');
    const interior = el('div', { class: 'cod-mare' + (liniar ? ' rotit' : '') });
    const desen = el('div', { class: 'cod-mare-desen' });
    interior.append(desen, el('div', { class: 'cod-mare-numar', text: numarAfisat(c.number, c.format) }));
    p.append(interior, el('div', { class: 'cod-mare-hint', text: 'Atinge ca să închizi' }));
    p.addEventListener('click', () => inchidePanou());
    deseneazaCod(desen, c.number, c.format, { mare: true });
  });
}

/* =========================================================
   PANOURI PE TOT ECRANUL (butonul "inapoi" al telefonului le inchide)
   ========================================================= */

let panouDeschis = null;
let laInchidere = [];

/* Exista un singur panou; daca e deja deschis, i se inlocuieste continutul
   (asa, un singur "inapoi" iese din tot fluxul: magazin -> scanare -> formular). */
function deschidePanou(construieste, { titlu = '' } = {}) {
  if (panouDeschis) goleste();
  let p = panouDeschis;
  if (!p) {
    p = el('div', { class: 'panou', role: 'dialog', 'aria-modal': 'true' });
    document.body.append(p);
    panouDeschis = p;
    history.pushState({ panou: 1 }, '');
  }
  if (titlu) {
    p.append(el('header', { class: 'panou-antet' },
      el('button', { class: 'icon-btn', type: 'button', title: 'Închide', onclick: () => inchidePanou() }, icon('close')),
      el('h2', { text: titlu }),
    ));
  }
  construieste(p);
  return p;
}

function goleste() {
  for (const f of laInchidere.splice(0)) { try { f(); } catch (e) { /* nimic */ } }
  if (panouDeschis) panouDeschis.innerHTML = '';
  if (panouDeschis) panouDeschis.className = 'panou';
}

/** Inchide panoul. Promisiunea se rezolva dupa ce istoricul s-a intors (ca navigarea
    urmatoare sa nu fie anulata de un "inapoi" care inca nu s-a produs). */
function inchidePanou(cuIstoric = true) {
  if (!panouDeschis) return Promise.resolve();
  goleste();
  panouDeschis.remove();
  panouDeschis = null;
  if (cuIstoric && history.state && history.state.panou) {
    return new Promise((gata) => {
      let terminat = false;
      const f = () => {
        if (terminat) return;
        terminat = true;
        window.removeEventListener('popstate', f);
        gata();
      };
      window.addEventListener('popstate', f);
      history.back();
      setTimeout(f, 500);
    });
  }
  return Promise.resolve();
}

export function panouEsteDeschis() {
  return !!panouDeschis;
}

/* =========================================================
   ADAUGAREA UNUI CARD
   ========================================================= */

export function cardNou() {
  alegeMagazin((m) => {
    if (areCamera()) scaneaza({ magazinAles: m });
    else formularCard({ magazinAles: m });
  });
}

function alegeMagazin(laAlegere) {
  deschidePanou((p) => {
    const cauta = el('input', { class: 'panou-cauta', type: 'search', placeholder: 'Caută magazinul...', autocomplete: 'off' });
    const lista = el('div', { class: 'magazine' });
    p.append(el('div', { class: 'panou-corp' }, cauta, lista));

    const deseneaza = () => {
      const q = norm(cauta.value);
      lista.innerHTML = '';
      const alt = el('button', { class: 'magazin alt', type: 'button', onclick: () => laAlegere(null) },
        el('span', { class: 'mag-culoare', style: 'background:conic-gradient(#1B65C0,#2E9E7A,#F2B705,#E4572E,#8A4FBF,#1B65C0)' }),
        el('span', { class: 'mag-nume', text: 'Alt magazin' }),
        el('small', { text: 'alegi tu numele și culoarea' }));
      lista.append(alt);

      let categorie = '';
      for (const m of MAGAZINE) {
        if (q && !norm(m.name).includes(q) && !m.kw.some((k) => norm(k).includes(q))) continue;
        if (m.cat !== categorie && !q) {
          categorie = m.cat;
          lista.append(el('div', { class: 'mag-cat', text: m.cat }));
        }
        lista.append(el('button', { class: 'magazin', type: 'button', 'data-store': m.id, onclick: () => laAlegere(m) },
          el('span', { class: 'mag-culoare' + (m.logo ? ' cu-sigla' : ''), style: 'background:' + m.bg + ';color:' + m.fg + ';' + (m.bg === '#FFFFFF' ? 'box-shadow:inset 0 0 0 1px #DDE7F3' : '') },
            m.logo
              ? imgSigla(m.logo, m.alb, () => el('span', { style: stilEticheta(m.st) + 'font-size:' + marimeText(m.label, 40, 11, m.st), text: m.label }))
              : el('span', { style: stilEticheta(m.st) + 'font-size:' + marimeText(m.label, 40, 11, m.st), text: m.label })),
          el('span', { class: 'mag-nume', text: m.name })));
      }
    };
    cauta.addEventListener('input', deseneaza);
    deseneaza();
  }, { titlu: 'Alege magazinul' });
}

function scaneaza({ magazinAles, id, dateFormular }) {
  deschidePanou((p) => {
    p.classList.add('panou-scaner');
    const video = el('video', { class: 'scan-video', playsinline: '', muted: '', autoplay: '' });
    video.muted = true;
    const mesaj = el('div', { class: 'scan-mesaj', text: 'Îndreaptă camera spre codul de bare' + (magazinAles ? ' de pe cardul ' + magazinAles.name : '') });
    const eroare = el('div', { class: 'scan-eroare', hidden: 'hidden' });

    p.append(
      video,
      el('div', { class: 'scan-cadru' }, el('span', { class: 'scan-linie' })),
      el('div', { class: 'scan-sus' },
        el('button', { class: 'icon-btn', type: 'button', title: 'Închide', onclick: () => inchidePanou() }, icon('close')),
        mesaj),
      el('div', { class: 'scan-jos' },
        eroare,
        el('button', {
          class: 'btn-scan-manual', type: 'button', text: 'Introdu numărul manual',
          onclick: () => formularCard({ magazinAles, id, _date: dateFormular }),
        })),
    );

    let control = null;
    laInchidere.push(() => { if (control) control.opreste(); });

    pornesteScanarea(video, {
      laGasire: (r) => formularCard({ magazinAles, id, scanat: r, _date: dateFormular }),
      laEroare: (m) => {
        eroare.textContent = m;
        eroare.hidden = false;
        mesaj.hidden = true;
      },
    }).then((c) => {
      control = c;
      if (!panouDeschis) c.opreste();   // s-a inchis intre timp
    });
  });
}

/* ---------------- formularul (adaugare si editare) ---------------- */

function potrivireLista(m) {
  if (!m) return '';
  const cuvinte = [norm(m.name), ...m.kw.map(norm)].filter((w) => w.length >= 2);
  const lista = visibleLists().find((l) => {
    const n = norm(l.name);
    return cuvinte.some((w) => n === w || n.split(' ').includes(w) || (w.length >= 4 && n.includes(w)));
  });
  return lista ? lista.id : '';
}

function formularCard({ id, magazinAles, scanat, _date }) {
  const existent = id ? state.cards[id] : null;
  const m = existent ? (existent.store ? magazin(existent.store) : null) : magazinAles;

  const date = _date
    ? { ..._date }
    : existent
    ? { ...existent }
    : {
      store: m ? m.id : '',
      name: m ? m.name : '',
      color: '',
      number: scanat ? scanat.numar : '',
      format: scanat ? scanat.format : 'CODE_128',
      note: '',
      list_id: potrivireLista(m),
    };
  if (scanat && (existent || _date)) { date.number = scanat.numar; date.format = scanat.format; }
  let formatAlesDeMana = !!existent || !!scanat || !!(_date && _date.format);

  deschidePanou((p) => {
    const previzualizare = el('div', { class: 'form-prev' });
    const cod = el('div', { class: 'form-cod' });
    const eroare = el('div', { class: 'form-eroare', hidden: 'hidden' });

    const inNume = el('input', { class: 'dlg-input', type: 'text', maxlength: '80', value: date.name, placeholder: 'ex: Mega Image', id: 'cardNume' });
    const inNumar = el('input', { class: 'dlg-input', type: 'text', maxlength: '120', value: date.number, placeholder: 'cifrele de sub codul de bare', inputmode: 'text', autocomplete: 'off', id: 'cardNumar' });
    const selFormat = el('select', { class: 'dlg-input', id: 'cardFormat' });
    const formateAfisate = FORMATE.slice();
    if (!FORMATE.some((f) => f.id === date.format)) formateAfisate.push({ id: date.format, nume: numeFormat(date.format) + ' (scanat)' });
    for (const f of formateAfisate) {
      const o = el('option', { value: f.id, text: f.nume });
      if (f.id === date.format) o.selected = true;
      selFormat.append(o);
    }

    const selLista = el('select', { class: 'dlg-input', id: 'cardLista' });
    selLista.append(el('option', { value: '', text: '— la nicio listă —' }));
    for (const l of visibleLists()) {
      const o = el('option', { value: l.id, text: l.name });
      if (l.id === date.list_id) o.selected = true;
      selLista.append(o);
    }

    const inNota = el('textarea', { class: 'dlg-input', rows: '3', maxlength: '500', placeholder: 'ex: cardul e pe numele Anei; puncte expiră în decembrie', id: 'cardNota' });
    inNota.value = date.note || '';

    const culori = el('div', { class: 'color-picker' });
    const deseneazaCulori = () => {
      culori.innerHTML = '';
      if (m) {
        const b = el('button', {
          class: 'color-dot magazin-dot' + (!date.color ? ' on' : ''), type: 'button',
          title: 'Culoarea magazinului', style: 'background:' + m.bg,
          onclick: () => { date.color = ''; actualizeaza(); },
        });
        culori.append(b);
      }
      for (const c of CULORI_CARD) {
        culori.append(el('button', {
          class: 'color-dot' + (date.color === c || (!m && !date.color && c === CULORI_CARD[0]) ? ' on' : ''),
          type: 'button', style: 'background:' + c, title: c,
          onclick: () => { date.color = c; actualizeaza(); },
        }));
      }
    };

    const btnScan = el('button', { class: 'btn-inline', type: 'button', title: 'Scanează cu camera' }, icon('camera'));
    btnScan.hidden = !areCamera();
    btnScan.addEventListener('click', () => {
      // scanam fara sa pierdem ce e scris deja in formular
      citesteFormular();
      scaneaza({ id, magazinAles: m, dateFormular: { ...date } });
    });

    const citesteFormular = () => {
      date.name = inNume.value.trim();
      date.number = inNumar.value;
      date.format = selFormat.value;
      date.list_id = selLista.value;
      date.note = inNota.value.trim();
    };

    let desenare = 0;
    const actualizeaza = () => {
      citesteFormular();
      if (!date.color && !m) date.color = CULORI_CARD[0];
      previzualizare.innerHTML = '';
      previzualizare.append(fataCard({ ...date, name: date.name || (m ? m.name : 'Card nou') }));
      deseneazaCulori();

      const problema = date.number.trim() ? verificaNumar(date.number, date.format) : '';
      eroare.textContent = problema;
      eroare.hidden = !problema;

      const nr = ++desenare;
      if (!date.number.trim()) { cod.innerHTML = ''; cod.hidden = true; return; }
      cod.hidden = false;
      const tinta = el('div', { class: 'form-cod-desen' });
      deseneazaCod(tinta, date.number, date.format).then((ok) => {
        if (nr !== desenare) return;
        cod.innerHTML = '';
        cod.append(ok ? tinta : el('div', { class: 'form-cod-nu', text: 'Codul se va afișa ca număr' }));
      });
    };

    inNume.addEventListener('input', actualizeaza);
    inNumar.addEventListener('input', () => {
      if (!formatAlesDeMana) {
        const f = detecteazaFormat(inNumar.value);
        if (f !== selFormat.value) selFormat.value = f;
      }
      actualizeaza();
    });
    selFormat.addEventListener('change', () => { formatAlesDeMana = true; actualizeaza(); });
    selLista.addEventListener('change', actualizeaza);

    const salveaza = async () => {
      citesteFormular();
      if (!date.name) date.name = m ? m.name : '';
      if (!date.name) { eroare.textContent = 'Scrie numele cardului.'; eroare.hidden = false; inNume.focus(); return; }
      const problema = verificaNumar(date.number, date.format);
      if (problema) { eroare.textContent = problema; eroare.hidden = false; inNumar.focus(); return; }
      const numar = numarPentruCod(date.number, date.format) || date.number.trim();

      let cardId = id;
      if (existent) {
        mutate('Am modificat cardul', (mm) => {
          const o = mm.card(id);
          o.name = date.name; o.number = numar; o.format = date.format;
          o.color = date.color || ''; o.note = date.note; o.list_id = date.list_id;
        });
      } else {
        cardId = uid();
        mutate('Am adăugat cardul', (mm) => {
          mm.newCard({
            id: cardId, store: date.store || '', name: date.name, color: date.color || '',
            number: numar, format: date.format, note: date.note, list_id: date.list_id,
            deleted: 0, owner: 1,
          });
        });
      }
      syncSoon();
      await inchidePanou();
      if (existent) { ctx.randeaza(); ctx.aratUndo('Card modificat'); }
      else { ctx.deschideCard(cardId); badge('Card salvat'); }
    };

    p.append(el('div', { class: 'panou-corp form-card' },
      previzualizare,
      el('label', { class: 'field' }, el('span', { text: 'Nume' }), inNume),
      el('label', { class: 'field' }, el('span', { text: 'Numărul cardului' }),
        el('div', { class: 'rand-input' }, inNumar, btnScan)),
      cod,
      eroare,
      el('label', { class: 'field' }, el('span', { text: 'Tipul codului' }), selFormat),
      el('div', { class: 'field' }, el('span', { text: 'Culoare' }), culori),
      el('label', { class: 'field' }, el('span', { text: 'Arată-l la lista' }), selLista),
      el('label', { class: 'field' }, el('span', { text: 'Notiță' }), inNota),
    ));
    p.append(el('div', { class: 'panou-jos' },
      el('button', { class: 'btn-primary', type: 'button', id: 'cardSalveaza', text: existent ? 'Salvează modificările' : 'Salvează cardul', onclick: salveaza })));

    actualizeaza();
    if (!date.number) setTimeout(() => inNumar.focus(), 120);
  }, { titlu: existent ? 'Editează cardul' : (m ? m.name : 'Card nou') });
}

/* ---------------- legare de lista, stergere, partajare ---------------- */

function alegeLista(cardId) {
  const liste = visibleLists();
  if (!liste.length) { badge('Nu ai încă nicio listă'); return; }
  sheet('La ce listă să apară cardul?', liste.map((l) => ({
    icon: 'list',
    text: l.name,
    run: () => {
      mutate('Am legat cardul de listă', (mm) => { mm.card(cardId).list_id = l.id; });
      syncSoon();
      ctx.randeaza();
      ctx.aratUndo('Cardul apare acum la „' + l.name + '”');
    },
  })));
}

function stergeCard(cardId) {
  const c = state.cards[cardId];
  if (!c) return;
  mutate('Am șters cardul', (mm) => { mm.card(cardId).deleted = 1; });
  syncSoon();
  ctx.inapoiLaCarduri();
  setTimeout(() => ctx.aratUndo('Cardul „' + c.name + '” a fost șters'), 60);
}

async function renuntaLaCard(cardId) {
  const c = state.cards[cardId];
  if (!c) return;
  const ok = await confirmBox({
    title: 'Renunți la „' + c.name + '”?',
    text: 'Cardul rămâne la cel care ți l-a trimis, dar dispare de pe telefonul tău.',
    ok: 'Renunț',
  });
  if (!ok) return;
  try { await api.cardShareLeave(cardId); } catch (e) { /* offline: dispare oricum local */ }
  delete state.cards[cardId];
  save(true);
  clearUndo();
  ctx.inapoiLaCarduri();
  badge('Ai renunțat la card');
}

function meniuPartajareCard(cardId) {
  const c = state.cards[cardId];
  if (!c) return;
  sheet('Partajează „' + c.name + '”', [
    { icon: 'people', text: 'Invită pe cineva (cod)', run: () => codCard(cardId) },
    (state.cardShared[cardId] || 0) > 1 ? { icon: 'people', text: 'Cine are acces', run: () => membriCard(cardId) } : null,
    { icon: 'share', text: 'Trimite numărul ca text', run: () => trimiteNumar(cardId) },
  ]);
}

async function codCard(cardId) {
  badge('Cer codul...', { ms: 0 });
  try {
    const r = await api.cardShareCreate(cardId);
    badge('');
    const c = state.cards[cardId];
    dialogHtml('Cod de invitație', (box) => {
      box.append(el('p', { text: 'Persoana își face cont în aplicație, apoi meniul ⋮ → „Intră cu un cod de invitație” și scrie codul:' }));
      box.append(el('div', { class: 'code-box', text: r.code }));
      box.append(el('p', { text: 'Codul e valabil ' + (r.expira || '14 zile') + '. Cardul va apărea la amândoi.' }));
      box.append(el('div', { class: 'dialog-actions' },
        el('button', {
          class: 'btn-text', type: 'button', text: 'Trimite',
          onclick: async () => {
            const link = location.origin + location.pathname + '#cod=' + r.code;
            const txt = 'Îți trimit cardul ' + c.name + ' în Lista de cumpărături: ' + link + ' (cod: ' + r.code + ')';
            try {
              if (navigator.share) await navigator.share({ text: txt });
              else { await navigator.clipboard.writeText(txt); badge('Copiat'); }
            } catch (e) { /* renuntare */ }
          },
        }),
        el('button', { class: 'btn-text', type: 'button', text: 'Gata', onclick: () => closeDialog() }),
      ));
    });
  } catch (e) {
    badge(mesajEroare(e), { error: true, ms: 3000 });
  }
}

async function membriCard(cardId) {
  try {
    const r = await api.cardShareMembers(cardId);
    const eu = state.user && state.user.id;
    const potScoate = (state.cards[cardId] || {}).owner;
    dialogHtml('Cine are acces', (box) => {
      for (const m of r.members) {
        const rand = el('div', { class: 'member-row' },
          el('div', { class: 'avatar', text: (m.name || m.email || '?')[0].toUpperCase() }),
          el('div', { class: 'member-info' },
            el('div', { text: (m.name || m.email) + (m.id === eu ? ' (tu)' : '') }),
            el('small', { text: Number(m.owner) ? 'a adăugat cardul' : m.email })));
        if (potScoate && !Number(m.owner) && m.id !== eu) {
          rand.append(el('button', {
            class: 'btn-text danger', type: 'button', text: 'Scoate',
            onclick: async () => {
              await api.cardShareRemove(cardId, m.id);
              closeDialog();
              badge('Am scos persoana');
              sync({ silent: true });
            },
          }));
        }
        box.append(rand);
      }
      box.append(el('div', { class: 'dialog-actions' },
        el('button', { class: 'btn-text', type: 'button', text: 'Închide', onclick: () => closeDialog() })));
    });
  } catch (e) {
    badge(mesajEroare(e), { error: true, ms: 3000 });
  }
}

async function trimiteNumar(cardId) {
  const c = state.cards[cardId];
  const text = c.name + ': ' + numarAfisat(c.number, c.format);
  try {
    if (navigator.share) await navigator.share({ title: c.name, text });
    else { await navigator.clipboard.writeText(text); badge('Numărul a fost copiat'); }
  } catch (e) { /* renuntare */ }
}

/* ---------------- din ecranul unei liste ---------------- */

export function cardulListei(listId) {
  const carduri = cardsForList(listId);
  if (!carduri.length) return;
  if (carduri.length === 1) { ctx.deschideCard(carduri[0].id); return; }
  sheet('Ce card arăți?', carduri.map((c) => ({ icon: 'card', text: c.name, run: () => ctx.deschideCard(c.id) })));
}
