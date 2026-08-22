# Lista de cumpărături

Aplicație de telefon (PWA) pentru liste de cumpărături, cu **cont**, **liste partajate**,
**căutare** și **anulare (undo)**. Merge și fără internet — modificările se trimit singure
când revine semnalul.

- Aplicația (partea vizibilă): `app/` — HTML/CSS/JS simplu, fără pași de compilare.
- Serverul (API): `api/` — PHP 8 + MySQL, pentru găzduirea Romarg de pe `vireo.ro`.
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

## Instalare pe vireo.ro (Romarg, cPanel)

### 1. Baza de date

În cPanel → **MySQL Databases**:

1. creează o bază de date, ex. `lista`;
2. creează un utilizator cu o parolă puternică;
3. adaugă utilizatorul la bază cu **ALL PRIVILEGES**.

Notează numele complete (cPanel le prefixează cu contul, ex. `vireoro_lista`).

### 2. Fișierele

```
powershell -ExecutionPolicy Bypass -File fa-pachet.ps1
```

Rezultă `pachet\lista.zip`. În **File Manager**:

1. intră în `public_html`, creează folderul `lista`;
2. urcă `lista.zip` acolo și dă **Extract**;
3. șterge arhiva după extragere.

Structura pe server trebuie să arate așa:

```
public_html/lista/index.html
public_html/lista/css/…  js/…  icons/…
public_html/lista/api/*.php
```

### 3. Configurarea serverului

În `public_html/lista/api/` copiază `config.example.php` ca **`config.php`** și completează:

```php
'db_name' => 'vireoro_lista',
'db_user' => 'vireoro_lista',
'db_pass' => 'parola reală',

'allowed_origins' => [
    'https://vireo.ro',
    'https://www.vireo.ro',
    'https://NUMELE-TAU.github.io',   // adresa de pe GitHub Pages
],

'allow_signup' => true,      // închide-l după ce vă faceți conturile
'install_key'  => 'ceva-numai-al-tau',
```

### 4. Crearea tabelelor

Deschide o singură dată în browser:

```
https://vireo.ro/lista/api/install.php?key=ceva-numai-al-tau
```

Trebuie să răspundă `{"ok":true,...}`. **Șterge apoi `install.php` de pe server.**

### 5. Gata

`https://vireo.ro/lista/` → „Nu am cont” → îți faci contul.
Pe telefon: meniul browserului → **Adaugă la ecranul principal**.

---

## Publicarea pe GitHub Pages

Repository-ul conține `.github/workflows/pages.yml`, care publică automat folderul `app/`
la fiecare `push` pe `main`.

1. în GitHub: **Settings → Pages → Source: GitHub Actions**;
2. după primul push, aplicația e la `https://NUMELE-TAU.github.io/NUMELE-REPO/`;
3. adaugă acea adresă în `allowed_origins` din `api/config.php` de pe vireo.ro,
   altfel serverul respinge cererile (vezi mesajul „Serverul nu acceptă cereri de la această adresă”).

Varianta de pe GitHub Pages folosește **același** API de pe vireo.ro, deci ai aceleași
liste indiferent de unde intri.

---

## Dezvoltare pe calculator

```bash
node dev/server-test.mjs          # http://localhost:8787 (API imitat, date în memorie)
node dev/test-ui.mjs              # test automat: 14 scenarii, capturi în dev/capturi/
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
