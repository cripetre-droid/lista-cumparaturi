/* =========================================================
   Starea aplicatiei: date locale, salvare, undo/redo.
   Totul se tine in localStorage, ca sa mearga si fara internet.
   ========================================================= */

const KEY = 'lc.state.v1';
const MAX_UNDO = 40;

export const state = {
  token: null,
  user: null,
  lists: {},        // id -> {id,name,color,position,updated_at,deleted,owner,dirty}
  items: {},        // id -> {id,list_id,name,qty,unit,note,done,position,updated_at,deleted,dirty}
  shared: {},       // list_id -> cate persoane
  lastSync: 0,      // ora serverului la ultima sincronizare
  theme: 'auto',
  history: [],      // sugestii locale: {name, unit, uses, last_used}
};

let saveTimer = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) {
    console.warn('Nu am putut citi datele locale:', e);
  }
  if (!state.lists) state.lists = {};
  if (!state.items) state.items = {};
  if (!state.shared) state.shared = {};
  if (!state.history) state.history = [];
}

export function save(now = false) {
  if (saveTimer) clearTimeout(saveTimer);
  const write = () => {
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Nu am putut salva local:', e);
    }
  };
  if (now) write();
  else saveTimer = setTimeout(write, 250);
}

export function resetAll() {
  localStorage.removeItem(KEY);
  Object.assign(state, {
    token: null, user: null, lists: {}, items: {}, shared: {},
    lastSync: 0, history: [],
  });
  undoStack.length = 0;
  redoStack.length = 0;
}

/* ---------------- utilitare ---------------- */

export function uid() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export const now = () => Date.now();

/** Text normalizat pentru cautare: litere mici, fara diacritice. */
export function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------- undo / redo ---------------- */

const undoStack = [];
const redoStack = [];
let current = null;

function snapshot(kind, id) {
  const src = kind === 'list' ? state.lists : state.items;
  const o = src[id];
  return { kind, id, data: o ? JSON.parse(JSON.stringify(o)) : null };
}

function restore(snap) {
  const dst = snap.kind === 'list' ? state.lists : state.items;
  if (snap.data === null) {
    // entitatea nu exista inainte de modificare: nu o stergem de tot, ci o marcam
    // ca stearsa, ca stergerea sa ajunga si la celelalte telefoane
    const cur = dst[snap.id];
    if (cur) { cur.deleted = 1; cur.updated_at = now(); cur.dirty = 1; }
  } else {
    dst[snap.id] = JSON.parse(JSON.stringify(snap.data));
  }
}

/**
 * Executa o modificare inregistrata pentru "Anulează".
 *   mutate('Am șters produsul', (m) => { m.item(id).deleted = 1; });
 * Helperii m.list(id) / m.item(id) salveaza automat starea dinainte
 * si marcheaza entitatea pentru sincronizare.
 */
export function mutate(label, fn) {
  current = { label, before: [], after: [], seen: new Set() };

  const touch = (kind, id, obj) => {
    const key = kind + ':' + id;
    if (!current.seen.has(key)) {
      current.seen.add(key);
      current.before.push(snapshot(kind, id));
    }
    if (obj) {
      obj.updated_at = now();
      obj.dirty = 1;
    }
    return obj;
  };

  const m = {
    list(id) {
      const o = state.lists[id];
      return touch('list', id, o);
    },
    item(id) {
      const o = state.items[id];
      return touch('item', id, o);
    },
    newList(o) {
      touch('list', o.id, null);
      o.updated_at = now(); o.dirty = 1;
      state.lists[o.id] = o;
      return o;
    },
    newItem(o) {
      touch('item', o.id, null);
      o.updated_at = now(); o.dirty = 1;
      state.items[o.id] = o;
      return o;
    },
  };

  const result = fn(m);

  if (current.before.length) {
    for (const s of current.before) current.after.push(snapshot(s.kind, s.id));
    undoStack.push({ label: current.label, before: current.before, after: current.after });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }
  current = null;
  save();
  return result;
}

/** Aplica modificarile din exterior (server) fara sa strice istoricul de undo. */
export function applyRemote(fn) {
  fn();
  save();
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }
export function undoLabel() { return undoStack.length ? undoStack[undoStack.length - 1].label : ''; }

export function undo() {
  const tx = undoStack.pop();
  if (!tx) return null;
  for (const s of tx.before) {
    restore(s);
    const dst = s.kind === 'list' ? state.lists : state.items;
    if (dst[s.id]) { dst[s.id].updated_at = now(); dst[s.id].dirty = 1; }
  }
  redoStack.push(tx);
  save();
  return tx.label;
}

export function redo() {
  const tx = redoStack.pop();
  if (!tx) return null;
  for (const s of tx.after) {
    restore(s);
    const dst = s.kind === 'list' ? state.lists : state.items;
    if (dst[s.id]) { dst[s.id].updated_at = now(); dst[s.id].dirty = 1; }
  }
  undoStack.push(tx);
  save();
  return tx.label;
}

export function clearUndo() {
  undoStack.length = 0;
  redoStack.length = 0;
}

/* ---------------- interogari ---------------- */

export function visibleLists() {
  return Object.values(state.lists)
    .filter((l) => !l.deleted && l.name !== undefined)
    .sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name, 'ro'));
}

export function listItems(listId) {
  return Object.values(state.items)
    .filter((i) => i.list_id === listId && !i.deleted)
    .sort((a, b) => (a.position - b.position));
}

export function listStats(listId) {
  let total = 0, done = 0;
  for (const i of Object.values(state.items)) {
    if (i.list_id !== listId || i.deleted) continue;
    total++;
    if (i.done) done++;
  }
  return { total, done, left: total - done };
}

export function nextPosition(listId) {
  let max = 0;
  for (const i of Object.values(state.items)) {
    if (i.list_id === listId && !i.deleted && i.position > max) max = i.position;
  }
  return max + 10;
}

export function nextListPosition() {
  let max = 0;
  for (const l of Object.values(state.lists)) {
    if (!l.deleted && l.position > max) max = l.position;
  }
  return max + 10;
}

/* ---------------- istoric local pentru sugestii ---------------- */

export function rememberProduct(name, unit) {
  const n = norm(name);
  if (!n) return;
  const hit = state.history.find((h) => norm(h.name) === n);
  if (hit) {
    hit.uses++;
    hit.last_used = now();
    if (unit) hit.unit = unit;
  } else {
    state.history.push({ name, unit: unit || '', uses: 1, last_used: now() });
  }
  if (state.history.length > 400) {
    state.history.sort((a, b) => b.uses - a.uses || b.last_used - a.last_used);
    state.history.length = 400;
  }
  save();
}

export function localSuggestions(q, limit = 10) {
  const nq = norm(q);
  let arr = state.history.slice();
  if (nq) {
    arr = arr.filter((h) => norm(h.name).includes(nq));
    arr.sort((a, b) => {
      const sa = norm(a.name).startsWith(nq) ? 0 : 1;
      const sb = norm(b.name).startsWith(nq) ? 0 : 1;
      return sa - sb || b.uses - a.uses || b.last_used - a.last_used;
    });
  } else {
    arr.sort((a, b) => b.uses - a.uses || b.last_used - a.last_used);
  }
  return arr.slice(0, limit);
}
