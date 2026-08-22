/* =========================================================
   Sincronizarea cu serverul.
   Aplicatia scrie intai local (merge si offline), apoi trimite
   modificarile cand exista internet.
   ========================================================= */

import { api, ApiError } from './api.js';
import { state, save, applyRemote } from './store.js';

const CAMPURI_LISTA = ['id', 'name', 'color', 'position', 'updated_at', 'deleted'];
const CAMPURI_ITEM = ['id', 'list_id', 'name', 'qty', 'unit', 'note', 'done', 'position', 'updated_at', 'deleted'];

let inProgress = null;
let pendingAgain = false;
const listeners = new Set();

/** status: 'idle' | 'sync' | 'offline' | 'error' | 'auth' */
export let status = 'idle';

export function onSync(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(st, extra) {
  status = st;
  for (const fn of listeners) {
    try { fn(st, extra); } catch (e) { console.error(e); }
  }
}

function pick(obj, campuri) {
  const o = {};
  for (const c of campuri) o[c] = obj[c] === undefined ? (c === 'name' ? '' : 0) : obj[c];
  return o;
}

function dirtyPayload() {
  const lists = [], items = [];
  for (const l of Object.values(state.lists)) if (l.dirty) lists.push(pick(l, CAMPURI_LISTA));
  for (const i of Object.values(state.items)) if (i.dirty) items.push(pick(i, CAMPURI_ITEM));
  return { lists, items };
}

export function hasPending() {
  const { lists, items } = dirtyPayload();
  return lists.length + items.length > 0;
}

/**
 * Trimite modificarile locale si preia noutatile.
 * Daca sincronizarea e deja in curs, se programeaza inca una la final.
 */
export async function sync({ full = false, silent = false } = {}) {
  if (!state.token) return;
  if (inProgress) {
    pendingAgain = true;
    return inProgress;
  }
  if (!navigator.onLine) {
    emit('offline');
    return;
  }

  const run = async () => {
    if (!silent) emit('sync');
    const payload = dirtyPayload();
    // marcam ce am trimis, ca sa nu stergem "dirty" de pe modificari facute intre timp
    const trimise = new Map();
    for (const l of payload.lists) trimise.set('l' + l.id, l.updated_at);
    for (const i of payload.items) trimise.set('i' + i.id, i.updated_at);

    // daca n-am mai sincronizat de peste 20 de zile, luam totul de la zero
    const prea_vechi = state.lastSync && (Date.now() - state.lastSync > 20 * 86400000);
    const since = (full || prea_vechi) ? 0 : (state.lastSync || 0);

    const res = await api.sync({ since, lists: payload.lists, items: payload.items });

    applyRemote(() => {
      // 1. curatam marcajul "de trimis" pentru ce nu s-a mai schimbat intre timp
      for (const l of Object.values(state.lists)) {
        if (l.dirty && trimise.get('l' + l.id) === l.updated_at) delete l.dirty;
      }
      for (const i of Object.values(state.items)) {
        if (i.dirty && trimise.get('i' + i.id) === i.updated_at) delete i.dirty;
      }

      // 2. aplicam ce vine de la server (nu peste modificarile locale netrimise)
      for (const l of res.lists || []) {
        const cur = state.lists[l.id];
        if (cur && cur.dirty) continue;
        state.lists[l.id] = { ...l };
      }
      for (const it of res.items || []) {
        const cur = state.items[it.id];
        if (cur && cur.dirty) continue;
        state.items[it.id] = { ...it };
      }

      // 3. la sincronizare completa scoatem listele la care nu mai avem acces
      if (res.full && Array.isArray(res.all_list_ids)) {
        const ok = new Set(res.all_list_ids);
        for (const id of Object.keys(state.lists)) {
          if (!ok.has(id) && !state.lists[id].dirty) delete state.lists[id];
        }
        for (const id of Object.keys(state.items)) {
          const it = state.items[id];
          if (!ok.has(it.list_id) && !it.dirty) delete state.items[id];
        }
      }

      if (res.shared) state.shared = res.shared;
      state.lastSync = res.now;

      // curatam local ce e sters si sincronizat (nu mai avem nevoie de urma lui)
      const cut = Date.now() - 3 * 86400000;
      for (const [id, o] of Object.entries(state.items)) {
        if (o.deleted && !o.dirty && o.updated_at < cut) delete state.items[id];
      }
      for (const [id, o] of Object.entries(state.lists)) {
        if (o.deleted && !o.dirty && o.updated_at < cut) delete state.lists[id];
      }
    });

    save(true);
    emit('idle');
  };

  inProgress = run()
    .catch((e) => {
      if (e instanceof ApiError && e.code === 'neautentificat') {
        emit('auth', e);
      } else if (e instanceof ApiError && e.code === 'retea') {
        emit('offline', e);
      } else {
        console.error('Sincronizare esuata:', e);
        emit('error', e);
      }
    })
    .finally(() => {
      inProgress = null;
      if (pendingAgain) {
        pendingAgain = false;
        setTimeout(() => sync({ silent: true }), 400);
      }
    });

  return inProgress;
}

/* --------- sincronizare automata --------- */

let autoTimer = null;
let debounceTimer = null;

/** Dupa fiecare modificare: trimite peste 1,5 secunde (ca sa grupam mai multe). */
export function syncSoon() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => sync({ silent: true }), 1500);
}

export function startAuto() {
  stopAuto();
  autoTimer = setInterval(() => {
    if (document.visibilityState === 'visible') sync({ silent: true });
  }, 60000);

  window.addEventListener('online', () => sync({ silent: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync({ silent: true });
  });
  window.addEventListener('pagehide', () => save(true));
}

export function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
}
