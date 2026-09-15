# Lista de cumpărături pe Google Play

Tot ce ține de publicarea pe Google Play stă în acest folder.

| Fișier / folder | Ce este | Pe GitHub? |
|---|---|---|
| `aplicatie.json` | numele pachetului (`ro.vireo.lista`), domeniul și amprentele cheilor | da |
| `date-publice.exemplu.json` | model pentru numele și e-mailul care apar public | da |
| `date-publice.json` | **completat de tine**: numele operatorului și e-mailul de contact | **nu** |
| `site/` | sursele paginilor cerute de Google (politica de confidențialitate, ștergerea contului) | da |
| `pregateste-site.mjs` | completează paginile și generează `.well-known/assetlinks.json` în `site-gata/` | da |
| `twa-manifest.json` | configurarea preliminară a pachetului Android (etapa 5) | da |
| `semnare/` | **cheia de încărcare** + parola ei | **NICIODATĂ** |
| `unelte/` | Java 17 descărcat pentru `keytool` / Bubblewrap | nu |

`fa-pachet.ps1` (din rădăcina proiectului) rulează automat `pregateste-site.mjs` și pune paginile în
arhiva pentru server. Dacă `date-publice.json` lipsește sau e incomplet, paginile **nu** intră în arhivă
și scriptul avertizează.

---

## Stadiul etapelor

### ✅ Etapa 2 — Ștergerea contului
- **În aplicație:** meniul ⋮ → *Șterge contul*, cu confirmare prin parolă (`api/auth.php?a=delete`).
- **Pe web, fără aplicație:** `https://lista.vireo.ro/sterge-cont.html` (cerința Google pentru formularul
  „Siguranța datelor”).
- Ce se șterge: contul, sesiunile, listele și cardurile proprii, apartenența la liste/carduri partajate,
  istoricul de sugestii, codurile de invitație create, încercările de autentificare.
- Listele și cardurile **partajate** trec la membrul care s-a alăturat primul, ca să nu dispară de la ceilalți.
- Testat (scenariile 30–31), în Edge și în Firefox.

### ✅ Etapa 3 — Politica de confidențialitate
- `https://lista.vireo.ro/confidentialitate.html`, legată din meniul aplicației și de pe ecranul de autentificare.
- Scrisă după ce face efectiv codul: ce date, de ce, cât timp (inclusiv IP-urile de la încercările
  eșuate, care acum se curăță automat și din `sync.php`), camera procesată doar local, fără reclame/urmărire.
- **Lipsesc doar numele și e-mailul** → se completează în `date-publice.json`.

### 🟡 Etapa 4 — Legătura aplicație ↔ site (`assetlinks.json`)
- Generat automat din `aplicatie.json` și servit la `https://lista.vireo.ro/.well-known/assetlinks.json`.
- Conține deja amprenta **cheii de încărcare** (creată pe 15.09.2026, în `semnare/`).
- **De adăugat după crearea aplicației în Play Console:** amprenta **cheii Google Play**
  (Play Console → aplicația → *Test și lansare* → *Integritatea aplicației* → *Semnarea aplicației* →
  „Certificatul cheii de semnare a aplicației”, SHA-256). Se pune în `aplicatie.json` la
  `cheiaGooglePlay`, se refac arhiva și urcarea. Fără ea, aplicația instalată din magazin apare cu bara
  browserului deasupra.

### ⬜ Etapa 5 — Pachetul Android (`.aab`)
### ⬜ Etapa 6 — Pagina din magazin
### ⬜ Etapa 7 — Testul închis (12 persoane, 14 zile — cont personal)
### ⬜ Etapa 8 — Trimiterea spre verificare

---

## Chrome și Firefox

- **Aplicația web** (instalată din browser pe ecranul principal) merge în **ambele**. Suita de teste
  rulează în Edge (Chromium) și în Firefox: `node dev/test-ui.mjs` și `BROWSER=firefox node dev/test-ui.mjs`.
- **Aplicația de pe Google Play** este un *Trusted Web Activity*. Acest mecanism îl oferă browserele bazate
  pe Chromium (Chrome, Edge, Samsung Internet); **Firefox nu îl oferă**. Pe un telefon:
  - cu Chrome/Edge/Samsung Internet instalat → aplicația rulează prin acela, pe tot ecranul;
  - fără niciunul → rulează în componenta web integrată în Android (`fallbackType: "webview"` în
    `twa-manifest.json`).
  - Cine preferă Firefox poate folosi în continuare aplicația instalată din Firefox; contul și datele sunt
    aceleași, pe server.
- De verificat pe un telefon real la etapa 5: camera în varianta „webview”.

## Cheia de încărcare

- `semnare/upload-lista.jks`, alias `lista`, parola în `semnare/CITESTE-PAROLA-SI-COPIE-DE-SIGURANTA.txt`.
- Fă o copie a folderului `semnare/` în afara calculatorului. Cu Play App Signing (obligatoriu pentru
  aplicații noi), o cheie de încărcare pierdută se poate înlocui printr-o cerere la Google, dar durează.

## Contul de dezvoltator

Se poate începe pe **persoană fizică** și trece ulterior pe **firmă** din Play Console
(Cont de dezvoltator → Despre tine → Schimbă tipul contului, cu număr D-U-N-S). Aplicația, recenziile și
istoricul rămân în același cont.
