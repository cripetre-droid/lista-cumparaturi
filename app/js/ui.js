/* =========================================================
   Elemente de interfata refolosibile: panouri, dialoguri,
   notificarea cu "Anulează", reordonare prin tragere.
   ========================================================= */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style') n.setAttribute('style', v);
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return n;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Scoate in evidenta textul cautat. */
export function highlight(text, q, normFn) {
  if (!q) return escapeHtml(text);
  const nText = normFn(text);
  const nQ = normFn(q);
  const i = nText.indexOf(nQ);
  if (i < 0 || !nQ) return escapeHtml(text);
  // pozitiile din textul normalizat coincid cu cele din original
  // (normalizarea nu schimba numarul de caractere)
  return escapeHtml(text.slice(0, i)) +
    '<mark>' + escapeHtml(text.slice(i, i + nQ.length)) + '</mark>' +
    escapeHtml(text.slice(i + nQ.length));
}

/* ---------------- pictograme ---------------- */

const ICONS = {
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  sort: 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z',
  checkAll: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
  uncheck: 'M5 11h14v2H5z',
  broom: 'M16 3l-4 4 5 5 4-4-5-5zM3 21h8l-1-6-4-4-4 4 1 6z',
  share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A3 3 0 1 0 6 15c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 1 0 2.92-2.92z',
  people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  moon: 'M12.3 4.9c.4-.5 0-1.2-.6-1.1-4.6.5-8.2 4.4-8.2 9.1 0 5 4.1 9.1 9.1 9.1 4.7 0 8.6-3.6 9.1-8.2.1-.6-.6-1-1.1-.6-1.2 1-2.7 1.6-4.4 1.6-3.7 0-6.7-3-6.7-6.7 0-1.6.6-3.2 1.6-4.4z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  auto: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 16V5a7 7 0 0 1 0 14z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z',
  key: 'M12.65 10A6 6 0 1 0 7 16a5.9 5.9 0 0 0 5.65-4H17v4h4v-4h2v-2H12.65zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  join: 'M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-8v2h8v14z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
  info: 'M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  exit: 'M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5a2 2 0 0 0-2 2v4h2V5h14v14H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
  server: 'M4 4h16v6H4V4zm0 10h16v6H4v-6zm3-7h2v2H7V7zm0 10h2v2H7v-2z',
  redo: 'M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62A7.98 7.98 0 0 0 11.5 11c-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.53 6.85 8 11.5 8z',
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', name === 'sun' ? 'none' : 'currentColor');
  if (name === 'sun') {
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round');
  }
  p.setAttribute('d', ICONS[name] || ICONS.info);
  svg.append(p);
  return svg;
}

/* ---------------- panou de jos ---------------- */

let sheetCloser = null;

export function sheet(titlu, actiuni, note) {
  closeSheet();
  const box = $('#sheet');
  const back = $('#sheetBackdrop');
  box.innerHTML = '';
  box.append(el('div', { class: 'sheet-grip' }));
  if (titlu) box.append(el('h2', { text: titlu }));
  if (note) box.append(el('div', { class: 'sheet-note', text: note }));

  for (const a of actiuni) {
    if (a === '-') { box.append(el('div', { class: 'sheet-sep' })); continue; }
    if (!a) continue;
    const b = el('button', {
      class: 'sheet-item' + (a.danger ? ' danger' : '') + (a.on ? ' on' : ''),
      type: 'button',
      onclick: () => { closeSheet(); setTimeout(() => a.run && a.run(), 60); },
    });
    if (a.icon) b.append(icon(a.icon));
    b.append(el('span', { text: a.text }));
    box.append(b);
  }

  back.hidden = false;
  box.hidden = false;
  const onBack = () => closeSheet();
  back.addEventListener('click', onBack, { once: true });
  sheetCloser = () => {
    box.hidden = true;
    back.hidden = true;
    back.removeEventListener('click', onBack);
    sheetCloser = null;
  };
}

export function closeSheet() {
  if (sheetCloser) sheetCloser();
}

/* ---------------- dialoguri ---------------- */

let dialogCloser = null;

export function closeDialog() {
  if (dialogCloser) dialogCloser();
}

function openDialog(build) {
  closeDialog();
  const box = $('#dialog');
  const back = $('#dialogBackdrop');
  box.innerHTML = '';
  build(box);
  back.hidden = false;
  box.hidden = false;
  const onBack = () => closeDialog();
  back.addEventListener('click', onBack, { once: true });
  dialogCloser = () => {
    box.hidden = true;
    back.hidden = true;
    back.removeEventListener('click', onBack);
    dialogCloser = null;
  };
  return box;
}

export function dialogHtml(titlu, build) {
  return openDialog((box) => {
    if (titlu) box.append(el('h2', { text: titlu }));
    build(box);
  });
}

/** Intrebare cu text. Returneaza Promise cu valoarea sau null. */
export function askText({ title, label, value = '', ok = 'Salvează', placeholder = '', extra = null }) {
  return new Promise((resolve) => {
    openDialog((box) => {
      box.append(el('h2', { text: title }));
      const inp = el('input', { class: 'dlg-input', type: 'text', value, placeholder, maxlength: '120' });
      if (label) box.append(el('div', { class: 'field' }, el('span', { text: label }), inp));
      else box.append(inp);

      const extraNode = extra ? extra(box) : null;

      const finish = (v) => { closeDialog(); resolve(v); };
      box.append(el('div', { class: 'dialog-actions' },
        el('button', { class: 'btn-text', type: 'button', text: 'Renunță', onclick: () => finish(null) }),
        el('button', {
          class: 'btn-text', type: 'button', text: ok,
          onclick: () => finish({ text: inp.value.trim(), extra: extraNode && extraNode.value() }),
        }),
      ));
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish({ text: inp.value.trim(), extra: extraNode && extraNode.value() }); }
      });
      setTimeout(() => { inp.focus(); inp.select(); }, 80);
    });
  });
}

export function confirmBox({ title, text, ok = 'Șterge', danger = true }) {
  return new Promise((resolve) => {
    openDialog((box) => {
      box.append(el('h2', { text: title }));
      if (text) box.append(el('p', { text }));
      const finish = (v) => { closeDialog(); resolve(v); };
      box.append(el('div', { class: 'dialog-actions' },
        el('button', { class: 'btn-text', type: 'button', text: 'Renunță', onclick: () => finish(false) }),
        el('button', { class: 'btn-text' + (danger ? ' danger' : ''), type: 'button', text: ok, onclick: () => finish(true) }),
      ));
    });
  });
}

/* ---------------- notificare cu actiune ---------------- */

let snackTimer = null;

export function snack(text, actiune = null, ms = 5000) {
  const box = $('#snackbar');
  $('#snackText').textContent = text;
  const btn = $('#snackAction');
  const nou = btn.cloneNode(true);
  btn.replaceWith(nou);

  if (actiune) {
    nou.hidden = false;
    nou.textContent = actiune.text || 'ANULEAZĂ';
    nou.addEventListener('click', () => { hideSnack(); actiune.run(); });
  } else {
    nou.hidden = true;
  }
  box.hidden = false;
  if (snackTimer) clearTimeout(snackTimer);
  snackTimer = setTimeout(hideSnack, ms);
}

export function hideSnack() {
  $('#snackbar').hidden = true;
  if (snackTimer) clearTimeout(snackTimer);
  snackTimer = null;
}

/* ---------------- indicator de stare ---------------- */

let badgeTimer = null;

export function badge(text, { error = false, ms = 1800 } = {}) {
  const b = $('#syncBadge');
  if (!text) { b.hidden = true; return; }
  b.textContent = text;
  b.classList.toggle('err', !!error);
  b.hidden = false;
  if (badgeTimer) clearTimeout(badgeTimer);
  if (ms) badgeTimer = setTimeout(() => { b.hidden = true; }, ms);
}

/* ---------------- reordonare prin tragere ---------------- */

/**
 * Face randurile dintr-un container reordonabile.
 * onDrop(idOrdine[]) se apeleaza doar daca ordinea s-a schimbat.
 */
export function makeSortable(container, { handleSel, itemSel, onDrop }) {
  let drag = null;

  const onPointerDown = (e) => {
    const handle = e.target.closest(handleSel);
    if (!handle || !container.contains(handle)) return;
    const row = handle.closest(itemSel);
    if (!row) return;

    e.preventDefault();
    const rows = Array.from(container.querySelectorAll(itemSel));
    const rect = row.getBoundingClientRect();

    drag = {
      row,
      startY: e.clientY,
      offset: e.clientY - rect.top,
      height: rect.height,
      startOrder: rows.map((r) => r.dataset.id),
      pointerId: e.pointerId,
    };

    row.classList.add('dragging');
    row.style.position = 'relative';
    row.style.zIndex = '5';
    handle.setPointerCapture(e.pointerId);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    drag.row.style.transform = 'translateY(' + dy + 'px)';

    const rows = Array.from(container.querySelectorAll(itemSel)).filter((r) => r !== drag.row);
    const y = e.clientY;
    for (const r of rows) {
      const b = r.getBoundingClientRect();
      const mid = b.top + b.height / 2;
      if (y < mid && r.compareDocumentPosition(drag.row) & Node.DOCUMENT_POSITION_FOLLOWING) {
        container.insertBefore(drag.row, r);
        drag.startY = e.clientY - 0;
        drag.row.style.transform = 'translateY(0px)';
        break;
      }
      if (y > mid && r.compareDocumentPosition(drag.row) & Node.DOCUMENT_POSITION_PRECEDING) {
        container.insertBefore(drag.row, r.nextSibling);
        drag.startY = e.clientY - 0;
        drag.row.style.transform = 'translateY(0px)';
        break;
      }
    }
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    const handle = e.currentTarget;
    handle.removeEventListener('pointermove', onPointerMove);
    handle.removeEventListener('pointerup', onPointerUp);
    handle.removeEventListener('pointercancel', onPointerUp);

    drag.row.classList.remove('dragging');
    drag.row.style.transform = '';
    drag.row.style.position = '';
    drag.row.style.zIndex = '';

    const order = Array.from(container.querySelectorAll(itemSel)).map((r) => r.dataset.id);
    const schimbat = order.join(',') !== drag.startOrder.join(',');
    drag = null;
    if (schimbat) onDrop(order);
  };

  container.addEventListener('pointerdown', onPointerDown);
}
