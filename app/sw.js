/* Service worker: tine aplicatia disponibila si fara internet.
   Datele (listele) NU trec pe aici - ele stau in localStorage si se
   sincronizeaza separat. Aici se pastreaza doar fisierele aplicatiei. */

const CACHE = 'lista-cumparaturi-v1.2.0';

const FISIERE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/api.js',
  './js/config.js',
  './js/store.js',
  './js/sync.js',
  './js/ui.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // fiecare fisier separat: unul lipsa nu trebuie sa strice instalarea
    await Promise.all(FISIERE.map((f) => c.add(f).catch((err) => console.warn('lipsa din cache:', f, err))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chei = await caches.keys();
    await Promise.all(chei.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // apelurile catre API nu se pun niciodata in cache
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // pagina: incearca reteaua, cade pe cache (ca sa se vada actualizarile repede)
    if (req.mode === 'navigate') {
      try {
        const net = await fetch(req);
        cache.put('./index.html', net.clone());
        return net;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    }

    const hit = await cache.match(req, { ignoreSearch: false });
    if (hit) {
      // improspatam in fundal
      fetch(req).then((net) => { if (net.ok) cache.put(req, net.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const net = await fetch(req);
      if (net.ok) cache.put(req, net.clone());
      return net;
    } catch (err) {
      return Response.error();
    }
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
