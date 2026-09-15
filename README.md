# Lista de cumpărături

Aplicație de telefon (PWA) pentru liste de cumpărături, cu **cont**, **liste partajate**,
**căutare** și **anulare (undo)**. Merge și fără internet — modificările se trimit singure
când revine semnalul.

- Aplicația (partea vizibilă): `app/` — HTML/CSS/JS simplu, fără pași de compilare.
- Serverul (API): `api/` — PHP 8 + MySQL, pentru găzduirea Romarg (`lista.vireo.ro`).
- Unelte de dezvoltare: `dev/` — server local de test și test automat al interfeței.

---

## Ce știe să facă

| | |
|---|---|
| **Liste** | oricâte (Mega, Farmacie, Piață…), fiecare cu culoarea ei, reordonabile prin tragere |
| **Produse** | bifare cu tăierea textului, cantitate + unitate, notă, reordonare, mutare în altă listă |
| **Căutare** | în lista curentă și **global** (caută produsul în toate listele, îți spune în care e) |
| **Undo / Redo** | orice acțiune se poate anula: buton în bara de sus, „ANULEAZĂ” pe notificare, `Ctrl+Z` |
| **Cantități** | scrii „2 kg cartofi" și le desparte singur; sau alegi cantitatea din bara de jos |
| **Sugestii** | îți propune produsele folosite des, din istoricul tău |
| **Partajare** | cod de invitație de 7 caractere; ce bifează unul, vede celălalt |
| **Offline** | totul e salvat pe telefon; sincronizarea se face automat la revenirea semnalului |
| **Temă** | deschisă / întunecată / ca în telefon |
| **Carduri de fidelitate** | tab separat: scanezi codul de pe card cu camera (sau tastezi numărul), 47 de magazine românești cu sigla originală, cod de bare mare la casă, ecranul nu se stinge, merge fără internet |
| **Card ↔ listă** | cardul Mega apare ca buton direct în lista „Mega” (legătura se propune singură după nume) |
| **Alte** | sortare alfabetică, bifează tot, golire, „adaugă mai multe deodată", trimitere ca text pe WhatsApp |

---

## Google Play

Tot ce ține de publicarea în magazin (politica de confidențialitate, ștergerea contului, cheia de semnare,
`assetlinks.json`, configurarea pachetului Android) stă în [`GooglePlay/`](GooglePlay/README.md).

## Instalare pe lista.vireo.ro (Romarg, cPanel)

### 1. Subdomeniul

cPanel → **Domains → Create A New Domain**:

- domeniu: `lista.vireo.ro`
- **debifează** „Share document root", ca să poți alege folderul
- document root: `/home/rvir1227/lista`

Apoi cPanel → **SSL/TLS Status** → *Run AutoSSL* pe noul subdomeniu.
Certificatul e obligatoriu: fără HTTPS, telefonul nu instalează aplicația și nu merge offline.

### 2. Baza de date

cPanel → **MySQL Databases**:

1. creează baza, ex. `lista` (devine `rvir1227_lista`);
2. creează un utilizator cu o parolă puternică;
3. adaugă utilizatorul la bază cu **ALL PRIVILEGES**.

### 3. Fișierele

```
powershell -ExecutionPolicy Bypass -File fa-pachet.ps1
```

Rezultă `pachet\lista.zip`. În **File Manager**, intră în `/home/rvir1227/lista`,
urcă arhiva acolo, dă **Extract**, apoi șterge arhiva.

Structura pe server trebuie să arate așa:

```
/home/rvir1227/lista/index.html
/home/rvir1227/lista/css/…  js/…  icons/…
/home/rvir1227/lista/api/*.php
```

### 4. Configurarea serverului

Fișierul cu parole stă **deasupra folderului public**, ca să nu poată fi servit de Apache
în nicio situație. În File Manager urcă-te un etaj, în `/home/rvir1227/`, și creează acolo
fișierul **`lista-config.php`** (New File), cu conținutul din `api/config.example.php`:

```php
<?php
return [
    'db_host' => 'localhost',
    'db_name' => 'rvir1227_lista',
    'db_user' => 'rvir1227_lista',
    'db_pass' => 'parola reală',

    'allowed_origins' => [
        'https://lista.vireo.ro',
        'https://cripetre-droid.github.io',   // varianta de pe GitHub Pages
    ],

    'allow_signup' => true,      // închide-l după ce vă faceți conturile
    'signup_code'  => '',
    'install_key'  => 'ceva-numai-al-tau',
];
```

Aplicația caută configurarea în două locuri, în ordine:

1. `/home/rvir1227/lista-config.php` — **recomandat**, în afara folderului public;
2. `/home/rvir1227/lista/api/config.php` — merge și așa (e blocat din `api/.htaccess`),
   dar protecția depinde de PHP și de `.htaccess`.

`install.php` îți spune în răspuns pe care dintre ele l-a folosit.

### 5. Verificarea găzduirii

Deschide `https://lista.vireo.ro/api/verifica.php` — îți spune versiunea de PHP,
extensiile, unde a găsit configurarea și dacă se conectează la baza de date.

Aplicația are nevoie de **PHP 7.1 sau mai nou** (ideal 8.x). Dacă subdomeniul e pe o
versiune veche, apare `Parse error ... unexpected '?'`. Se schimbă din cPanel →
**MultiPHP Manager** → bifezi `lista.vireo.ro` → **PHP 8.2** → *Apply*.

### 6. Crearea tabelelor

Deschide o singură dată în browser:

```
https://lista.vireo.ro/api/install.php?key=ceva-numai-al-tau
```

Trebuie să răspundă `{"ok":true,...}`, iar la `configurarea` să apară calea fișierului
citit. **Șterge apoi de pe server `install.php` și `verifica.php`.**

### 7. Gata

`https://lista.vireo.ro/` → „Nu am cont” → îți faci contul.
Pe telefon: meniul browserului → **Adaugă la ecranul principal**.

Aplicația își găsește singură API-ul, în folderul `api/` de lângă ea — dacă muți mai târziu
fișierele în altă parte (alt subdomeniu, alt folder), nu trebuie schimbat nimic în cod.

---

## Publicarea pe GitHub Pages

Repository-ul conține `.github/workflows/pages.yml`, care publică automat folderul `app/`
la fiecare `push` pe `main`.

1. în GitHub: **Settings → Pages → Source: GitHub Actions**;
2. aplicația e la `https://cripetre-droid.github.io/lista-cumparaturi/`;
3. adresa aceea trebuie să fie în `allowed_origins` din `api/config.php` de pe server,
   altfel serverul respinge cererile (vezi mesajul „Serverul nu acceptă cereri de la această adresă”).

Varianta de pe GitHub Pages folosește **același** API (`https://lista.vireo.ro/api/`), deci ai
aceleași liste indiferent de unde intri.

---

## Dezvoltare pe calculator

```bash
node dev/server-test.mjs          # http://localhost:8787 (API imitat, date în memorie)
node dev/test-ui.mjs              # test automat: 26 de scenarii, capturi în dev/capturi/
```

Serverul de test nu are nevoie de PHP sau MySQL — imită API-ul, ca să poți lucra la interfață.
Testul automat pornește singur serverul, pe portul lui.

---

## Carduri de fidelitate

- **Adăugare:** `+` → alegi magazinul → se deschide camera și citește codul de bare (format + număr).
  Pe Chrome/Android se folosește detectorul nativ `BarcodeDetector`; pe Firefox și iPhone, librăria
  ZXing (inclusă local, se încarcă doar când deschizi camera). Există și „Introdu numărul manual”:
  formatul se ghicește din număr (13 cifre cu cifră de control validă → EAN-13, altfel Code 128).
- **Afișare:** codul se desenează local (JsBarcode pentru coduri liniare, qrcode-generator pentru QR),
  deci merge fără internet. Atingerea codului îl arată pe tot ecranul, rotit ca să fie cât mai lat.
  Cât timp e deschis un card, ecranul nu se stinge (Wake Lock). Luminozitatea nu o poate urca o
  aplicație web.
- **Folosite des:** se numără pe fiecare telefon în parte (nu se sincronizează).
- **Partajare:** la fel ca listele — cod de 7 caractere; „Intră cu un cod de invitație” din meniu
  recunoaște singur dacă e cod de listă sau de card. Dacă un membru „șterge” cardul, doar renunță la el.
- **Server:** tabelele `cards`, `card_members`, `card_codes` se creează **singure** la prima cerere,
  deci o instalare existentă nu cere niciun pas manual.
- **Testat:** `dev/test-ui.mjs` pornește browserul cu o cameră falsă (`dev/cod-video.mjs` generează un
  video cu un cod EAN-13), scanează, salvează, apoi decodează înapoi codul desenat — exact ce face
  scannerul de la casă.

Librării incluse în `app/js/vendor/` (toate MIT): JsBarcode 3.12, qrcode-generator 1.5, @zxing/library 0.21.

**Siglele magazinelor** (`app/icons/magazine/`, ~380 KB, puse și în cache-ul offline) sunt luate de pe
site-urile magazinelor și de pe Wikimedia Commons (proprietatea „logo” din Wikidata) și au fost verificate
vizual una câte una. Sunt mărci ale magazinelor respective, folosite doar ca să recunoști cardul, ca în
Klarna. Fără siglă (site-urile nu permit preluarea): La Cocoș și Cărturești — apar cu numele scris.
Pentru „Alt magazin” rămâne numele pe culoarea aleasă. Câmpul `alb: 1` din `stores.js` afișează sigla
în alb pe culoarea magazinului.

## Actualizarea serverului

```
powershell -ExecutionPolicy Bypass -File fa-pachet.ps1              # arhiva de actualizare
powershell -ExecutionPolicy Bypass -File fa-pachet.ps1 -Instalare   # doar la prima instalare
```

Arhiva de actualizare **nu** conține `install.php` și `verifica.php`, ca să nu reapară pe server
după ce le-ai șters. Se extrage peste folderul existent.

## Cum funcționează sincronizarea

- Fiecare modificare se scrie **întâi local** (localStorage) și e marcată „de trimis”.
- La 1,5 secunde după ultima modificare, clientul trimite ce are de trimis.
- Cât timp aplicația e folosită, întreabă serverul **la 3 secunde** dacă s-a schimbat ceva —
  dar printr-o cerere ieftină (`ping.php`, o singură interogare, ~13 ms măsurați pe Romarg),
  iar sincronizarea completă se face doar când răspunsul spune că există într-adevăr noutăți.
  Dacă aplicația stă neatinsă peste 2 minute, ritmul scade la 45 de secunde; în fundal se
  oprește de tot și reia instant la revenire.
- Dacă serverul dă erori (sau 429/403), ritmul se dublează la fiecare eșec, până la 5 minute,
  ca să nu fie împins și să nu ajungem blocați. La prima reușită revine la normal.
- Momentul modificării (`updated_at`) e pus de **server**, nu de telefon — așa nu contează
  dacă ceasul telefonului e dat greșit. La conflict câștigă ultima modificare ajunsă la server.
- Ștergerile rămân o vreme ca „urmă” (`deleted = 1`), ca să se propage și la celelalte telefoane;
  după 60 de zile serverul le șterge de tot.

## Securitate

- parolele: `password_hash` (bcrypt);
- sesiuni: token aleator de 32 de octeți, păstrat pe server doar ca hash SHA-256;
- toate interogările sunt pregătite (`prepared statements`);
- limitare la 10 încercări de autentificare eșuate / IP / 15 minute;
- CORS pe listă albă de origini;
- fișierul cu parole stă deasupra folderului public (`/home/rvir1227/lista-config.php`),
  iar varianta din `api/` e blocată din `.htaccess`; ambele sunt excluse din Git;
- aplicația merge și pe găzduiri fără `mbstring` (are înlocuitori proprii).

## Structura fișierelor

```
app/
  index.html            structura celor trei ecrane
  css/styles.css        tema albastră (deschisă + întunecată)
  js/config.js          adresa API-ului
  js/store.js           datele locale, undo/redo, căutare, istoric
  js/api.js             apelurile către server + mesajele de eroare în română
  js/sync.js            sincronizarea în ambele sensuri
  js/ui.js              panouri, dialoguri, notificări, reordonare prin tragere
  js/cards.js           cardurile de fidelitate: grilă, card deschis, adăugare, partajare
  js/stores.js          magazinele predefinite (culori, nume)
  js/barcode.js         formate, verificare și desenarea codurilor de bare
  js/scanner.js         camera + BarcodeDetector / ZXing
  js/vendor/            JsBarcode, qrcode-generator, ZXing
  js/app.js             logica ecranelor
  sw.js                 funcționarea offline
api/
  lib.php               configurare, CORS, baza de date, autentificare
  auth.php              cont: înregistrare, intrare, ieșire, schimbare parolă
  sync.php              sincronizarea listelor și a produselor
  share.php             partajare: cod, alăturare, membri
  ping.php              intrebarea ieftina "s-a schimbat ceva?" (o singura interogare)
  suggest.php           sugestii din istoric
  install.php           creează tabelele (se șterge după instalare)
  verifica.php          diagnostic găzduire; merge și pe PHP vechi (se șterge după instalare)
```
