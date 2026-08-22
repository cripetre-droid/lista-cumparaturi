/* =========================================================
   Lista de cumparaturi - logica aplicatiei
   ========================================================= */

import { API_BASE, setApiBase, APP_VERSION } from './config.js';
import { api, mesajEroare, ApiError } from './api.js';
import {
  state, load, save, resetAll, uid, now, norm, mutate,
  canUndo, canRedo, undo, redo, undoLabel, clearUndo,
  visibleLists, listItems, listStats, nextPosition, nextListPosition,
  rememberProduct, localSuggestions,
} from './store.js';
import { sync, syncSoon, startAuto, onSync, hasPending } from './sync.js';
import {
  $, $$, el, escapeHtml, highlight, icon, sheet, closeSheet,
  askText, confirmBox, dialogHtml, closeDialog, snack, hideSnack, badge, makeSortable,
} from './ui.js';

/* ---------------- constante ---------------- */

const CULORI = ['#1B65C0', '#2E9E7A', '#C9761E', '#8A4FBF', '#C8384A', '#0E8CA8', '#5C6BC0', '#7A8B99'];
const UNITATI = ['buc', 'kg', 'g', 'l', 'ml', 'pachet', 'cutie', 'sticlă'];
const UNITATI_RE = 'buc|bucati|bucăți|kg|kilograme|g|grame|l|litri|litru|ml|pachet|pachete|pach|cutie|cutii|sticla|sticlă|sticle|borcan|borcane|plic|plicuri|conserva|conservă';

/* ---------------- stare de interfata ---------------- */

const ui = {
  screen: 'lists',      // 'lists' | 'items'
  listId: null,
  qLists: '',
  qItems: '',
  unit: '',
  authMode: 'login',
};

/* =========================================================
   PORNIRE
   ========================================================= */

function boot() {
  load();
  aplicaTema(state.theme || 'auto');
  legaEvenimente();

  onSync((st) => {
    if (st === 'sync') badge('Sincronizez...', { ms: 0 });
    else if (st === 'idle') { badge('Sincronizat'); randeaza(); }
    else if (st === 'offline') badge('Fără conexiune - datele sunt salvate pe telefon', { ms: 2600 });
    else if (st === 'auth') { badge('Sesiune expirată', { error: true, ms: 3000 }); deconectatDeServer(); }
    else if (st === 'error') badge('Nu am putut sincroniza', { error: true, ms: 2600 });
  });

  if (!state.token) {
    aratAuth();
  } else {
    porneste();
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function porneste() {
  startAuto();
  ruteazaDinUrl();
  randeaza();
  sync({ full: state.lastSync === 0, silent: false });
}

/* =========================================================
   AUTENTIFICARE
   ========================================================= */

function aratAuth() {
  $('#auth').classList.remove('hidden');
  $('#screenLists').classList.add('hidden');
  $('#screenItems').classList.add('hidden');
  setAuthMode('login');
}

function setAuthMode(mode) {
  ui.authMode = mode;
  const inreg = mode === 'register';
  $('#fieldName').hidden = !inreg;
  $('#fieldCode').hidden = !inreg;
  $('#authSubmit').textContent = inreg ? 'Creează contul' : 'Intră în cont';
  $('#authSub').textContent = inreg
    ? 'Contul îți ține listele pe toate telefoanele.'
    : 'Intră în cont ca să ai listele pe toate telefoanele.';
  $('#toggleMode').textContent = inreg ? 'Am deja cont — vreau să intru' : 'Nu am cont — vreau să-mi fac unul';
  $('#inPass').setAttribute('autocomplete', inreg ? 'new-password' : 'current-password');
  $('#authError').hidden = true;
}

async function trimiteAuth(e) {
  e.preventDefault();
  const btn = $('#authSubmit');
  const err = $('#authError');
  err.hidden = true;
  btn.disabled = true;
  const textVechi = btn.textContent;
  btn.textContent = 'Un moment...';

  const date = {
    email: $('#inEmail').value.trim(),
    password: $('#inPass').value,
    name: $('#inName').value.trim(),
    code: $('#inCode').value.trim(),
  };

  try {
    const r = ui.authMode === 'register' ? await api.register(date) : await api.login(date);
    state.token = r.token;
    state.user = r.user;
    state.lastSync = 0;
    save(true);
    $('#auth').classList.add('hidden');
    porneste();
  } catch (ex) {
    err.textContent = mesajEroare(ex);
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = textVechi;
  }
}

function deconectatDeServer() {
  state.token = null;
  save(true);
  aratAuth();
}

async function deconecteaza() {
  if (hasPending()) {
    const ok = await confirmBox({
      title: 'Ai modificări nesincronizate',
      text: 'Dacă ieși acum, modificările făcute offline se pierd. Continui?',
      ok: 'Ies oricum',
    });
    if (!ok) return;
  }
  try { await api.logout(); } catch (e) { /* si offline iesim */ }
  resetAll();
  save(true);
  aratAuth();
}

/* =========================================================
   NAVIGARE
   ========================================================= */

function ruteazaDinUrl() {
  const h = location.hash || '';
  const m = h.match(/^#\/l\/([a-f0-9]{32})/);
  if (m && state.lists[m[1]] && !state.lists[m[1]].deleted) {
    ui.screen = 'items';
    ui.listId = m[1];
  } else {
    ui.screen = 'lists';
    ui.listId = null;
  }
}

function deschideLista(id) {
  ui.listId = id;
  ui.screen = 'items';
  ui.qItems = '';
  $('#qItems').value = '';
  $('#searchbarItems').hidden = true;
  location.hash = '#/l/' + id;
  randeaza();
  setTimeout(() => $('#itemsContent').scrollTo(0, 0), 0);
}

function inapoiLaListe() {
  if (location.hash) history.back();
  else { ui.screen = 'lists'; ui.listId = null; randeaza(); }
}

window.addEventListener('hashchange', () => {
  ruteazaDinUrl();
  randeaza();
});

/* =========================================================
   RANDARE
   ========================================================= */

function randeaza() {
  if (!state.token) return;
  const peListe = ui.screen === 'lists';
  $('#screenLists').classList.toggle('hidden', !peListe);
  $('#screenItems').classList.toggle('hidden', peListe);
  $('#auth').classList.add('hidden');

  $('#btnUndoLists').hidden = !canUndo();
  $('#btnUndoItems').hidden = !canUndo();

  if (peListe) randeazaListe();
  else randeazaArticole();

  // notificarea cu "Anulează" nu trebuie sa acopere bara de adaugare
  const inaltimeComposer = peListe ? 0 : ($('#composer').offsetHeight || 0);
  document.documentElement.style.setProperty('--snack-lift', inaltimeComposer + 'px');
}

/* ---------------- ecranul cu liste ---------------- */

function randeazaListe() {
  const wrap = $('#listsWrap');
  const q = ui.qLists.trim();
  const liste = visibleLists();

  wrap.innerHTML = '';

  const gasite = q
    ? liste.filter((l) => norm(l.name).includes(norm(q)))
    : liste;

  for (const l of gasite) {
    const st = listStats(l.id);
    const culoare = CULORI[l.color % CULORI.length] || CULORI[0];
    const proc = st.total ? Math.round((st.done / st.total) * 100) : 0;
    const nrPersoane = state.shared[l.id] || 0;

    const card = el('div', {
      class: 'list-card',
      'data-id': l.id,
      style: '--c:' + culoare,
      onclick: (e) => {
        if (e.target.closest('.row-btn')) return;
        deschideLista(l.id);
      },
    });

    const meta = el('div', { class: 'list-meta' });
    if (st.total) {
      meta.append(el('span', { text: st.done + ' din ' + st.total }));
      meta.append(el('div', { class: 'list-bar' }, el('i', { style: 'width:' + proc + '%' })));
    } else {
      meta.append(el('span', { text: 'gol' }));
    }
    if (nrPersoane > 1) {
      const b = el('span', { class: 'badge-share' });
      b.append(icon('people'));
      b.append(el('span', { text: String(nrPersoane) }));
      meta.append(b);
    }

    card.append(
      el('div', { class: 'list-body' },
        el('div', { class: 'list-name', html: highlight(l.name, q, norm) }),
        meta,
      ),
      el('button', {
        class: 'row-btn', type: 'button', title: 'Opțiuni',
        onclick: (e) => { e.stopPropagation(); meniuLista(l.id); },
      }, iconDots()),
      el('button', { class: 'row-btn drag-handle', type: 'button', title: 'Trage ca să muți' }, iconDrag()),
    );
    wrap.append(card);
  }

  $('#listsEmpty').hidden = liste.length > 0 || !!q;

  // rezultate din produse (cautare globala)
  const box = $('#listsSearchResults');
  box.innerHTML = '';
  if (q) {
    const nq = norm(q);
    const potriviri = Object.values(state.items)
      .filter((i) => !i.deleted && norm(i.name).includes(nq) && state.lists[i.list_id] && !state.lists[i.list_id].deleted)
      .sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name, 'ro'))
      .slice(0, 60);

    if (!gasite.length && !potriviri.length) {
      box.append(el('div', { class: 'empty' }, el('p', { text: 'Nimic găsit pentru „' + q + '”.' })));
    } else if (potriviri.length) {
      box.append(el('div', { class: 'sr-group', text: 'Produse (' + potriviri.length + ')' }));
      for (const it of potriviri) {
        const lista = state.lists[it.list_id];
        box.append(el('div', {
          class: 'sr-item' + (it.done ? ' done' : ''),
          onclick: () => { deschideLista(it.list_id); ui.qItems = q; setTimeout(() => cautaInArticole(q), 30); },
        },
          el('span', { class: 'sr-name', html: highlight(it.name, q, norm) }),
          it.qty ? el('span', { class: 'qty-pill', text: it.qty + (it.unit ? ' ' + it.unit : '') }) : null,
          el('span', { class: 'sr-list', text: lista ? lista.name : '' }),
        ));
      }
    }
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}

/* ---------------- ecranul cu articole ---------------- */

function randeazaArticole() {
  const lista = state.lists[ui.listId];
  if (!lista || lista.deleted) { ui.screen = 'lists'; location.hash = ''; randeazaListe(); return; }

  $('#itemsTitle').textContent = lista.name;
  const culoare = CULORI[lista.color % CULORI.length] || CULORI[0];
  document.documentElement.style.setProperty('--list-color', culoare);

  const q = ui.qItems.trim();
  const nq = norm(q);
  const toate = listItems(ui.listId);
  const articole = q ? toate.filter((i) => norm(i.name).includes(nq)) : toate;

  const st = listStats(ui.listId);
  $('#progressFill').style.width = (st.total ? (st.done / st.total) * 100 : 0) + '%';

  const stats = $('#itemsStats');
  stats.innerHTML = '';
  if (q) {
    stats.append(el('span', { html: '<b>' + articole.length + '</b> rezultate pentru „' + escapeHtml(q) + '”' }));
  } else if (st.total) {
    stats.append(el('span', { html: '<b>' + st.left + '</b> de cumpărat' }));
    if (st.done) stats.append(el('span', { text: '· ' + st.done + ' în coș' }));
  }

  const wrap = $('#itemsWrap');
  wrap.innerHTML = '';

  const necumparate = articole.filter((i) => !i.done);
  const cumparate = articole.filter((i) => i.done);

  for (const it of necumparate) wrap.append(randRand(it, q));
  if (cumparate.length) {
    wrap.append(el('div', { class: 'divider', text: 'În coș (' + cumparate.length + ')' }));
    for (const it of cumparate) wrap.append(randRand(it, q));
  }

  $('#itemsEmpty').hidden = toate.length > 0;
  if (q && !articole.length) {
    wrap.append(el('div', { class: 'empty' }, el('p', { text: 'Niciun produs care să conțină „' + q + '”.' })));
  }
}

function randRand(it, q) {
  const rand = el('div', {
    class: 'item' + (it.done ? ' done' : ''),
    'data-id': it.id,
    onclick: (e) => {
      if (e.target.closest('.row-btn')) return;
      comutaBifa(it.id);
    },
  });

  const check = el('button', { class: 'check', type: 'button', title: it.done ? 'Debifează' : 'Bifează' });
  const v = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  v.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', 'currentColor');
  p.setAttribute('d', 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
  v.append(p);
  check.append(v);

  const body = el('div', { class: 'item-body' },
    el('div', { class: 'item-name', html: highlight(it.name, q, norm) }),
    it.note ? el('div', { class: 'item-sub', text: it.note }) : null,
  );

  rand.append(check, body);
  if (it.qty) rand.append(el('span', { class: 'qty-pill', text: it.qty + (it.unit ? ' ' + it.unit : '') }));
  rand.append(
    el('button', {
      class: 'row-btn', type: 'button', title: 'Opțiuni',
      onclick: (e) => { e.stopPropagation(); meniuArticol(it.id); },
    }, iconDots()),
    el('button', { class: 'row-btn drag-handle', type: 'button', title: 'Trage ca să muți' }, iconDrag()),
  );
  return rand;
}

function iconDots() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', 'currentColor');
  p.setAttribute('d', 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z');
  s.append(p);
  return s;
}

function iconDrag() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', 'currentColor');
  p.setAttribute('d', 'M4 9h16v2H4V9zm0 4h16v2H4v-2z');
  s.append(p);
  return s;
}

/* =========================================================
   ACTIUNI PE LISTE
   ========================================================= */

async function listaNoua() {
  const r = await askText({
    title: 'Listă nouă',
    label: 'Numele listei',
    placeholder: 'ex: Mega, Farmacie, Piață',
    ok: 'Creează',
    extra: alegeCuloare(0),
  });
  if (!r || !r.text) return;
  const id = uid();
  mutate('Am creat lista', (m) => {
    m.newList({
      id, name: r.text, color: r.extra || 0,
      position: nextListPosition(), deleted: 0, owner: 1,
    });
  });
  syncSoon();
  deschideLista(id);
}

function alegeCuloare(initial) {
  return (box) => {
    let sel = initial || 0;
    const wrap = el('div', { class: 'color-picker' });
    CULORI.forEach((c, i) => {
      const d = el('button', {
        class: 'color-dot' + (i === sel ? ' on' : ''),
        type: 'button',
        style: 'background:' + c,
        title: 'Culoare ' + (i + 1),
        onclick: () => {
          sel = i;
          $$('.color-dot', wrap).forEach((x, j) => x.classList.toggle('on', j === i));
        },
      });
      wrap.append(d);
    });
    box.append(el('div', { class: 'field' }, el('span', { text: 'Culoare' }), wrap));
    return { value: () => sel };
  };
}

function meniuLista(id) {
  const l = state.lists[id];
  if (!l) return;
  const st = listStats(id);
  sheet(l.name, [
    { icon: 'edit', text: 'Redenumește / schimbă culoarea', run: () => redenumesteLista(id) },
    { icon: 'share', text: 'Partajează lista', run: () => meniuPartajare(id) },
    { icon: 'copy', text: 'Copiază lista într-una nouă', run: () => copiazaLista(id) },
    '-',
    st.done ? { icon: 'broom', text: 'Șterge produsele din coș (' + st.done + ')', run: () => stergeBifate(id) } : null,
    { icon: 'trash', text: 'Șterge lista', danger: true, run: () => stergeLista(id) },
  ]);
}

async function redenumesteLista(id) {
  const l = state.lists[id];
  if (!l) return;
  const r = await askText({
    title: 'Redenumește lista',
    label: 'Numele listei',
    value: l.name,
    extra: alegeCuloare(l.color || 0),
  });
  if (!r || !r.text) return;
  mutate('Am redenumit lista', (m) => {
    const o = m.list(id);
    o.name = r.text;
    o.color = r.extra || 0;
  });
  syncSoon();
  randeaza();
  aratUndo('Listă modificată');
}

async function stergeLista(id) {
  const l = state.lists[id];
  if (!l) return;
  const st = listStats(id);
  const ok = await confirmBox({
    title: 'Ștergi lista „' + l.name + '”?',
    text: st.total ? 'Se șterg și cele ' + st.total + ' produse din ea.' : 'Lista este goală.',
  });
  if (!ok) return;
  mutate('Am șters lista', (m) => {
    m.list(id).deleted = 1;
  });
  syncSoon();
  if (ui.listId === id) { ui.screen = 'lists'; ui.listId = null; location.hash = ''; }
  randeaza();
  aratUndo('Lista „' + l.name + '” a fost ștearsă');
}

function copiazaLista(id) {
  const l = state.lists[id];
  if (!l) return;
  const nouId = uid();
  const articole = listItems(id);
  mutate('Am copiat lista', (m) => {
    m.newList({
      id: nouId, name: l.name + ' (copie)', color: l.color,
      position: nextListPosition(), deleted: 0, owner: 1,
    });
    let poz = 10;
    for (const it of articole) {
      m.newItem({
        id: uid(), list_id: nouId, name: it.name, qty: it.qty, unit: it.unit,
        note: it.note || '', done: 0, position: poz, deleted: 0,
      });
      poz += 10;
    }
  });
  syncSoon();
  randeaza();
  aratUndo('Am copiat lista');
}

/* =========================================================
   ACTIUNI PE ARTICOLE
   ========================================================= */

/** Desparte "2 kg cartofi" in cantitate, unitate si nume. */
function parseazaText(text) {
  let s = text.trim();
  let qty = '', unit = '';

  let m = s.match(new RegExp('^(\\d+(?:[.,]\\d+)?)\\s*(' + UNITATI_RE + ')?\\s+(.+)$', 'i'));
  if (m) {
    qty = m[1].replace(',', '.');
    unit = normUnit(m[2] || '');
    s = m[3].trim();
  } else {
    m = s.match(new RegExp('^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(' + UNITATI_RE + ')$', 'i'));
    if (m) {
      s = m[1].trim();
      qty = m[2].replace(',', '.');
      unit = normUnit(m[3]);
    }
  }
  if (qty.endsWith('.0')) qty = qty.slice(0, -2);
  return { name: s, qty, unit };
}

function normUnit(u) {
  const x = norm(u);
  if (!x) return '';
  if (['buc', 'bucati'].includes(x)) return 'buc';
  if (['kg', 'kilograme'].includes(x)) return 'kg';
  if (['g', 'grame'].includes(x)) return 'g';
  if (['l', 'litri', 'litru'].includes(x)) return 'l';
  if (['ml'].includes(x)) return 'ml';
  if (['pachet', 'pachete', 'pach'].includes(x)) return 'pachet';
  if (['cutie', 'cutii'].includes(x)) return 'cutie';
  if (['sticla', 'sticle'].includes(x)) return 'sticlă';
  if (['borcan', 'borcane'].includes(x)) return 'borcan';
  if (['plic', 'plicuri'].includes(x)) return 'plic';
  if (['conserva'].includes(x)) return 'conservă';
  return u;
}

function adaugaArticol(textBrut, qtyManual, unitManual) {
  const text = (textBrut || '').trim();
  if (!text) return;
  const p = parseazaText(text);
  const nume = p.name || text;
  const qty = qtyManual || p.qty || '';
  const unit = unitManual || p.unit || (qty && !p.unit ? '' : p.unit);

  // daca produsul exista deja nebifat, doar il evidentiem
  const existent = listItems(ui.listId).find((i) => norm(i.name) === norm(nume) && !i.done);
  if (existent) {
    mutate('Am actualizat produsul', (m) => {
      const o = m.item(existent.id);
      if (qty) { o.qty = qty; o.unit = unit; }
    });
    randeaza();
    evidentiaza(existent.id);
    badge('„' + nume + '” era deja în listă');
    syncSoon();
    return;
  }

  const id = uid();
  mutate('Am adăugat produsul', (m) => {
    m.newItem({
      id, list_id: ui.listId, name: nume, qty, unit,
      note: '', done: 0, position: nextPosition(ui.listId), deleted: 0,
    });
  });
  rememberProduct(nume, unit);
  syncSoon();
  randeaza();
  evidentiaza(id);
}

function evidentiaza(id) {
  requestAnimationFrame(() => {
    const n = document.querySelector('.item[data-id="' + id + '"]');
    if (!n) return;
    n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    n.animate(
      [{ background: 'rgba(41,121,214,.22)' }, { background: 'transparent' }],
      { duration: 900, easing: 'ease-out' },
    );
  });
}

function comutaBifa(id) {
  const it = state.items[id];
  if (!it) return;
  const bifat = !it.done;
  mutate(bifat ? 'Am bifat produsul' : 'Am debifat produsul', (m) => {
    const o = m.item(id);
    o.done = bifat ? 1 : 0;
  });
  if (navigator.vibrate) navigator.vibrate(bifat ? 12 : 6);
  syncSoon();
  randeaza();
}

function meniuArticol(id) {
  const it = state.items[id];
  if (!it) return;
  const alteListe = visibleLists().filter((l) => l.id !== ui.listId);
  sheet(it.name, [
    { icon: 'edit', text: 'Editează (nume, cantitate, notă)', run: () => editeazaArticol(id) },
    { icon: it.done ? 'uncheck' : 'checkAll', text: it.done ? 'Scoate din coș' : 'Pune în coș', run: () => comutaBifa(id) },
    alteListe.length ? { icon: 'join', text: 'Mută în altă listă', run: () => mutaArticol(id) } : null,
    '-',
    { icon: 'trash', text: 'Șterge produsul', danger: true, run: () => stergeArticol(id) },
  ]);
}

async function editeazaArticol(id) {
  const it = state.items[id];
  if (!it) return;

  let qtyRef = null, unitRef = null, notaRef = null;
  const r = await askText({
    title: 'Editează produsul',
    label: 'Nume',
    value: it.name,
    extra: (box) => {
      const qtyInp = el('input', { class: 'dlg-input', type: 'text', value: it.qty || '', placeholder: 'ex: 2', inputmode: 'decimal', style: 'width:100px' });
      const chips = el('div', { class: 'unit-chips' });
      let unitSel = it.unit || '';
      const deseneaza = () => {
        chips.innerHTML = '';
        for (const u of ['', ...UNITATI]) {
          chips.append(el('button', {
            class: 'chip' + (u === unitSel ? ' on' : ''),
            type: 'button',
            text: u || 'fără',
            onclick: () => { unitSel = u; deseneaza(); },
          }));
        }
      };
      deseneaza();
      const nota = el('input', { class: 'dlg-input', type: 'text', value: it.note || '', placeholder: 'ex: marca X, de la raionul rece', maxlength: '160' });

      box.append(
        el('div', { class: 'field' }, el('span', { text: 'Cantitate' }),
          el('div', { style: 'display:flex;gap:8px;align-items:center' }, qtyInp, chips)),
        el('div', { class: 'field' }, el('span', { text: 'Notă' }), nota),
      );
      qtyRef = qtyInp; notaRef = nota;
      return { value: () => ({ qty: qtyInp.value.trim(), unit: unitSel, note: nota.value.trim() }) };
    },
  });
  if (!r || !r.text) return;

  mutate('Am modificat produsul', (m) => {
    const o = m.item(id);
    o.name = r.text;
    o.qty = (r.extra && r.extra.qty) || '';
    o.unit = (r.extra && r.extra.unit) || '';
    o.note = (r.extra && r.extra.note) || '';
  });
  rememberProduct(r.text, (r.extra && r.extra.unit) || '');
  syncSoon();
  randeaza();
  aratUndo('Produs modificat');
}

function stergeArticol(id) {
  const it = state.items[id];
  if (!it) return;
  const nume = it.name;
  mutate('Am șters produsul', (m) => { m.item(id).deleted = 1; });
  syncSoon();
  randeaza();
  aratUndo('„' + nume + '” a fost șters');
}

function mutaArticol(id) {
  const it = state.items[id];
  if (!it) return;
  const alteListe = visibleLists().filter((l) => l.id !== it.list_id);
  sheet('Mută „' + it.name + '” în...', alteListe.map((l) => ({
    icon: 'join',
    text: l.name,
    run: () => {
      mutate('Am mutat produsul', (m) => {
        const o = m.item(id);
        o.list_id = l.id;
        o.position = nextPosition(l.id);
      });
      syncSoon();
      randeaza();
      aratUndo('Mutat în „' + l.name + '”');
    },
  })));
}

/* ---------------- actiuni pe toata lista ---------------- */

function meniuArticole() {
  const l = state.lists[ui.listId];
  if (!l) return;
  const st = listStats(ui.listId);
  sheet(l.name, [
    { icon: 'sort', text: 'Sortează alfabetic', run: () => sorteazaAlfabetic() },
    { icon: 'checkAll', text: 'Pune tot în coș', run: () => bifeazaTot(1) },
    st.done ? { icon: 'uncheck', text: 'Scoate tot din coș', run: () => bifeazaTot(0) } : null,
    { icon: 'edit', text: 'Adaugă mai multe deodată', run: () => adaugaMaiMulte() },
    '-',
    st.done ? { icon: 'broom', text: 'Șterge produsele din coș (' + st.done + ')', run: () => stergeBifate(ui.listId) } : null,
    st.total ? { icon: 'trash', text: 'Golește lista', danger: true, run: () => goleste() } : null,
    '-',
    { icon: 'edit', text: 'Redenumește lista', run: () => redenumesteLista(ui.listId) },
    { icon: 'trash', text: 'Șterge lista', danger: true, run: () => stergeLista(ui.listId) },
  ]);
}

function sorteazaAlfabetic() {
  const articole = listItems(ui.listId).slice()
    .sort((a, b) => norm(a.name).localeCompare(norm(b.name), 'ro'));
  mutate('Am sortat lista', (m) => {
    articole.forEach((it, i) => { m.item(it.id).position = (i + 1) * 10; });
  });
  syncSoon();
  randeaza();
  aratUndo('Listă sortată alfabetic');
}

function bifeazaTot(valoare) {
  const articole = listItems(ui.listId).filter((i) => Number(!!i.done) !== valoare);
  if (!articole.length) return;
  mutate(valoare ? 'Am bifat tot' : 'Am debifat tot', (m) => {
    for (const it of articole) m.item(it.id).done = valoare;
  });
  syncSoon();
  randeaza();
  aratUndo(valoare ? 'Toate produsele sunt în coș' : 'Am scos tot din coș');
}

async function stergeBifate(listId) {
  const bifate = listItems(listId).filter((i) => i.done);
  if (!bifate.length) return;
  mutate('Am șters produsele din coș', (m) => {
    for (const it of bifate) m.item(it.id).deleted = 1;
  });
  syncSoon();
  randeaza();
  aratUndo(bifate.length + ' produse șterse');
}

async function goleste() {
  const articole = listItems(ui.listId);
  if (!articole.length) return;
  const ok = await confirmBox({
    title: 'Golești lista?',
    text: 'Se șterg toate cele ' + articole.length + ' produse. Poți anula imediat după.',
    ok: 'Golește',
  });
  if (!ok) return;
  mutate('Am golit lista', (m) => {
    for (const it of articole) m.item(it.id).deleted = 1;
  });
  syncSoon();
  randeaza();
  aratUndo('Lista a fost golită');
}

function adaugaMaiMulte() {
  dialogHtml('Adaugă mai multe produse', (box) => {
    box.append(el('p', { text: 'Scrie câte un produs pe linie. Poți pune și cantitatea: „2 kg cartofi”.' }));
    const ta = el('textarea', {
      class: 'dlg-input',
      style: 'height:160px;padding:12px;resize:vertical',
      placeholder: 'lapte\n2 kg cartofi\npâine',
    });
    box.append(ta);
    box.append(el('div', { class: 'dialog-actions' },
      el('button', { class: 'btn-text', type: 'button', text: 'Renunță', onclick: () => closeDialog() }),
      el('button', {
        class: 'btn-text', type: 'button', text: 'Adaugă',
        onclick: () => {
          const linii = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
          closeDialog();
          if (!linii.length) return;
          mutate('Am adăugat ' + linii.length + ' produse', (m) => {
            let poz = nextPosition(ui.listId);
            for (const linie of linii) {
              const p = parseazaText(linie);
              m.newItem({
                id: uid(), list_id: ui.listId, name: p.name || linie, qty: p.qty, unit: p.unit,
                note: '', done: 0, position: poz, deleted: 0,
              });
              poz += 10;
              rememberProduct(p.name || linie, p.unit);
            }
          });
          syncSoon();
          randeaza();
          aratUndo(linii.length + ' produse adăugate');
        },
      }),
    ));
    setTimeout(() => ta.focus(), 80);
  });
}

/* =========================================================
   PARTAJARE
   ========================================================= */

function meniuPartajare(listId) {
  const l = state.lists[listId];
  if (!l) return;
  sheet('Partajează „' + l.name + '”', [
    { icon: 'people', text: 'Invită pe cineva (cod)', run: () => creeazaCod(listId) },
    { icon: 'people', text: 'Cine are acces', run: () => aratMembri(listId) },
    { icon: 'share', text: 'Trimite lista ca text', run: () => trimiteCaText(listId) },
    '-',
    { icon: 'exit', text: 'Nu mai vreau lista asta (ies din ea)', danger: true, run: () => iesiDinLista(listId) },
  ]);
}

async function creeazaCod(listId) {
  badge('Cer codul...', { ms: 0 });
  try {
    const r = await api.shareCreate(listId);
    badge('');
    dialogHtml('Cod de invitație', (box) => {
      box.append(el('p', { text: 'Persoana trebuie să-și facă un cont în aplicație, apoi „Intră într-o listă partajată” și să scrie codul:' }));
      box.append(el('div', { class: 'code-box', text: r.code }));
      box.append(el('p', { text: 'Codul e valabil ' + (r.expira || '14 zile') + '.' }));
      box.append(el('div', { class: 'dialog-actions' },
        el('button', {
          class: 'btn-text', type: 'button', text: 'Copiază',
          onclick: async () => {
            const link = location.origin + location.pathname + '#cod=' + r.code;
            const txt = 'Intră în lista mea de cumpărături „' + state.lists[listId].name + '”: ' + link + ' (cod: ' + r.code + ')';
            try {
              if (navigator.share) await navigator.share({ text: txt });
              else { await navigator.clipboard.writeText(txt); badge('Copiat'); }
            } catch (e) { /* utilizatorul a renuntat */ }
          },
        }),
        el('button', { class: 'btn-text', type: 'button', text: 'Gata', onclick: () => closeDialog() }),
      ));
    });
  } catch (e) {
    badge(mesajEroare(e), { error: true, ms: 3000 });
  }
}

async function aratMembri(listId) {
  try {
    const r = await api.shareMembers(listId);
    const eu = state.user && state.user.id;
    const potSterge = (state.lists[listId] || {}).owner;
    dialogHtml('Cine are acces', (box) => {
      for (const m of r.members) {
        const rand = el('div', { class: 'member-row' },
          el('div', { class: 'avatar', text: (m.name || m.email || '?')[0].toUpperCase() }),
          el('div', { class: 'member-info' },
            el('div', { text: (m.name || m.email) + (m.id === eu ? ' (tu)' : '') }),
            el('small', { text: Number(m.owner) ? 'proprietarul listei' : m.email }),
          ),
        );
        if (potSterge && !Number(m.owner) && m.id !== eu) {
          rand.append(el('button', {
            class: 'btn-text danger', type: 'button', text: 'Scoate',
            onclick: async () => {
              await api.shareRemove(listId, m.id);
              closeDialog();
              badge('Am scos persoana din listă');
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

async function trimiteCaText(listId) {
  const l = state.lists[listId];
  const articole = listItems(listId);
  const linii = [l.name.toUpperCase(), ''];
  for (const it of articole.filter((i) => !i.done)) {
    linii.push('- ' + it.name + (it.qty ? ' (' + it.qty + (it.unit ? ' ' + it.unit : '') + ')' : ''));
  }
  const bifate = articole.filter((i) => i.done);
  if (bifate.length) {
    linii.push('', 'Deja luate:');
    for (const it of bifate) linii.push('- ' + it.name);
  }
  const text = linii.join('\n');
  try {
    if (navigator.share) await navigator.share({ title: l.name, text });
    else { await navigator.clipboard.writeText(text); badge('Lista a fost copiată'); }
  } catch (e) { /* renuntare */ }
}

async function iesiDinLista(listId) {
  const l = state.lists[listId];
  const ok = await confirmBox({
    title: 'Ieși din „' + l.name + '”?',
    text: 'Lista rămâne la ceilalți, dar dispare de pe telefonul tău.',
    ok: 'Ies',
  });
  if (!ok) return;
  try { await api.shareLeave(listId); } catch (e) { /* offline */ }
  delete state.lists[listId];
  for (const [id, it] of Object.entries(state.items)) if (it.list_id === listId) delete state.items[id];
  save(true);
  clearUndo();
  ui.screen = 'lists'; ui.listId = null; location.hash = '';
  randeaza();
  badge('Ai ieșit din listă');
}

async function intraInLista(codInitial) {
  const r = await askText({
    title: 'Intră într-o listă partajată',
    label: 'Codul primit',
    value: codInitial || '',
    placeholder: 'ex: K7M2QAP',
    ok: 'Intră',
  });
  if (!r || !r.text) return;
  try {
    badge('Verific codul...', { ms: 0 });
    const res = await api.shareJoin(r.text.trim().toUpperCase());
    await sync({ full: true });
    badge('Ai intrat în „' + res.name + '”');
    randeaza();
  } catch (e) {
    badge(mesajEroare(e), { error: true, ms: 3000 });
  }
}

/* =========================================================
   MENIU GENERAL, TEMA, SETARI
   ========================================================= */

function meniuGeneral() {
  const t = state.theme || 'auto';
  sheet(state.user ? (state.user.name || state.user.email) : 'Meniu', [
    { icon: 'join', text: 'Intră într-o listă partajată', run: () => intraInLista() },
    { icon: 'redo', text: 'Sincronizează acum', run: () => sync({ full: false }) },
    '-',
    { icon: 'sun', text: 'Temă deschisă', on: t === 'light', run: () => aplicaTema('light', true) },
    { icon: 'moon', text: 'Temă întunecată', on: t === 'dark', run: () => aplicaTema('dark', true) },
    { icon: 'auto', text: 'Ca în telefon', on: t === 'auto', run: () => aplicaTema('auto', true) },
    '-',
    { icon: 'key', text: 'Schimbă parola', run: () => schimbaParola() },
    { icon: 'server', text: 'Server', run: () => setariServer() },
    { icon: 'info', text: 'Despre aplicație', run: () => despre() },
    { icon: 'logout', text: 'Ieși din cont', danger: true, run: () => deconecteaza() },
  ], state.user ? state.user.email : '');
}

function aplicaTema(t, salveaza) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  const inchis = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (meta) meta.setAttribute('content', inchis ? '#0B2E5C' : '#14509D');
  if (salveaza) { state.theme = t; save(true); }
}

async function schimbaParola() {
  dialogHtml('Schimbă parola', (box) => {
    const veche = el('input', { class: 'dlg-input', type: 'password', placeholder: 'parola actuală', autocomplete: 'current-password' });
    const noua = el('input', { class: 'dlg-input', type: 'password', placeholder: 'parola nouă (min. 8)', autocomplete: 'new-password' });
    const err = el('p', { class: 'auth-error', hidden: 'hidden' });
    box.append(
      el('div', { class: 'field' }, el('span', { text: 'Parola actuală' }), veche),
      el('div', { class: 'field' }, el('span', { text: 'Parola nouă' }), noua),
      err,
      el('div', { class: 'dialog-actions' },
        el('button', { class: 'btn-text', type: 'button', text: 'Renunță', onclick: () => closeDialog() }),
        el('button', {
          class: 'btn-text', type: 'button', text: 'Schimbă',
          onclick: async () => {
            try {
              await api.changePassword({ old_password: veche.value, new_password: noua.value });
              closeDialog();
              badge('Parola a fost schimbată');
            } catch (e) {
              err.textContent = mesajEroare(e);
              err.hidden = false;
            }
          },
        }),
      ),
    );
  });
}

function setariServer() {
  dialogHtml('Server', (box) => {
    box.append(el('p', { text: 'Adresa API-ului folosit de aplicație. Schimb-o doar dacă știi ce faci.' }));
    const inp = el('input', { class: 'dlg-input', type: 'url', value: API_BASE });
    box.append(inp);
    box.append(el('div', { class: 'dialog-actions' },
      el('button', { class: 'btn-text', type: 'button', text: 'Renunță', onclick: () => closeDialog() }),
      el('button', {
        class: 'btn-text', type: 'button', text: 'Salvează',
        onclick: () => { setApiBase(inp.value); location.reload(); },
      }),
    ));
  });
}

function despre() {
  dialogHtml('Lista de cumpărături', (box) => {
    const ultima = state.lastSync ? new Date(state.lastSync).toLocaleString('ro-RO') : 'niciodată';
    box.append(el('p', { html:
      'Versiunea ' + APP_VERSION + '<br>' +
      'Server: ' + escapeHtml(API_BASE) + '<br>' +
      'Ultima sincronizare: ' + escapeHtml(ultima) + '<br>' +
      'Modificări netrimise: ' + (hasPending() ? 'da' : 'nu'),
    }));
    box.append(el('div', { class: 'dialog-actions' },
      el('button', { class: 'btn-text', type: 'button', text: 'Închide', onclick: () => closeDialog() })));
  });
}

/* =========================================================
   UNDO
   ========================================================= */

function aratUndo(mesaj) {
  snack(mesaj, {
    text: 'ANULEAZĂ',
    run: () => faUndo(),
  });
}

function faUndo() {
  const label = undo();
  if (!label) return;
  syncSoon();
  randeaza();
  snack('Am anulat: ' + label.toLowerCase(), { text: 'REFĂ', run: () => faRedo() }, 4000);
}

function faRedo() {
  const label = redo();
  if (!label) return;
  syncSoon();
  randeaza();
  snack('Am refăcut: ' + label.toLowerCase(), null, 2500);
}

/* =========================================================
   CAUTARE
   ========================================================= */

function comutaCautare(unde) {
  if (unde === 'lists') {
    const bar = $('#searchbarLists');
    bar.hidden = !bar.hidden;
    if (!bar.hidden) $('#qLists').focus();
    else { ui.qLists = ''; $('#qLists').value = ''; randeaza(); }
  } else {
    const bar = $('#searchbarItems');
    bar.hidden = !bar.hidden;
    if (!bar.hidden) $('#qItems').focus();
    else { ui.qItems = ''; $('#qItems').value = ''; randeaza(); }
  }
}

function cautaInArticole(q) {
  ui.qItems = q;
  $('#searchbarItems').hidden = false;
  $('#qItems').value = q;
  randeaza();
}

/* =========================================================
   SUGESTII
   ========================================================= */

let sugTimer = null;
let sugServer = [];

function actualizeazaSugestii() {
  const q = $('#newItem').value.trim();
  const box = $('#suggestions');

  const locale = localSuggestions(q, 12);
  const numeInLista = new Set(listItems(ui.listId).filter((i) => !i.done).map((i) => norm(i.name)));

  const combinate = [];
  const vazute = new Set();
  for (const s of [...locale, ...sugServer]) {
    const n = norm(s.name);
    if (!n || vazute.has(n) || numeInLista.has(n)) continue;
    if (q && !n.includes(norm(q))) continue;
    vazute.add(n);
    combinate.push(s);
    if (combinate.length >= 8) break;
  }

  box.innerHTML = '';
  if (!combinate.length) { box.hidden = true; return; }

  for (const s of combinate) {
    const b = el('button', {
      class: 'sug', type: 'button',
      onclick: () => {
        adaugaArticol(s.name, '', s.unit || '');
        $('#newItem').value = '';
        sugServer = [];
        actualizeazaSugestii();
        $('#newItem').focus();
      },
    });
    b.append(icon('join'));
    b.append(el('span', { html: highlight(s.name, q, norm) }));
    box.append(b);
  }
  box.hidden = false;

  // completare din istoricul de pe server (doar cand scrii ceva)
  if (sugTimer) clearTimeout(sugTimer);
  if (q.length >= 2 && navigator.onLine) {
    sugTimer = setTimeout(async () => {
      try {
        const r = await api.suggest(q);
        sugServer = r.items || [];
        if ($('#newItem').value.trim() === q) actualizeazaSugestii();
      } catch (e) { /* mergem doar pe istoricul local */ }
    }, 350);
  }
}

/* =========================================================
   EVENIMENTE
   ========================================================= */

function legaEvenimente() {
  // autentificare
  $('#authForm').addEventListener('submit', trimiteAuth);
  $('#toggleMode').addEventListener('click', () => setAuthMode(ui.authMode === 'login' ? 'register' : 'login'));

  // ecranul cu liste
  $('#fabAddList').addEventListener('click', listaNoua);
  $('#btnMenuLists').addEventListener('click', meniuGeneral);
  $('#btnSearchLists').addEventListener('click', () => comutaCautare('lists'));
  $('#btnClearQLists').addEventListener('click', () => { ui.qLists = ''; $('#qLists').value = ''; $('#qLists').focus(); randeaza(); });
  $('#qLists').addEventListener('input', (e) => { ui.qLists = e.target.value; randeazaListe(); });
  $('#btnUndoLists').addEventListener('click', faUndo);

  // ecranul cu articole
  $('#btnBack').addEventListener('click', inapoiLaListe);
  $('#btnMenuItems').addEventListener('click', meniuArticole);
  $('#btnShare').addEventListener('click', () => meniuPartajare(ui.listId));
  $('#btnSearchItems').addEventListener('click', () => comutaCautare('items'));
  $('#btnClearQItems').addEventListener('click', () => { ui.qItems = ''; $('#qItems').value = ''; $('#qItems').focus(); randeaza(); });
  $('#qItems').addEventListener('input', (e) => { ui.qItems = e.target.value; randeazaArticole(); });
  $('#btnUndoItems').addEventListener('click', faUndo);

  // adaugare
  const inp = $('#newItem');
  $('#btnAdd').addEventListener('click', trimiteFormularAdaugare);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); trimiteFormularAdaugare(); }
  });
  inp.addEventListener('input', actualizeazaSugestii);
  inp.addEventListener('focus', actualizeazaSugestii);
  inp.addEventListener('blur', () => setTimeout(() => { $('#suggestions').hidden = true; }, 180));

  $('#btnQty').addEventListener('click', () => {
    const row = $('#qtyRow');
    row.hidden = !row.hidden;
    $('#btnQty').classList.toggle('on', !row.hidden);
    if (!row.hidden) { deseneazaUnitati(); $('#newQty').focus(); }
    else { $('#newQty').value = ''; ui.unit = ''; }
  });

  // reordonare
  makeSortable($('#listsWrap'), {
    handleSel: '.drag-handle',
    itemSel: '.list-card',
    onDrop: (ordine) => {
      mutate('Am rearanjat listele', (m) => {
        ordine.forEach((id, i) => { const o = m.list(id); if (o) o.position = (i + 1) * 10; });
      });
      syncSoon();
      randeaza();
    },
  });

  makeSortable($('#itemsWrap'), {
    handleSel: '.drag-handle',
    itemSel: '.item',
    onDrop: (ordine) => {
      mutate('Am rearanjat produsele', (m) => {
        ordine.forEach((id, i) => { const o = m.item(id); if (o) o.position = (i + 1) * 10; });
      });
      syncSoon();
      randeaza();
    },
  });

  // tastatura (pe calculator)
  document.addEventListener('keydown', (e) => {
    const inCamp = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (canUndo()) { e.preventDefault(); faUndo(); }
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      if (canRedo()) { e.preventDefault(); faRedo(); }
    } else if (e.key === 'Escape') {
      closeSheet(); closeDialog(); hideSnack();
    } else if (e.key === '/' && !inCamp) {
      e.preventDefault();
      comutaCautare(ui.screen === 'lists' ? 'lists' : 'items');
    }
  });

  // cod de invitatie primit prin link
  const m = (location.hash || '').match(/#cod=([A-Z0-9]{4,12})/i);
  if (m) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => { if (state.token) intraInLista(m[1].toUpperCase()); }, 600);
  }
}

function trimiteFormularAdaugare() {
  const inp = $('#newItem');
  const text = inp.value.trim();
  if (!text) { inp.focus(); return; }
  const qty = $('#newQty').value.trim();
  adaugaArticol(text, qty, ui.unit);
  inp.value = '';
  $('#newQty').value = '';
  sugServer = [];
  actualizeazaSugestii();
  inp.focus();
}

function deseneazaUnitati() {
  const box = $('#unitChips');
  box.innerHTML = '';
  for (const u of UNITATI) {
    box.append(el('button', {
      class: 'chip' + (ui.unit === u ? ' on' : ''),
      type: 'button',
      text: u,
      onclick: () => {
        ui.unit = ui.unit === u ? '' : u;
        deseneazaUnitati();
        $('#newItem').focus();
      },
    }));
  }
}

/* ---------------- pornire ---------------- */

boot();
