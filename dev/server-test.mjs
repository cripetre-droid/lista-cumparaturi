/* Server de dezvoltare: serveste aplicatia din app/ si imita API-ul PHP,
   cu datele tinute in memorie. Serveste doar la testare pe calculator.

   Pornire:  node dev/server-test.mjs   ->  http://localhost:8787
*/

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AICI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(AICI, '..', 'app');
const PORT = Number(process.env.PORT || 8787);

const db = { users: [], tokens: new Map(), lists: new Map(), items: new Map(), members: [], history: new Map(), codes: new Map() };

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

    if (fisier === 'sync.php') {
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

      const ids = accesibile(me);
      const out = {
        now,
        full: since === 0,
        lists: [...db.lists.values()].filter((l) => ids.includes(l.id) && l.updated_at > since)
          .map((l) => ({ ...l, owner: l.owner_id === me ? 1 : 0, owner_id: undefined })),
        items: [...db.items.values()].filter((i) => ids.includes(i.list_id) && i.updated_at > since),
        shared: {},
      };
      for (const m of db.members) {
        if (ids.includes(m.list_id)) out.shared[m.list_id] = (out.shared[m.list_id] || 1) + 1;
      }
      if (since === 0) out.all_list_ids = ids;
      return json(res, out);
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

  /* ---------------- fisiere statice ---------------- */
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const fisier = path.join(APP, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!fisier.startsWith(APP)) { res.writeHead(403); return res.end('nu'); }

  fs.readFile(fisier, (err, data) => {
    if (err) { res.writeHead(404); return res.end('lipseste: ' + p); }
    res.writeHead(200, { 'Content-Type': TIPURI[path.extname(fisier)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Aplicatia de test: http://localhost:' + PORT);
});
