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
| **Alte** | sortare alfabetică, bifează tot, golire, „adaugă mai multe deodată", trimitere ca text pe WhatsApp |

---

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

În `/home/rvir1227/lista/api/` copiază `config.example.php` ca **`config.php`** și completează:

```php
'db_name' => 'rvir1227_lista',
'db_user' => 'rvir1227_lista',
'db_pass' => 'parola reală',

'allowed_origins' => [
    'https://lista.vireo.ro',
    'https://cripetre-droid.github.io',   // varianta de pe GitHub Pages
],

'allow_signup' => true,      // închide-l după ce vă faceți conturile
'install_key'  => 'ceva-numai-al-tau',
```

### 5. Crearea tabelelor

Deschide o singură dată în browser:

```
https://lista.vireo.ro/api/install.php?key=ceva-numai-al-tau
```

Trebuie să răspundă `{"ok":true,...}`. **Șterge apoi `install.php` de pe server.**

### 6. Gata

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
node dev/test-ui.mjs              # test automat: 15 scenarii, capturi în dev/capturi/
```

Serverul de test nu are nevoie de PHP sau MySQL — imită API-ul, ca să poți lucra la interfață.
Testul automat pornește singur serverul, pe portul lui.

---

## Cum funcționează sincronizarea

- Fiecare modificare se scrie **întâi local** (localStorage) și e marcată „de trimis”.
- La 1,5 secunde după ultima modificare (și la fiecare minut, și la revenirea în aplicație),
  clientul trimite ce are de trimis și cere ce s-a schimbat pe server de la ultima dată.
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
- `config.php` blocat din `.htaccess` și exclus din Git.

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
  js/app.js             logica ecranelor
  sw.js                 funcționarea offline
api/
  lib.php               configurare, CORS, baza de date, autentificare
  auth.php              cont: înregistrare, intrare, ieșire, schimbare parolă
  sync.php              sincronizarea listelor și a produselor
  share.php             partajare: cod, alăturare, membri
  suggest.php           sugestii din istoric
  install.php           creează tabelele (se șterge după instalare)
```
