/* Service worker: tine aplicatia disponibila si fara internet.
   Datele (listele) NU trec pe aici - ele stau in localStorage si se
   sincronizeaza separat. Aici se pastreaza doar fisierele aplicatiei. */

const CACHE = 'lista-cumparaturi-v1.4.0';

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
  './js/cards.js',
  './js/stores.js',
  './js/barcode.js',
  './js/scanner.js',
  './js/vendor/jsbarcode.min.js',
  './js/vendor/qrcode.js',
  './js/vendor/zxing.min.js',
  // siglele magazinelor, ca sa apara si fara internet
  './icons/magazine/altex.svg',
  './icons/magazine/annabella.png',
  './icons/magazine/auchan.svg',
  './icons/magazine/brico.svg',
  './icons/magazine/carrefour.svg',
  './icons/magazine/catena.png',
  './icons/magazine/ccc.svg',
  './icons/magazine/cora.svg',
  './icons/magazine/decathlon.svg',
  './icons/magazine/dedeman.svg',
  './icons/magazine/deichmann.png',
  './icons/magazine/dm.png',
  './icons/magazine/dona.webp',
  './icons/magazine/douglas.svg',
  './icons/magazine/drmax.svg',
  './icons/magazine/emag.svg',
  './icons/magazine/flanco.svg',
  './icons/magazine/helpnet.svg',
  './icons/magazine/hm.svg',
  './icons/magazine/hornbach.svg',
  './icons/magazine/ikea.svg',
  './icons/magazine/intersport.svg',
  './icons/magazine/jysk.svg',
  './icons/magazine/kaufland.svg',
  './icons/magazine/kik.svg',
  './icons/magazine/leroy.svg',
  './icons/magazine/lidl.svg',
  './icons/magazine/lukoil.svg',
  './icons/magazine/mega.svg',
  './icons/magazine/metro.svg',
  './icons/magazine/mobexpert.svg',
  './icons/magazine/mol.svg',
  './icons/magazine/noriel.png',
  './icons/magazine/omv.svg',
  './icons/magazine/penny.svg',
  './icons/magazine/pepco.svg',
  './icons/magazine/petrom.svg',
  './icons/magazine/profi.png',
  './icons/magazine/rompetrol.png',
  './icons/magazine/selgros.svg',
  './icons/magazine/sephora.svg',
  './icons/magazine/smyk.png',
  './icons/magazine/starbucks.svg',
  './icons/magazine/tei.png',
  './icons/magazine/yves.svg',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // fiecare fisier separat: unul lipsa nu trebuie sa strice instalarea.
    // cache: 'reload' = direct de pe server, NU din cache-ul HTTP al telefonului
    // (altfel o versiune noua se poate umple cu fisierele vechi)
    await Promise.all(FISIERE.map((f) => c.add(new Request(f, { cache: 'reload' }))
      .catch((err) => console.warn('lipsa din cache:', f, err))));
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
      fetch(req, { cache: 'no-cache' }).then((net) => { if (net.ok) cache.put(req, net.clone()); }).catch(() => {});
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
