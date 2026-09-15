/* Server de dezvoltare: serveste aplicatia din app/ si imita API-ul PHP,
   cu datele tinute in memorie. Serveste doar la testare pe calculator.

   Pornire:  node dev/server-test.mjs   ->  http://localhost:8787
*/

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { construiesteSite } from '../GooglePlay/pregateste-site.mjs';

const AICI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(AICI, '..', 'app');
const PORT = Number(process.env.PORT || 8787);

// cache-ul fisierelor JS/CSS, ca in app/.htaccess (fara regula no-cache: 7 zile, ca inainte)
const CACHE_JS = (() => {
  try {
    const h = fs.readFileSync(path.join(APP, '.htaccess'), 'utf8');
    return /FilesMatch "\\\.\(js\|css\)\$"[\s\S]*?Cache-Control "no-cache"/.test(h) ? 'no-cache' : 'public, max-age=604800';
  } catch (e) { return 'no-cache'; }
})();

// "publicarea" unei versiuni noi, pentru testul de actualizare
let versiuneTest = '';

const POLITICA = (() => {
  try {
    const h = fs.readFileSync(path.join(APP, '.htaccess'), 'utf8');
    const m = h.match(/Permissions-Policy\s+"([^"]+)"/);
    return m ? m[1] : '';
  } catch (e) { return ''; }
})();

const db = {
  users: [], tokens: new Map(), lists: new Map(), items: new Map(), members: [], history: new Map(), codes: new Map(),
  cards: new Map(), cardMembers: [], cardCodes: new Map(),
};

const TIPURI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const uid = () => crypto.randomBytes(16).toString('hex');
const acum = () => Date.now();

function json(res, data, code = 200) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function user(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return db.tokens.get(t) || null;
}

function cardAccesibile(uid_) {
  const ids = [];
  for (const c of db.cards.values()) if (c.owner_id === uid_) ids.push(c.id);
  for (const m of db.cardMembers) if (m.user_id === uid_ && !ids.includes(m.card_id)) ids.push(m.card_id);
  return ids;
}

function accesibile(uid_) {
  const ids = [];
  for (const l of db.lists.values()) if (l.owner_id === uid_) ids.push(l.id);
  for (const m of db.members) if (m.user_id === uid_ && !ids.includes(m.list_id)) ids.push(m.list_id);
  return ids;
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't').trim();
}

async function citesteCorp(req) {
  const bucati = [];
  for await (const b of req) bucati.push(b);
  if (!bucati.length) return {};
  try { return JSON.parse(Buffer.concat(bucati).toString('utf8')); } catch { return {}; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  /* ---------------- API ---------------- */
  if (url.pathname.startsWith('/api/')) {
    const body = await citesteCorp(req);
    const a = url.searchParams.get('a');
    const fisier = url.pathname.split('/').pop();

    if (fisier === 'auth.php' && a === 'register') {
      const email = String(body.email || '').toLowerCase();
      if (db.users.find((u) => u.email === email)) return json(res, { error: 'email_existent' }, 409);
      if (String(body.password || '').length < 8) return json(res, { error: 'parola_prea_scurta' }, 400);
      const u = { id: uid(), email, name: body.name || email.split('@')[0], pass: body.password };
      db.users.push(u);
      const t = uid() + uid();
      db.tokens.set(t, u.id);
      return json(res, { token: t, user: { id: u.id, email: u.email, name: u.name } });
    }

    if (fisier === 'auth.php' && a === 'login') {
      const u = db.users.find((x) => x.email === String(body.email || '').toLowerCase() && x.pass === body.password);
      if (!u) return json(res, { error: 'date_gresite' }, 401);
      const t = uid() + uid();
      db.tokens.set(t, u.id);
      return json(res, { token: t, user: { id: u.id, email: u.email, name: u.name } });
    }

    const me = user(req);
    if (!me) return json(res, { error: 'neautentificat' }, 401);

    if (fisier === 'auth.php' && a === 'me') {
      const u = db.users.find((x) => x.id === me);
      return json(res, { user: { id: u.id, email: u.email, name: u.name } });
    }
    if (fisier === 'auth.php' && a === 'logout') return json(res, { ok: true });
    if (fisier === 'auth.php' && a === 'password') return json(res, { ok: true });
    if (fisier === 'auth.php' && a === 'delete') {
      const u = db.users.find((x) => x.id === me);
      if (!u || u.pass !== body.password) return json(res, { error: 'parola_gresita' }, 401);
      // listele/cardurile partajate trec la primul membru, restul se sterg
      for (const l of [...db.lists.values()].filter((l) => l.owner_id === me)) {
        const m = db.members.find((x) => x.list_id === l.id && x.user_id !== me);
        if (m) { l.owner_id = m.user_id; l.updated_at = acum(); db.members = db.members.filter((x) => x !== m); }
        else { db.lists.delete(l.id); for (const [id, it] of db.items) if (it.list_id === l.id) db.items.delete(id); }
      }
      for (const c of [...db.cards.values()].filter((c) => c.owner_id === me)) {
        const m = db.cardMembers.find((x) => x.card_id === c.id && x.user_id !== me);
        if (m) { c.owner_id = m.user_id; c.updated_at = acum(); db.cardMembers = db.cardMembers.filter((x) => x !== m); }
        else db.cards.delete(c.id);
      }
      db.members = db.members.filter((x) => x.user_id !== me);
      db.cardMembers = db.cardMembers.filter((x) => x.user_id !== me);
      for (const [t, id] of db.tokens) if (id === me) db.tokens.delete(t);
      db.users = db.users.filter((x) => x.id !== me);
      return json(res, { ok: true });
    }

    if (fisier === 'sync.php') {
      db.sincronizari = (db.sincronizari || 0) + 1;
      const now = acum();
      const since = Number(body.since || 0);
      const acc = new Set(accesibile(me));

      for (const l of body.lists || []) {
        const cur = db.lists.get(l.id);
        if (!cur) {
          db.lists.set(l.id, { ...l, owner_id: me, updated_at: now });
          acc.add(l.id);
        } else if (acc.has(l.id)) {
          db.lists.set(l.id, { ...cur, ...l, owner_id: cur.owner_id, updated_at: now });
        }
      }
      for (const it of body.items || []) {
        if (!acc.has(it.list_id)) continue;
        const cur = db.items.get(it.id);
        db.items.set(it.id, { ...(cur || {}), ...it, updated_at: now });
        if (!cur && !it.deleted) {
          const k = me + '|' + norm(it.name);
          const h = db.history.get(k) || { name: it.name, unit: it.unit || '', uses: 0, user: me };
          h.uses++; h.last_used = now; h.name = it.name;
          db.history.set(k, h);
        }
      }

      const accC = new Set(cardAccesibile(me));
      for (const c of body.cards || []) {
        const cur = db.cards.get(c.id);
        if (!cur) {
          db.cards.set(c.id, { ...c, owner_id: me, updated_at: now });
          accC.add(c.id);
        } else if (accC.has(c.id)) {
          if (c.deleted && cur.owner_id !== me) {
            db.cardMembers = db.cardMembers.filter((m) => !(m.card_id === c.id && m.user_id === me));
            continue;
          }
          db.cards.set(c.id, { ...cur, ...c, owner_id: cur.owner_id, updated_at: now });
        }
      }

      const ids = accesibile(me);
      const cardIds = cardAccesibile(me);
      const out = {
        now,
        cards: [...db.cards.values()].filter((c) => cardIds.includes(c.id) && c.updated_at > since)
          .map((c) => ({ ...c, owner: c.owner_id === me ? 1 : 0, owner_id: undefined })),
        card_shared: {},
        full: since === 0,
        lists: [...db.lists.values()].filter((l) => ids.includes(l.id) && l.updated_at > since)
          .map((l) => ({ ...l, owner: l.owner_id === me ? 1 : 0, owner_id: undefined })),
        items: [...db.items.values()].filter((i) => ids.includes(i.list_id) && i.updated_at > since),
        shared: {},
      };
      for (const m of db.members) {
        if (ids.includes(m.list_id)) out.shared[m.list_id] = (out.shared[m.list_id] || 1) + 1;
      }
      for (const m of db.cardMembers) {
        if (cardIds.includes(m.card_id)) out.card_shared[m.card_id] = (out.card_shared[m.card_id] || 1) + 1;
      }
      if (since === 0) { out.all_list_ids = ids; out.all_card_ids = cardIds; }
      return json(res, out);
    }

    if (fisier === 'share.php' && a === 'create' && body.card_id) {
      const cod = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
      db.cardCodes.set(cod, body.card_id);
      return json(res, { code: cod, expira: '14 zile' });
    }
    if (fisier === 'share.php' && a === 'join' && db.cardCodes.has(String(body.code || '').toUpperCase())) {
      const cardId = db.cardCodes.get(String(body.code || '').toUpperCase());
      if (!db.cardMembers.find((m) => m.card_id === cardId && m.user_id === me)) db.cardMembers.push({ card_id: cardId, user_id: me });
      const c = db.cards.get(cardId);
      c.updated_at = acum();
      return json(res, { ok: true, kind: 'card', card_id: cardId, name: c.name });
    }
    if (fisier === 'share.php' && a === 'leave' && body.card_id) {
      db.cardMembers = db.cardMembers.filter((m) => !(m.card_id === body.card_id && m.user_id === me));
      return json(res, { ok: true });
    }

    if (fisier === 'share.php' && a === 'create') {
      const cod = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
      db.codes.set(cod, body.list_id);
      return json(res, { code: cod, expira: '14 zile' });
    }
    if (fisier === 'share.php' && a === 'join') {
      const listId = db.codes.get(String(body.code || '').toUpperCase());
      if (!listId) return json(res, { error: 'cod_invalid' }, 404);
      if (!db.members.find((m) => m.list_id === listId && m.user_id === me)) {
        db.members.push({ list_id: listId, user_id: me });
      }
      const l = db.lists.get(listId);
      l.updated_at = acum();
      return json(res, { ok: true, list_id: listId, name: l.name });
    }
    if (fisier === 'share.php' && a === 'members') {
      const l = db.lists.get(body.list_id);
      const membri = [];
      const owner = db.users.find((u) => u.id === (l && l.owner_id));
      if (owner) membri.push({ id: owner.id, name: owner.name, email: owner.email, owner: 1 });
      for (const m of db.members.filter((m) => m.list_id === body.list_id)) {
        const u = db.users.find((x) => x.id === m.user_id);
        if (u) membri.push({ id: u.id, name: u.name, email: u.email, owner: 0 });
      }
      return json(res, { members: membri });
    }
    if (fisier === 'share.php' && a === 'leave') {
      db.members = db.members.filter((m) => !(m.list_id === body.list_id && m.user_id === me));
      return json(res, { ok: true });
    }

    if (fisier === 'ping.php') {
      const ids = accesibile(me);
      let ultim = 0;
      for (const l of db.lists.values()) if (ids.includes(l.id) && l.updated_at > ultim) ultim = l.updated_at;
      for (const i of db.items.values()) if (ids.includes(i.list_id) && i.updated_at > ultim) ultim = i.updated_at;
      const cids = cardAccesibile(me);
      for (const c of db.cards.values()) if (cids.includes(c.id) && c.updated_at > ultim) ultim = c.updated_at;
      db.pinguri = (db.pinguri || 0) + 1;
      return json(res, { now: acum(), ultim });
    }

    if (fisier === 'suggest.php') {
      const q = norm(url.searchParams.get('q') || '');
      const items = [...db.history.values()]
        .filter((h) => h.user === me && (!q || norm(h.name).includes(q)))
        .sort((a, b) => b.uses - a.uses)
        .slice(0, 10)
        .map((h) => ({ name: h.name, unit: h.unit, uses: h.uses }));
      return json(res, { items });
    }

    return json(res, { error: 'actiune_necunoscuta' }, 404);
  }

  if (url.pathname === '/__versiune') {
    versiuneTest = url.searchParams.get('v') || '';
    return json(res, { versiune: versiuneTest });
  }

  if (url.pathname === '/__stat') {
    return json(res, { pinguri: db.pinguri || 0, sincronizari: db.sincronizari || 0 });
  }

  /* ------- paginile cerute de Google Play (in productie vin din GooglePlay/site-gata) ------- */
  {
    const rel = decodeURIComponent(url.pathname).replace(/^\//, '');
    const gp = construiesteSite({ test: true });
    if (gp[rel] !== undefined) {
      res.writeHead(200, {
        'Content-Type': rel.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      return res.end(gp[rel]);
    }
  }

  /* ---------------- fisiere statice ---------------- */
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const fisier = path.join(APP, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!fisier.startsWith(APP)) { res.writeHead(403); return res.end('nu'); }

  fs.readFile(fisier, (err, data) => {
    if (err) { res.writeHead(404); return res.end('lipseste: ' + p); }
    const ext = path.extname(fisier);
    const nume = path.basename(fisier);
    if (versiuneTest && nume === 'config.js') {
      data = Buffer.from(data.toString('utf8').replace(/APP_VERSION = '[^']*'/, "APP_VERSION = '" + versiuneTest + "'"));
    }
    if (versiuneTest && nume === 'sw.js') {
      data = Buffer.from(data.toString('utf8').replace(/lista-cumparaturi-v[\d.]+/, 'lista-cumparaturi-v' + versiuneTest));
    }
    const cacheControl = ['index.html', 'sw.js', 'manifest.webmanifest'].includes(nume) ? 'no-cache, must-revalidate'
      : (ext === '.js' || ext === '.css') ? CACHE_JS : 'no-cache';
    res.writeHead(200, {
      'Content-Type': TIPURI[path.extname(fisier)] || 'application/octet-stream',
      'Cache-Control': cacheControl,
      'Last-Modified': new Date(Date.now() - 3600000).toUTCString(),
      // acelasi antet ca pe server (din app/.htaccess), ca testele sa prinda o camera blocata
      ...(POLITICA ? { 'Permissions-Policy': POLITICA } : {}),
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Aplicatia de test: http://localhost:' + PORT);
});
