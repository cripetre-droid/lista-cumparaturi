/* Apelurile catre serverul de pe vireo.ro. */

import { API_BASE } from './config.js';
import { state } from './store.js';

export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const MESAJE = {
  neautentificat: 'Sesiunea a expirat. Intră din nou în cont.',
  date_gresite: 'E-mail sau parolă greșită.',
  email_existent: 'Există deja un cont cu acest e-mail.',
  email_invalid: 'E-mailul nu pare corect.',
  parola_prea_scurta: 'Parola trebuie să aibă minim 8 caractere.',
  parola_veche_gresita: 'Parola veche nu este corectă.',
  inregistrari_oprite: 'Înregistrările sunt oprite pe acest server.',
  cod_inregistrare_gresit: 'Codul de înregistrare nu este corect.',
  cod_invalid: 'Codul nu este valid sau a expirat.',
  prea_multe_incercari: 'Prea multe încercări. Mai așteaptă 15 minute.',
  lista_inexistenta: 'Lista nu mai există.',
  doar_proprietarul: 'Doar cel care a creat lista poate face asta.',
  origine_neautorizata: 'Serverul nu acceptă cereri de la această adresă.',
  server_neconfigurat: 'Serverul nu este configurat încă.',
  baza_de_date_indisponibila: 'Baza de date nu răspunde.',
  retea: 'Nu am conexiune la server.',
};

export function mesajEroare(e) {
  if (e instanceof ApiError) return MESAJE[e.code] || ('Eroare: ' + e.code);
  return MESAJE.retea;
}

async function call(path, { method = 'POST', body = null, timeout = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (e) {
    throw new ApiError('retea', 0);
  } finally {
    clearTimeout(t);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    throw new ApiError('raspuns_invalid', res.status);
  }
  if (!res.ok || (data && data.error)) {
    throw new ApiError((data && data.error) || 'eroare_' + res.status, res.status);
  }
  return data;
}

export const api = {
  register: (d) => call('auth.php?a=register', { body: d }),
  login: (d) => call('auth.php?a=login', { body: d }),
  me: () => call('auth.php?a=me', { method: 'GET' }),
  logout: () => call('auth.php?a=logout'),
  changePassword: (d) => call('auth.php?a=password', { body: d }),

  sync: (d) => call('sync.php', { body: d, timeout: 30000 }),
  ping: () => call('ping.php', { method: 'GET', timeout: 8000 }),

  shareCreate: (listId) => call('share.php?a=create', { body: { list_id: listId } }),
  shareJoin: (code) => call('share.php?a=join', { body: { code } }),
  shareMembers: (listId) => call('share.php?a=members', { body: { list_id: listId } }),
  shareRemove: (listId, userId) => call('share.php?a=remove', { body: { list_id: listId, user_id: userId } }),
  shareLeave: (listId) => call('share.php?a=leave', { body: { list_id: listId } }),

  suggest: (q) => call('suggest.php?q=' + encodeURIComponent(q || ''), { method: 'GET', timeout: 8000 }),
};
